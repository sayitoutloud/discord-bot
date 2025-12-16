import { TicketSystem } from '../../systems/TicketSystem.js';

export default {
  customIdPrefix: 'modal_general',
  async execute(interaction) {
    const description = interaction.fields.getTextInputValue('description');
    await TicketSystem.createTicket(interaction, 'Allgemein', description);
  }
};
