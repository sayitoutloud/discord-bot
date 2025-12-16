// export default {
//   name: 'guildMemberAdd',
//   async execute(member) {
//     const channel = member.guild.systemChannel;
//     if (!channel) return;
//     await channel.send(`👋 Willkommen auf dem Server, ${member}!`);
//   },
// };

import config from '../config.js';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    // 🔹 Feste Channel-ID eintragen
    const channelId = config.LEFT_CHANNEL_ID;
    const channel = member.guild.channels.cache.get(channelId);

    if (!channel) {
      console.log(`Channel mit ID ${channelId} nicht gefunden`);
      return;
    }

    let joinedSince = Date.now() - member.joinedTimestamp;
    const totalSeconds = Math.floor(joinedSince / 1000);

    // Calculate days, hours, minutes
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const logEmbed = new EmbedBuilder()
    .setTitle('💔 Member left')
    .setThumbnail(member.displayAvatarURL({ dynamic: true }))
    .setDescription(`User ${member} left the server`)
    .addFields(
      {name: '#️⃣ Member count', value: `#${member.guild.memberCount}`, inline: true},
      {name: '👤 Username', value: `${member.user.username}`, inline: true},
      {name: '🔶 User ID', value: `${member.user.id}`, inline: true},
      {name: '🕗 Was joind Since', value: ` ${days} days ${hours} h ${minutes} min`, inline: true},
    )
    .setTimestamp(new Date())
    .setColor('Red');

    // 🔹 Optional: Bild anhängen
    //const welcomeImage = new AttachmentBuilder('https://cdn.discordapp.com/attachments/1427356566687977493/1427356606395318313/bg.png?ex=68ee90ed&is=68ed3f6d&hm=53f10ad3aa771f342937fb3f9b5b32a2b1f43ddc0f119cc0dc36878e902d3690&'); // Pfad zu deinem Bild

    await channel.send({ embeds: [logEmbed] }).catch(() => {});
  },
};
