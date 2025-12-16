import { TicketSystem } from '../../systems/TicketSystem.js';

export default {
  customIdPrefix: 'close_ticket',
  async execute(interaction) {
    await TicketSystem.closeTicket(interaction);
  }
};
