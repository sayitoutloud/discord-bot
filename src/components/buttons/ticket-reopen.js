import { TicketSystem } from '../../systems/TicketSystem.js';

export default {
  customIdPrefix: 'reopen_ticket',
  async execute(interaction) {
    await TicketSystem.reopenTicket(interaction);
  }
};
