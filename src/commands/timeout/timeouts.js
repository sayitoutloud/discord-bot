// src/commands/timeout/timeouts.js
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeouts')
    .setDescription('Zeigt alle aktiven Timeouts (nur Timeout Manager).'),

  /**
   * execute(interaction)
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const invoker = interaction.member;

      // Rolle prüfen (konfigurierbar)
      const managerRoleName = (config.TIMEOUT_MANAGER_ROLE_NAME || 'Timeout Manager').toString();
      const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerRoleName.toLowerCase());
      if (!managerRole) {
        return interaction.reply({
          content: '⚠️ Rolle "Timeout Manager" wurde auf diesem Server nicht gefunden.',
          flags: MessageFlags.Ephemeral
        });
      }
      if (!invoker.roles.cache.has(managerRole.id)) {
        return interaction.reply({
          content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Datei laden
      const filePath = path.join(process.cwd(), 'data', 'timeouts.json');
      if (!fs.existsSync(filePath)) {
        return interaction.reply({
          content: 'ℹ️ Es existiert keine Timeout-Liste.',
          flags: MessageFlags.Ephemeral
        });
      }

      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) {
        return interaction.reply({
          content: 'ℹ️ Timeout-Datei ist leer.',
          flags: MessageFlags.Ephemeral
        });
      }

      const parsed = JSON.parse(raw);
      const guildData = parsed?.[guild.id];
      if (!guildData || !guildData.timeouts || Object.keys(guildData.timeouts).length === 0) {
        return interaction.reply({
          content: '✅ Es gibt aktuell keine aktiven Timeouts in diesem Server.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Sammle nur aktive Timeouts (nicht abgelaufene)
      const now = Date.now();
      const activeEntries = Object.entries(guildData.timeouts)
        .map(([userId, obj]) => ({ userId, ...obj }))
        .filter(e => e && e.expiresAt && Number(e.expiresAt) > now);

      if (activeEntries.length === 0) {
        return interaction.reply({
          content: '✅ Es sind aktuell keine aktiven Timeouts vorhanden (alle Einträge abgelaufen).',
          flags: MessageFlags.Ephemeral
        });
      }

      // Embed bauen (achte auf Feld-Limits)
      const embed = new EmbedBuilder()
        .setTitle('⏰ Aktive Timeouts')
        .setColor(0xff5555)
        .setTimestamp(new Date())
        .setFooter({ text: `Angefordert von ${interaction.user.tag}` });

      for (const entry of activeEntries) {
        const userId = entry.userId;
        const modId = entry.moderatorId;
        const expiresAt = Number(entry.expiresAt) || 0;
        const reason = entry.reason || 'Kein Grund angegeben';

        // Versuche, User und Moderator zu resolven (Falle: gelöschte Accounts)
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const mod = modId ? await interaction.client.users.fetch(modId).catch(() => null) : null;

        const remainingMs = Math.max(0, expiresAt - now);
        const remainingHours = (remainingMs / (1000 * 60 * 60)).toFixed(1);

        embed.addFields({
          name: user ? `${user.tag}` : `ID: ${userId}`,
          value:
            `👤 **User:** ${user ? `<@${userId}>` : `\`${userId}\``}\n` +
            `🛡️ **Moderator:** ${mod ? mod.tag : (modId ? `\`${modId}\`` : '—')}\n` +
            `⏱️ **Verbleibend:** **${remainingHours}h**\n` +
            `🕒 **Endet:** <t:${Math.floor(expiresAt / 1000)}:f>\n` +
            `📝 **Grund:** ${reason}`,
          inline: false
        });
      }

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('timeouts command error:', err);
      try {
        await interaction.reply({
          content: '❌ Fehler beim Laden der Timeout-Liste.',
          flags: MessageFlags.Ephemeral
        });
      } catch {}
    }
  }
};
