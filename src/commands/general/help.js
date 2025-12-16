import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('To see the commands list!'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle(`🤖 Server bot - commands list`)
      //.setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setColor(0x55AAFF)
      .setTimestamp();

      embed.addFields({ name: '', value: ''});

      embed.addFields({ name: '💻 General Commands', value: 
        '```\n'
        + '🧑 /show_profile                   ✔ everyone\n'
        + '🧒 /set_my_profile                 ✔ everyone\n'
        + '🏆 /show_xp                        ✔ everyone```\n'
        , inline: false });
                                               
                                               
      embed.addFields({ name: '', value: ''});

      embed.addFields({ name: '🔰 Management Commands', value: 
        '```\n'
        + '🔰 /help_admin                     ✔ Managers\n'
        + '```'
        , inline: false });

        

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
