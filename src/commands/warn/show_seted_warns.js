// src/commands/warn/show_seted_warns.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { WarnSystem } from '../../systems/WarnSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_seted_warns')
    .setDescription('Zeigt alle gesetzten Warn-Vorlagen (Warn Manager only)'),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;

    const managerName = (config.WARN_MANAGER_ROLE_NAME || 'Warn Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName);
    if (!managerRole) {
      return interaction.reply({ content: '⚠️ Rolle "Warn Manager" wurde auf diesem Server nicht gefunden.', ephemeral: true });
    }
    if (!invoker.roles.cache.has(managerRole.id)) {
      return interaction.reply({ content: '❌ Du hast keine Berechtigung für diesen Befehl (Warn Manager benötigt).', ephemeral: true });
    }

    try {
      const warnRoles = WarnSystem.getWarnRoles(guild.id) || [];

      if (!warnRoles.length) {
        return interaction.reply({ content: 'ℹ️ Es sind keine Warn-Vorlagen gesetzt.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Eingestellte Warn-Vorlagen')
        .setColor(0xFFA500)
        .setTimestamp();

      // Discord embed fields limit is high but keep fields compact:
      // We'll build fields where name is Warn-Name and value is role mention or role-id + "missing".
      const fields = warnRoles.map((w, idx) => {
        const role = guild.roles.cache.get(w.roleId);
        const roleText = role ? `<@&${role.id}> (${role.name})` : `Rolle nicht gefunden (ID: ${w.roleId})`;
        return {
          name: `#${idx + 1} — ${w.name}`,
          value: roleText,
          inline: false
        };
      });

      // Add fields in batches if too many (discord limits per embed ~25 fields) - but usually small
      embed.addFields(fields);

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('show_seted_warns error', err);
      return interaction.reply({ content: '❌ Fehler beim Abrufen der Warn-Liste.', ephemeral: true });
    }
  },
};
