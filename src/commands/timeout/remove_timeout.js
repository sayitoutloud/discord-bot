// src/commands/timeout/remove_timeout.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { TimeoutSystem } from '../../systems/TimeoutSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove_timeout')
    .setDescription('Entfernt Timeout von einem Member (Timeout Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.TIMEOUT_MANAGER_ROLE_NAME || 'Timeout Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Timeout Manager" nicht gefunden.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Du hast keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);

    try {
      const res = await TimeoutSystem.removeTimeout(guild, targetUser.id, interaction.user.id);
      if (!res.ok) return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('✅ Timeout entfernt')
        .setColor('Green')
        .setDescription(`Timeout für ${targetUser.tag} wurde entfernt.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // log
      let logChannel = null;
      if (config.TIMEOUT_LOG_CHANNEL_ID) logChannel = await interaction.client.channels.fetch(config.TIMEOUT_LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('timeout-logs'));
      if (logChannel && logChannel.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
      console.error('remove_timeout command error', err);
      return interaction.reply({ content: '❌ Unbekannter Fehler.', ephemeral: true });
    }
  }
};
