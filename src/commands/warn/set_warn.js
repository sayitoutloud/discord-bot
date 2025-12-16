// src/commands/warn/set_warn.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { WarnSystem } from '../../systems/WarnSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set_warn')
    .setDescription('Definiert eine Warn (Name + Role) (Warn Manager only)')
    .addRoleOption(opt => opt.setName('role').setDescription('Role, die vergeben werden soll').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Name der Warn (z.B. spam)').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = (config.WARN_MANAGER_ROLE_NAME || 'Warn Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Warn Manager" nicht gefunden.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Du hast keine Berechtigung.', ephemeral: true });

    const role = interaction.options.getRole('role', true);
    const name = interaction.options.getString('name', true).trim();
    if (!name) return interaction.reply({ content: 'Name darf nicht leer sein.', ephemeral: true });

    try {
      const warnRoles = WarnSystem.setWarnRole(guild.id, name, role.id);

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Warn gesetzt')
        .setColor('Green')
        .addFields(
          { name: 'Name', value: name, inline: true },
          { name: 'Role', value: `${role.name} (${role.id})`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });

      // log
      let logChannel = null;
      if (config.WARN_LOG_CHANNEL_ID) logChannel = await interaction.client.channels.fetch(config.WARN_LOG_CHANNEL_ID).catch(() => null);
      if (!logChannel) logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('warn-logs'));
      if (logChannel && logChannel.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('set_warn error', err);
      await interaction.reply({ content: `❌ Fehler: ${err.message || 'unknown'}`, ephemeral: true });
    }
  }
};
