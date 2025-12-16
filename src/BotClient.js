// import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
// import { CommandHandler } from './handlers/CommandHandler.js';
// import { EventHandler } from './handlers/EventHandler.js';

// export class BotClient extends Client {
//   constructor() {
//     super({
//       intents: [
//         GatewayIntentBits.Guilds,
//         GatewayIntentBits.GuildMembers,
//         GatewayIntentBits.GuildMessages,
//         GatewayIntentBits.MessageContent,
//       ],
//       partials: [Partials.Channel],
//     });

//     this.commands = new Collection();
//   }

//   async start() {
//     new CommandHandler(this).loadCommands();
//     new EventHandler(this).loadEvents();

//     await this.login(process.env.BOT_TOKEN);
//   }
// }

import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { EventHandler } from './handlers/EventHandler.js';
import { InteractionSystem } from './systems/InteractionSystem.js';

export class BotClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });

    this.commands = new Collection();
    this.interactionSystem = new InteractionSystem(this); // Neu
  }

  async start() {
    new CommandHandler(this).loadCommands();
    new EventHandler(this).loadEvents();

    await this.login(process.env.BOT_TOKEN);
  }
}

