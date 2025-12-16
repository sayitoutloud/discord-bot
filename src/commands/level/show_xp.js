// src/commands/level/show_xp.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('show_xp')
    .setDescription('Zeigt dein Level und XP mit Fortschrittsbalken'),

  async execute(interaction) {
    const userId = interaction.user.id;
    try {
      const rec = LevelSystem.getUser(userId);
      const { bar, percentText } = LevelSystem.progressBar(rec.xp, 12);
      const embed = new EmbedBuilder()
        .setTitle('🎯 Dein Level')
        .addFields(
          { name: 'User', value: `${interaction.user.tag}`, inline: true },
          { name: 'Level', value: `${rec.lvl}`, inline: true },
          { name: 'XP', value: `${rec.xp}/100 (${percentText})`, inline: true },
          { name: 'Fortschritt', value: `\`${bar}\`` , inline: false },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error('show_xp error', err);
      return interaction.reply({ content: 'Fehler beim Abrufen deiner XP.', ephemeral: true });
    }
  },
};
