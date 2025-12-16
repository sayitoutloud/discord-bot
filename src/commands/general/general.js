import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help_admin')
    .setDescription('To see the admin commands list!'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle(`🤖 Server bot - commands list`)
      //.setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setColor(0x55AAFF)
      .setTimestamp();

      embed.addFields({ name: '', value: ''});

      embed.addFields({ name: '👤 Profile Commands', value: 
        '```\n'
        + '🧑 /set_profile_info <member>      ✔ Profile Manager\n'
        + '🧒 /show_user_profile <member>     ✔ Profile Manager\n'
        + '🎯 /set_points <member>            ✔ Profile Manager\n'
        + '```'
        , inline: false });

      embed.addFields({ name: '', value: ''});

      embed.addFields({ name: '🔰 Level Commands', value: 
        '```\n'
        + '🏆 /add_xp <member> <count>        ✔ Level Manager\n'
        + '🏆 /remove_xp <member> <count>     ✔ Level Manager\n'
        + '🏆 /show_user_xp <member>          ✔ Level Manager\n'
        + '```'
        , inline: false });



        embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '❗ Warn Commands', value: 
        '```\n'
        + '📃 /set_warn <role> <warn name>    ✔ Warn Manager\n'
        + '📃 /rest_warn_list                 ✔ Warn Manager\n'
        + '😈 /warn <member> <warn name>      ✔ Warn Manager\n'
        + '😇 /reset_warn <member>            ✔ Warn Manager\n'
        + '```'
        , inline: false });



        embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '⚜ Role Commands', value: 
        '```\n'
        + '🟢 /add_role <member> <role>       ✔ Role Manager\n'
        + '🔴 /remove_role <member> <role>    ✔ Role Manager\n'
        + '```'
        , inline: false });



        embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '🎫 Ticket Commands', value: 
        '```\n'
        + '🎫 /ticketmenu                     ✔ Ticket Support\n'
        + '```'
        , inline: false });



        embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '🕞 Timeout Commands', value: 
        '```\n'
        + '🚫 /timeout <member> <hours>       ✔ Timeout Manager\n'
        + '📑 /timeouts                       ✔ Timeout Manager\n'
        + '⭕ /remove_timeout <member>        ✔ Timeout Manager\n'
        + '```'
        , inline: false });



        embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '🔶 Grade Commands', value: 
        '```\n'
        + '💠 /show_grades                    ✔ Grade Manager\n'
        + '➕ /add_grade <role> <shortcut>    ✔ Grade Manager\n'
        + '➖ /remove_grade <number>          ✔ Grade Manager\n'
        + '💢 /remove_all_grade               ✔ Grade Manager\n'
        + '💚 /rankup <member>                ✔ Grade Manager\n'
        + '🖤 /rankdown <member>              ✔ Grade Manager\n'
        + '```'
        , inline: false });



      embed.addFields({ name: '', value: ''});


        embed.addFields({ name: '💻 Server Commands', value: 
        '```\n'
        + '💖 /join_voice <voice> <support>   ✔ Server Support\n'
        + '```'
        , inline: false });

        

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
