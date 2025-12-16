// src/systems/TicketSystem.js
import fs from 'fs';
import path from 'path';
import {
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import config from '../config.js';

export class TicketSystem {
  // ============================================================
  // INTERNAL SAFE REPLY/UPDATE HELPERS (robust gegen Doppel-Antworten)
  // ============================================================
  static async safeReply(interaction, options = {}) {
    // modern: flags statt ephemeral
    const withFlags = { ...options };
    if (withFlags.ephemeral) {
      delete withFlags.ephemeral;
      withFlags.flags = withFlags.flags ?? (1 << 6);
    }
    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply(withFlags);
      }
      return await interaction.followUp(withFlags);
    } catch {
      // letzte Rettung
      try { return await interaction.followUp(withFlags); } catch {}
    }
  }

  static async safeUpdate(interaction, data) {
    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.update(data);
      }
      // Wenn update nicht mehr geht, wenigstens Followup
      return await interaction.followUp({ content: 'Aktualisiert.', flags: 1 << 6 });
    } catch {
      try { return await interaction.followUp({ content: 'Aktualisierung fehlgeschlagen.', flags: 1 << 6 }); } catch {}
    }
  }

  // ============================================================
  // TICKET COUNTER
  // ============================================================
  static _ensureCounterFile() {
    const fp = path.resolve(process.cwd(), config.TICKET_COUNTER_FILE);
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, JSON.stringify({ counter: 1 }), 'utf8');
    }
    return fp;
  }

  static _readCounter() {
    try {
      const fp = this._ensureCounterFile();
      const raw = fs.readFileSync(fp, 'utf8');
      const j = JSON.parse(raw || '{}');
      return typeof j.counter === 'number' ? j.counter : 1;
    } catch {
      return 1;
    }
  }

  static _writeCounter(n) {
    try {
      const fp = this._ensureCounterFile();
      fs.writeFileSync(fp, JSON.stringify({ counter: n }), 'utf8');
    } catch (err) {
      console.error('Error writing ticket counter:', err);
    }
  }

  static _getNextTicketId() {
    if (!config.TICKET_COUNTER_ENABLED) return null;
    const cur = this._readCounter();
    const next = cur;
    this._writeCounter(cur + 1);
    return next;
  }

  // ============================================================
  // HELPER
  // ============================================================
  static _sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
  }

  static async _fetchAllMessages(channel) {
    const messages = [];
    let lastId = null;
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const fetched = await channel.messages.fetch(options);
      if (fetched.size === 0) break;
      fetched.forEach(m => messages.push(m));
      lastId = fetched.last().id;
      if (fetched.size < 100) break;
    }
    return messages.reverse();
  }

  static async createTranscriptFile(channel) {
    const msgs = await this._fetchAllMessages(channel);
    const lines = msgs.map(m => {
      const time = new Date(m.createdTimestamp).toISOString();
      const author = `${m.author.tag} (${m.author.id})`;
      let content = m.content || '';
      if (m.attachments.size > 0) {
        const urls = m.attachments.map(a => a.url).join(', ');
        content += (content ? ' ' : '') + `[Attachments: ${urls}]`;
      }
      return `${time} | ${author}: ${content}`;
    });
    const transcriptText = lines.join('\n') || '(no messages)';
    const transcriptsDir = path.join(process.cwd(), 'transcripts');
    if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir, { recursive: true });
    const filename = `ticket-${channel.id}-${Date.now()}.txt`;
    const filepath = path.join(transcriptsDir, filename);
    fs.writeFileSync(filepath, transcriptText, 'utf8');
    return filepath;
  }

  // ============================================================
  // DUPLICATE CHECK PER CATEGORY
  // ============================================================
  static async _hasOpenTicketInCategory(guild, category, ownerId) {
    if (!config.PREVENT_DUPLICATE_PER_CATEGORY) return false;
    if (!category) return false;

    let member = null;
    try {
      member = await guild.members.fetch(ownerId);
    } catch {
      member = null;
    }

    const children = guild.channels.cache.filter(
      (c) => c.parentId === category.id && c.type === ChannelType.GuildText
    );

    for (const [, ch] of children) {
      const topic = ch.topic || '';
      const ownerMatch = topic.match(/ticketOwner:(\d+)/);
      const chOwner = ownerMatch?.[1];

      if (!chOwner || chOwner !== ownerId) continue;

      // 1) Explizite Overwrites prüfen
      const ow = ch.permissionOverwrites.cache.get(ownerId);
      if (ow) {
        const explicitAllowed = ow.allow?.has(PermissionFlagsBits.ViewChannel);
        const explicitDenied = ow.deny?.has(PermissionFlagsBits.ViewChannel);

        if (explicitAllowed && !explicitDenied) return ch;       // offen
        if (explicitDenied) continue;                            // geschlossen
      }

      // 2) Fallback auf effektive Berechtigungen
      const perms = member ? ch.permissionsFor(member) : ch.permissionsFor(ownerId);
      if (perms && perms.has(PermissionFlagsBits.ViewChannel)) return ch; // offen
    }

    return false;
  }

  // ============================================================
  // CREATE TICKET
  // ============================================================
  static async createTicket(interaction, type, description) {
    const guild = interaction.guild;
    const ticketSupportRole = guild.roles.cache.find(
      r => r.name.toLowerCase() === 'ticket support'
    );
    if (!ticketSupportRole) {
      return this.safeReply(interaction, { content: '⚠️ Rolle "Ticket Support" nicht gefunden!', flags: 1 << 6 });
    }

    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === `${type.toLowerCase()} tickets`
    );

    const ownerId = interaction.user.id;
    if (category) {
      const existing = await this._hasOpenTicketInCategory(guild, category, ownerId);
      if (existing) {
        return this.safeReply(interaction, {
          content: `Du hast bereits ein offenes Ticket in dieser Kategorie: ${existing}`,
          flags: 1 << 6,
        });
      }
    }

    if (!category) {
      category = await guild.channels.create({
        name: `${type} Tickets`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: ticketSupportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });
    }

    let ticketId = config.TICKET_COUNTER_ENABLED ? this._getNextTicketId() : null;
    const usernameSafe = this._sanitizeName(interaction.user.username || `user-${ownerId}`);
    const channelName = ticketId
      ? `${usernameSafe}-${ticketId}`
      : this._sanitizeName(`ticket-${interaction.user.username}`);

    const topicParts = [`ticketOwner:${ownerId}`];
    if (ticketId !== null) topicParts.push(`ticketId:${ticketId}`);

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: topicParts.join(';'),
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: ticketSupportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Neues ${type} Ticket`)
      .setDescription(`**Ersteller:** ${interaction.user.tag}\n**Grund:** ${description}`)
      .setColor('Blue')
      .setTimestamp()
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    // KEIN InteractionSystem mehr – direkt ButtonBuilder nutzen
    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ embeds: [embed], components: [row] });

    // Robust antworten (Modal-Submit: noch nicht geantwortet; falls doch, followUp)
    await this.safeReply(interaction, {
      content: `🎉 Dein Ticket wurde erstellt: ${ticketChannel}`,
      flags: 1 << 6,
    });
  }

  // ============================================================
  // CLOSE TICKET
  // ============================================================
  static async closeTicket(interaction) {
    const channel = interaction.channel;
    const guild = interaction.guild;
    const topic = channel.topic || '';
    const ownerMatch = topic.match(/ticketOwner:(\d+)/);
    if (!ownerMatch) {
      return this.safeReply(interaction, { content: 'Kein Besitzer gefunden.', flags: 1 << 6 });
    }
    const ownerId = ownerMatch[1];
    const logChannel = config.TICKET_LOG_CHANNEL_ID ? guild.channels.cache.get(config.TICKET_LOG_CHANNEL_ID) : null;

    const transcriptPath = await this.createTranscriptFile(channel);
    const file = new AttachmentBuilder(transcriptPath);
    if (logChannel) await logChannel.send({ content: `📜 Transcript von ${channel.name}`, files: [file] });

    await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket geschlossen')
      .setDescription('Das Ticket wurde geschlossen.')
      .setColor('Red');

    const reopenButton = new ButtonBuilder()
      .setCustomId('reopen_ticket')
      .setLabel('Open Ticket Again')
      .setStyle(ButtonStyle.Success);
    const deleteButton = new ButtonBuilder()
      .setCustomId('delete_ticket')
      .setLabel('Delete Ticket')
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(reopenButton, deleteButton);

    // Sicher updaten, mit Fallback
    await this.safeUpdate(interaction, { embeds: [embed], components: [row] });
  }

  // ============================================================
  // DELETE TICKET
  // ============================================================
  static async deleteTicket(interaction) {
    const channel = interaction.channel;
    await this.safeReply(interaction, { content: '🗑️ Ticket wird gelöscht...', flags: 1 << 6 });
    setTimeout(() => channel.delete().catch(() => {}), 2000);
  }

  // ============================================================
  // REOPEN TICKET
  // ============================================================
  static async reopenTicket(interaction) {
    const channel = interaction.channel;
    const topic = channel.topic || '';
    const ownerMatch = topic.match(/ticketOwner:(\d+)/);
    if (!ownerMatch) {
      return this.safeReply(interaction, { content: 'Kein Besitzer gefunden.', flags: 1 << 6 });
    }
    const ownerId = ownerMatch[1];

    await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true });
    const owner = await channel.guild.members.fetch(ownerId).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('🔓 Ticket wieder geöffnet')
      .setDescription(`${owner ? `${owner}` : 'Der Besitzer'} kann das Ticket wieder sehen.`)
      .setColor('Green');

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(closeButton);

    await this.safeUpdate(interaction, { embeds: [embed], components: [row] });

    if (owner) await channel.send(`${owner}, dein Ticket wurde wieder geöffnet.`);
  }
}
