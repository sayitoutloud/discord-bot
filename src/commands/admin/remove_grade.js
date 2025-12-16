import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GradeSystem } from '../../systems/GradeSystem.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove_grade')
    .setDescription('Entfernt eine Grade anhand Nummer')
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('Nummer der Grade')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.name === 'Grade Manager')) {
      return interaction.reply({ content: 'Du hast keine Berechtigung!', ephemeral: true });
    }

    const number = interaction.options.getInteger('number');
    if (!number) return interaction.reply({ content: 'Nummer fehlt!', ephemeral: true });

    const grades = GradeSystem.listGrades();
    const gradeToRemove = grades.find(g => g.number === number);
    if (!gradeToRemove) return interaction.reply({ content: 'Grade nicht gefunden!', ephemeral: true });

    try {
      GradeSystem.removeGrade(number);
      await interaction.reply({ content: `✅ Grade #${number} wurde entfernt.`, ephemeral: true });

      // Log
      const logChannel = interaction.guild.channels.cache.get(config.GRADE_LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🔴 Grade entfernt')
          .setColor('Red')
          .addFields(
            { name: 'Grade', value: `${gradeToRemove.roleName} (#${gradeToRemove.number})` },
            { name: 'Shortcut', value: gradeToRemove.shortcut },
            { name: 'Invoker', value: interaction.user.tag }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] }).catch(() => {});
      }

    } catch (err) {
      interaction.reply({ content: `❌ Fehler: ${err.message}`, ephemeral: true });
    }
  }
};
