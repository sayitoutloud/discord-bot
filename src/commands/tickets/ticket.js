import { SlashCommandBuilder } from 'discord.js';
import { TicketSystem } from '../../systems/TicketSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Erstellt ein Support-Ticket'),

  async execute(interaction) {
    console.log("Es war jetzt der Fall");
    return interaction.reply({ content: '🔰 You are not allowed to do this.', ephemeral: true });
    //await TicketSystem.createTicket(interaction);
  },
};
