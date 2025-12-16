import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { GradeSystem } from '../../systems/GradeSystem.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add_grade')
    .setDescription('Fügt eine neue Grade hinzu')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role, die zur Grade gehört')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('shortcut')
        .setDescription('Shortcut für die Grade')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('Nummer der Grade (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.name.toLowerCase() === (config.GRADE_MANAGER_ROLE_NAME || '').toLowerCase())) {
      return interaction.reply({ content: 'Du hast keine Berechtigung!', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const shortcut = interaction.options.getString('shortcut')?.trim();
    const number = interaction.options.getInteger('number');

    if (!role) return interaction.reply({ content: 'Role nicht gefunden!', ephemeral: true });
    if (!shortcut) return interaction.reply({ content: 'Shortcut darf nicht leer sein!', ephemeral: true });

    try {
      const grade = GradeSystem.addGrade(role.id, role.name, shortcut, number);

      // Reply an den User
      await interaction.reply({ content: `✅ Grade hinzugefügt: **${grade.roleName}** (#${grade.number})`, ephemeral: true });

      // Log an Log-Channel
      const logChannel = interaction.guild.channels.cache.get(config.GRADE_LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🟢 Grade hinzugefügt')
          .setColor('Green')
          .addFields(
            { name: 'Grade', value: `${grade.roleName} (#${grade.number})` },
            { name: 'Shortcut', value: grade.shortcut },
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
