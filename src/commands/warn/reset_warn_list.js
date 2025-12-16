// src/commands/warn/reset_warn_list.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { WarnSystem } from '../../systems/WarnSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset_warn_list')
    .setDescription('Leert die komplette Warn-Vorlagen-Liste für diesen Server (nur Warn Manager).'),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;

    const managerName = (config.WARN_MANAGER_ROLE_NAME || 'Warn Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);

    if (!managerRole)
      return interaction.reply({
        content: '⚠️ Rolle **"Warn Manager"** existiert nicht auf diesem Server.',
        ephemeral: true
      });

    if (!invoker.roles.cache.has(managerRole.id))
      return interaction.reply({
        content: '❌ Du hast keine Berechtigung für diesen Befehl (Warn Manager benötigt).',
        ephemeral: true
      });

    try {
      const res = await WarnSystem.resetWarnList(guild.id);

      if (!res.ok)
        return interaction.reply({
          content: `❌ Fehler: ${res.message}`,
          ephemeral: true
        });

      const embed = new EmbedBuilder()
        .setTitle('🧹 Warn-Liste geleert')
        .setColor('Red')
        .setDescription(`Alle Warn-Vorlagen (Warn Roles & Namen) wurden für **${guild.name}** gelöscht.`)
        .addFields({ name: 'Vorherige Anzahl', value: String(res.previousCount ?? 0) })
        .setTimestamp()
        .setFooter({ text: `Von ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // Log in Log-Channel
      let logChannel = null;
      if (config.WARN_LOG_CHANNEL_ID)
        logChannel = await interaction.client.channels.fetch(config.WARN_LOG_CHANNEL_ID).catch(() => null);

      if (!logChannel)
        logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('warn-logs'));

      if (logChannel && logChannel.isTextBased())
        await logChannel.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
      console.error('reset_warn_list error', err);
      await interaction.reply({
        content: '❌ Unerwarteter Fehler beim Leeren der Warn-Liste.',
        ephemeral: true
      });
    }
  }
};
