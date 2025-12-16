import { TicketSystem } from '../../systems/TicketSystem.js';

export default {
  customIdPrefix: 'delete_ticket',
  async execute(interaction) {
    await TicketSystem.deleteTicket(interaction);
  }
};
