// src/commands/warn/warn.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { WarnSystem } from '../../systems/WarnSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Vergibt eine Warn-Role an einen Member (Warn Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true))
    .addStringOption(opt => opt.setName('warn_name').setDescription('Warn-Name wie gesetzt via /set_warn').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.WARN_MANAGER_ROLE_NAME || 'Warn Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Warn Manager" nicht gefunden.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Du hast keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);
    const warnName = interaction.options.getString('warn_name', true).trim();

    try {
      const res = await WarnSystem.applyWarn(guild, targetUser.id, warnName);
      if (!res.ok) return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warn vergeben')
        .setColor('Orange')
        .addFields(
          { name: 'Member', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
          { name: 'Warn', value: `${res.warnName}`, inline: true },
          { name: 'Rolle', value: `<@&${res.roleId}>`, inline: true },
          { name: 'Durch', value: `${interaction.user.tag}`, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // log
      let logChannel = null;
      if (config.WARN_LOG_CHANNEL_ID) logChannel = await interaction.client.channels.fetch(config.WARN_LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('warn-logs'));
      if (logChannel && logChannel.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('warn command error', err);
      await interaction.reply({ content: '❌ Unbekannter Fehler beim Warnen.', ephemeral: true });
    }
  }
};
