// src/commands/level/show_user_xp.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_user_xp')
    .setDescription('Zeigt Level/XP eines anderen Users (Level Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = config.LEVEL_MANAGER_ROLE_NAME || 'Level Manager';
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName.toLowerCase());
    //const allowed = invoker.permissions.has(PermissionFlagsBits.ManageGuild) || (managerRole && invoker.roles.cache.has(managerRole.id));
    const allowed = managerRole && invoker.roles.cache.has(managerRole.id);
    if (!allowed) return interaction.reply({ content: '❌ Du hast keine Berechtigung (Level Manager benötigt).', ephemeral: true });

    const target = interaction.options.getUser('member', true);
    try {
      const rec = LevelSystem.getUser(target.id);
      const { bar, percentText } = LevelSystem.progressBar(rec.xp, 12);
      const embed = new EmbedBuilder()
        .setTitle(`📊 Levels von ${target.tag}`)
        .addFields(
          { name: 'User', value: `${target.tag} (${target.id})`, inline: false },
          { name: 'Level', value: `${rec.lvl}`, inline: true },
          { name: 'XP', value: `${rec.xp}/100 (${percentText})`, inline: true },
          { name: 'Fortschritt', value: `\`${bar}\``, inline: false },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('show_user_xp error', err);
      return interaction.reply({ content: 'Fehler beim Abrufen der Daten.', ephemeral: true });
    }
  },
};
