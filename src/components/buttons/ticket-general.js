// src/components/buttons/ticket-general.js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
export default {
  customIdPrefix: 'ticket_general',
  async execute(interaction) {
    const modal = new ModalBuilder().setCustomId('modal_general').setTitle('Allgemeines Ticket');
    const input = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Beschreibe dein Anliegen')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }
};
