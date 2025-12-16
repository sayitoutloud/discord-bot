import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  EmbedBuilder
} from 'discord.js';

import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set_my_profile')
    .setDescription('Bearbeite dein eigenes Profil (Name, Nickname, SteamHex, Bio, Gender).'),

  async execute(interaction, client) {
    try {
      const guild = interaction.guild;
      const user = interaction.user;
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });
      }

      // Bestehendes Profil laden
      const existing = ProfileSystem.getProfile(user.id) || {};

      // Falls Leveldaten fehlen, aus LevelSystem übernehmen
      if ((existing.level === null || existing.level === undefined) || (existing.xp === null || existing.xp === undefined)) {
        try {
          const ls = LevelSystem.getUser(user.id);
          if (ls) {
            existing.level = existing.level ?? Number(ls.lvl ?? 0);
            existing.xp = existing.xp ?? Number(ls.xp ?? 0);
          }
        } catch {}
      }

      // Modal erstellen
      const customId = `my_profile_modal:${user.id}:${Date.now()}`;
      const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Eigenes Profil bearbeiten');

      const mk = (id, label, value = '', style = TextInputStyle.Short, required = false) => {
        const input = new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(required);
        if (value) input.setValue(String(value));
        return new ActionRowBuilder().addComponents(input);
      };

      modal.addComponents(
        mk('name', 'Name', existing.name ?? member.displayName ?? user.username, TextInputStyle.Short, true),
        mk('nickname', 'Nickname', existing.nickname ?? '', TextInputStyle.Short, false),
        mk('steamhex', 'Steam Hex', existing.steamhex ?? '', TextInputStyle.Short, false),
        mk('bio', 'Biografie', existing.bio ?? '', TextInputStyle.Paragraph, false),
        mk('gender', 'Geschlecht', existing.gender ?? '', TextInputStyle.Short, false),
      );

      // Modal-Handler registrieren
      // client.interactionSystem.registerModal(customId, async (modalInteraction) => {
      //   try {
      //     const name = modalInteraction.fields.getTextInputValue('name') || member.displayName;
      //     const nickname = modalInteraction.fields.getTextInputValue('nickname') || null;
      //     const steamhex = modalInteraction.fields.getTextInputValue('steamhex') || null;
      //     const bio = modalInteraction.fields.getTextInputValue('bio') || null;
      //     const gender = modalInteraction.fields.getTextInputValue('gender') || null;

      //     // Rollen automatisch vom Member übernehmen (nicht vom User editierbar)
      //     const rolesArr = Array.from(member.roles.cache.values())
      //       .filter(r => !r.managed && r.id !== guild.id)
      //       .map(r => r.name);

      //     const before = ProfileSystem.getProfile(user.id);
      //     const updated = ProfileSystem.updateProfile(user.id, {
      //       name,
      //       nickname,
      //       steamhex,
      //       bio,
      //       gender,
      //       roles: rolesArr,
      //     });

      //     // Erfolgs-Embed
      //     const embed = new EmbedBuilder()
      //       .setColor(0x00AE86)
      //       .setTitle('✅ Profil aktualisiert')
      //       .setDescription('Dein Profil wurde erfolgreich gespeichert.')
      //       .addFields(
      //         { name: 'Name', value: updated.name || '—', inline: true },
      //         { name: 'Nickname', value: updated.nickname || '—', inline: true },
      //         { name: 'Steam Hex', value: updated.steamhex || '—', inline: true },
      //         { name: 'Geschlecht', value: updated.gender || '—', inline: true },
      //         { name: 'Biografie', value: updated.bio || '—', inline: false },
      //         { name: 'Rollen', value: rolesArr.length ? rolesArr.join(', ') : '—', inline: false },
      //       )
      //       .setFooter({ text: `Aktualisiert von ${user.tag}` })
      //       .setTimestamp();

      //     await modalInteraction.reply({ embeds: [embed], ephemeral: true });

      //     // Logging (optional)
      //     try {
      //       const diffs = [];
      //       const keys = ['name','nickname','steamhex','bio','gender'];
      //       for (const k of keys) {
      //         const bv = before?.[k] ?? '(leer)';
      //         const av = updated?.[k] ?? '(leer)';
      //         if (String(bv) !== String(av)) diffs.push({ name: k, value: `\`${bv}\` → \`${av}\`` });
      //       }

      //       let logChannel = null;
      //       if (config.PROFILE_LOG_CHANNEL_ID) {
      //         logChannel = await modalInteraction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
      //       }
      //       if (!logChannel) {
      //         logChannel = modalInteraction.guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('profile-logs'));
      //       }

      //       if (logChannel && logChannel.isTextBased()) {
      //         const logEmbed = new EmbedBuilder()
      //           .setTitle('📝 Selbstprofil geändert')
      //           .setDescription(`Benutzer: ${user.tag} (${user.id})`)
      //           .addFields(diffs.length ? diffs : [{ name: 'Info', value: 'Keine Änderungen erkannt.' }])
      //           .setColor(0x3498DB)
      //           .setTimestamp();
      //         await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      //       }
      //     } catch (e) {
      //       console.warn('Profile log failed', e);
      //     }
      //   } catch (err) {
      //     console.error('set_my_profile modal handler error', err);
      //     try { await modalInteraction.reply({ content: '❌ Fehler beim Speichern des Profils.', ephemeral: true }); } catch {}
      //   }
      // });

      // Modal anzeigen
      await interaction.showModal(modal);
    } catch (err) {
      console.error('set_my_profile execute error', err);
      try { await interaction.reply({ content: '❌ Interner Fehler.', ephemeral: true }); } catch {}
    }
  },
};
