// export default {
//   name: 'guildMemberAdd',
//   async execute(member) {
//     const channel = member.guild.systemChannel;
//     if (!channel) return;
//     await channel.send(`👋 Willkommen auf dem Server, ${member}!`);
//   },
// };

import config from '../config.js';
import { AttachmentBuilder } from 'discord.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // 🔹 Feste Channel-ID eintragen
    const channelId = config.WELCOME_CHANNEL_ID;
    const channel = member.guild.channels.cache.get(channelId);

    if (!channel) {
      console.log(`Channel mit ID ${channelId} nicht gefunden`);
      return;
    }

    // 🔹 Nachricht
    const welcomeMessage = `#${member.guild.memberCount} 👋 Welcome ${member} to ${member.guild.name}!`;

    // 🔹 Optional: Bild anhängen
    const welcomeImage = new AttachmentBuilder('https://media.discordapp.net/attachments/1427356566687977493/1427356606395318313/bg.png?ex=68f5d12d&is=68f47fad&hm=5eee1720c92a420929db870da1eaa8d89b73d007492f85778c8679bc2eeae826&=&format=webp&quality=lossless&width=1536&height=750'); // Pfad zu deinem Bild

    await channel.send({
      content: welcomeMessage,
      files: [welcomeImage],
    });
  },
};
