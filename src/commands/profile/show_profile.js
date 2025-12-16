// src/commands/profile/show_profile.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_profile')
    .setDescription('Zeigt dein Profil'),

  async execute(interaction) {
    try {
      const uid = interaction.user.id;
      let profile = ProfileSystem.getProfile(uid);

      // if profile lacks level/xp try LevelSystem
      if ((profile.level === null || profile.level === undefined) || (profile.xp === null || profile.xp === undefined)) {
        try {
          const ls = LevelSystem.getUser(uid);
          if (ls) {
            profile.level = profile.level ?? ls.lvl;
            profile.xp = profile.xp ?? ls.xp;
          }
        } catch {}
      }

      if (!profile || (!profile.name && !profile.bio && (!profile.roles || profile.roles.length === 0) && profile.level === null)) {
        return interaction.reply({ content: 'ℹ️ Kein Profil gefunden. Ein Profil kann von einem Profile Manager gesetzt werden.', ephemeral: true });
      }

      const { bar, percentText } = LevelSystem.progressBar(profile.xp ?? 0, 12);

      const embed = new EmbedBuilder()
        .setTitle(`👤 Profil — ${interaction.user.tag}`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏷️ Name', value: `${profile.name || interaction.user.username}`, inline: true },
          { name: '📝 Nickname', value: `${profile.nickname || '—'}`, inline: true },
          { name: '🎮 Steam Hex', value: `${profile.steamhex || '—'}`, inline: true },
          { name: '⚧️ Gender', value: `${profile.gender || '—'}`, inline: true },
          { name: '⭐ Level', value: `${profile.level ?? 0}`, inline: true },
          { name: 'XP', value: `${profile.xp ?? 0}/100 (${percentText})`, inline: true },
          { name: 'Fortschritt', value: `\`${bar}\``, inline: false },
        )
        .setColor(0x55AAFF)
        .setTimestamp();

      // bio as separate block
      embed.addFields({ name: '💬 Bio', value: profile.bio ? `> ${profile.bio}` : '—', inline: false });

      // points
      embed.addFields({
        name: '💎 Punkte',
        value:
          `EM: ${profile.em_points ?? 0}\n` +
          `SP: ${profile.sp_points ?? 0}\n` +
          `AMP: ${profile.amp_points ?? 0}\n` +
          `RP: ${profile.rp_points ?? 0}`,
        inline: false,
      });

      // roles resolved: if role ids present, mention them
      let rolesText = '—';
      if (Array.isArray(profile.roles) && profile.roles.length > 0) {
        rolesText = profile.roles.map(r => {
          // if numeric-like -> mention id
          if (/^\d{16,19}$/.test(r)) return `<@&${r}>`;
          return `${r}`;
        }).join(', ');
      }
      embed.addFields({ name: '🎭 Rollen', value: rolesText, inline: false });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('show_profile error', err);
      return interaction.reply({ content: '❌ Fehler beim Anzeigen des Profils.', ephemeral: true });
    }
  },
};
