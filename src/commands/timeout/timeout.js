// src/commands/timeout/timeout.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { TimeoutSystem } from '../../systems/TimeoutSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Setzt einen Timeout für einen Member (in Stunden) — Timeout Manager only')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true))
    .addNumberOption(opt => opt.setName('hours').setDescription('Dauer in Stunden (z.B. 1.5)').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.TIMEOUT_MANAGER_ROLE_NAME || 'Timeout Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Timeout Manager" nicht gefunden.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Du hast keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);
    const hours = Number(interaction.options.getNumber('hours', true));
    if (!Number.isFinite(hours) || hours <= 0) return interaction.reply({ content: '❌ Ungültige Stunden-Anzahl.', ephemeral: true });

    try {
      const res = await TimeoutSystem.setTimeout(guild, targetUser.id, hours, interaction.user.id, `Set by ${interaction.user.tag}`);
      if (!res.ok) return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });

      const until = new Date(res.expiresAt);
      const embed = new EmbedBuilder()
        .setTitle('⏱️ Timeout gesetzt')
        .setColor('Orange')
        .addFields(
          { name: 'Member', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
          { name: 'Dauer (Stunden)', value: String(hours), inline: true },
          { name: 'Bis (UTC)', value: until.toISOString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // log
      let logChannel = null;
      if (config.TIMEOUT_LOG_CHANNEL_ID) logChannel = await interaction.client.channels.fetch(config.TIMEOUT_LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('timeout-logs'));
      if (logChannel && logChannel.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
      console.error('timeout command error', err);
      return interaction.reply({ content: '❌ Unbekannter Fehler.', ephemeral: true });
    }
  }
};
