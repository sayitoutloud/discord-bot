import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GradeSystem } from '../../systems/GradeSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_grades')
    .setDescription('Zeigt alle Grades als Liste'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.name === 'Grade Manager')) {
      return interaction.reply({ content: 'Du hast keine Berechtigung!', ephemeral: true });
    }

    const grades = GradeSystem.listGrades();
    if (grades.length === 0) {
      return interaction.reply({ content: 'Keine Grades vorhanden.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📜 Grades Übersicht')
      .setColor('Blue')
      .addFields(
        grades.map(g => ({
          name: `#${g.number} – ${g.roleName}`,
          value: `Shortcut: ${g.shortcut}`,
        }))
      );

    interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
