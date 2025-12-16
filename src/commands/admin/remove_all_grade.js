import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GradeSystem } from '../../systems/GradeSystem.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove_all_grade')
    .setDescription('Löscht alle Grades'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.name === 'Grade Manager')) {
      return interaction.reply({ content: 'Du hast keine Berechtigung!', ephemeral: true });
    }

    GradeSystem.removeAllGrades();
    await interaction.reply({ content: '✅ Alle Grades wurden gelöscht.', ephemeral: true });

    // Log
    const logChannel = interaction.guild.channels.cache.get(config.GRADE_LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🟠 Alle Grades gelöscht')
        .setColor('Orange')
        .addFields({ name: 'Invoker', value: interaction.user.tag })
        .setTimestamp();
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};
