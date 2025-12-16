// src/commands/profile/show_user_profile.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_user_profile')
    .setDescription('Zeigt das Profil eines Users (Profile Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.PROFILE_MANAGER_ROLE_NAME || 'Profile Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Profile Manager" existiert nicht auf diesem Server.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Du hast keine Berechtigung (Profile Manager benötigt).', ephemeral: true });

    const user = interaction.options.getUser('member', true);
    try {
      let profile = ProfileSystem.getProfile(user.id);

      if ((profile.level === null || profile.level === undefined) || (profile.xp === null || profile.xp === undefined)) {
        try {
          const ls = LevelSystem.getUser(user.id);
          if (ls) {
            profile.level = profile.level ?? ls.lvl;
            profile.xp = profile.xp ?? ls.xp;
          }
        } catch {}
      }

      if (!profile || (!profile.name && !profile.bio && (!profile.roles || profile.roles.length === 0) && profile.level === null)) {
        return interaction.reply({ content: 'ℹ️ Kein Profil für diesen Benutzer vorhanden.', ephemeral: true });
      }

      const { bar, percentText } = LevelSystem.progressBar(profile.xp ?? 0, 12);

      const embed = new EmbedBuilder()
        .setTitle(`👤 Profil — ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏷️ Name', value: `${profile.name || user.username}`, inline: true },
          { name: '📝 IC Name', value: `${profile.nickname || '—'}`, inline: true },
          { name: '🎮 Steam Hex', value: `${profile.steamhex || '—'}`, inline: true },
          { name: '⚧️ Gender', value: `${profile.gender || '—'}`, inline: true },
          { name: '⭐ Level', value: `${profile.level ?? 0}`, inline: true },
          { name: 'XP', value: `${profile.xp ?? 0}/100 (${percentText})`, inline: true },
          { name: 'Level Progress', value: `\`${bar}\``, inline: false },
        )
        .setColor(0x55AAFF)
        .setTimestamp();

      embed.addFields({ name: '💬 Bio', value: profile.bio ? `> ${profile.bio}` : '—', inline: false });

      embed.addFields({
        name: '💎 Points',
        value:
          `EM: ${profile.em_points ?? 0}\n` +
          `SP: ${profile.sp_points ?? 0}\n` +
          `AMP: ${profile.amp_points ?? 0}\n` +
          `RP: ${profile.rp_points ?? 0}`,
        inline: false,
      });

      let rolesText = '—';
      if (Array.isArray(profile.roles) && profile.roles.length > 0) {
        rolesText = profile.roles.map(r => {
          if (/^\d{16,19}$/.test(r)) return `<@&${r}>`;
          return `${r}`;
        }).join(', ');
      }
      embed.addFields({ name: '🎭 Roles', value: rolesText, inline: false });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('show_user_profile error', err);
      return interaction.reply({ content: '❌ Fehler beim Anzeigen des Profils.', ephemeral: true });
    }
  },
};
