// src/commands/warn/reset_warn.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { WarnSystem } from '../../systems/WarnSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset_warn')
    .setDescription('Entfernt alle Warns eines Members und die zugehörigen Rollen (Warn Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.WARN_MANAGER_ROLE_NAME || 'Warn Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);

    if (!managerRole)
      return interaction.reply({ content: '⚠️ Rolle "Warn Manager" nicht gefunden.', ephemeral: true });

    if (!invoker.roles.cache.has(managerRole.id))
      return interaction.reply({ content: '❌ Du hast keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);

    try {
      const res = await WarnSystem.resetWarns(guild, targetUser.id);

      if (!res.ok)
        return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('♻️ Warns zurückgesetzt')
        .setColor('Grey')
        .setDescription(`Warns von ${targetUser.tag} wurden entfernt.`)
        .addFields({ name: 'Entfernte Warns', value: res.removed.length ? res.removed.join(', ') : 'Keine' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // log
      let logChannel = null;
      if (config.WARN_LOG_CHANNEL_ID)
        logChannel = await interaction.client.channels.fetch(config.WARN_LOG_CHANNEL_ID).catch(() => null);

      if (!logChannel)
        logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('warn-logs'));

      if (logChannel && logChannel.isTextBased())
        await logChannel.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
      console.error('reset_warn error', err);
      await interaction.reply({ content: '❌ Unbekannter Fehler beim Zurücksetzen von Warns.', ephemeral: true });
    }
  }
};
