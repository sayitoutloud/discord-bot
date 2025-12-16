import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
  customIdPrefix: 'ticket_bug',
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_bug')
      .setTitle('Bug Ticket');

    const input = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Beschreibe den Bug')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};
