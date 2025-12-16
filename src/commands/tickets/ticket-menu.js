// src/commands/tickets/ticket-menu.js
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticketmenu')
    .setDescription('Sendet das Ticket-Menü mit Buttons'),

  async execute(interaction) {
    try {
      // Optionaler Admin-Check
      // const allowedRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');
      // if (!interaction.member.roles.cache.has(allowedRole?.id)) {
      //   return interaction.reply({ content: '❌ Du darfst dieses Menü nicht senden.', flags: 1 << 6 });
      // }

      const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_general')
          .setLabel('🎫 Allgemeines Ticket')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('ticket_bug')
          .setLabel('🐞 Bug Ticket')
          .setStyle(ButtonStyle.Secondary)
      );

      // Defer (verhindert Timeouts)
      await interaction.deferReply({ flags: 0 }); // 1<<6 für ephemeral

      await interaction.editReply({
        content: '📨 Wähle eine Ticket-Art:',
        components: [buttonsRow],
      });
    } catch (err) {
      console.error('❌ Fehler bei /ticketmenu:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Fehler beim Senden des Ticket-Menüs.', flags: 1 << 6 });
        } else {
          await interaction.followUp({ content: '❌ Fehler beim Senden des Ticket-Menüs.', flags: 1 << 6 });
        }
      } catch {}
    }
  },
};
