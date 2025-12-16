// src/commands/support/join_voice.js
import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { SupportSystem } from '../../systems/SupportSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('join_voice')
    .setDescription('Bot joins a voice channel and enables support queue (Server Support only)')
    .addChannelOption(opt =>
      opt
        .setName('voice')
        .setDescription('Voice channel to join')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt
        .setName('text')
        .setDescription('Text channel for support messages')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    // Rolle prüfen
    const roleName = process.env.SUPPORT_ROLE_NAME || 'Server Support';
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      return interaction.reply({
        content: `⚠️ Rolle "${roleName}" nicht gefunden.`,
        ephemeral: true,
      });
    }
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: '❌ Du brauchst die Rolle "Server Support", um das zu tun.',
        ephemeral: true,
      });
    }

    const voice = interaction.options.getChannel('voice');
    const text = interaction.options.getChannel('text');

    if (SupportSystem.hasSession(guild.id)) {
      return interaction.reply({
        content: '❌ Es läuft bereits eine Support-Session auf diesem Server.',
        ephemeral: true,
      });
    }

    try {
      // Session erzeugen
      const session = SupportSystem.createSession(guild.id, voice.id, text.id, interaction.client);

      // Bot joint direkt Voice Channel
      session.connection = joinVoiceChannel({
        channelId: voice.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Verbindung prüfen
      if (session.connection) {
        console.log(`[SupportSystem] Bot joined voice channel ${voice.name} in guild ${guild.name}`);
      } else {
        console.warn(`[SupportSystem] Failed to join voice channel ${voice.name}`);
      }

      return interaction.reply({
        content: `✅ Support-System aktiviert.\nDer Bot ist jetzt im Voice-Channel **${voice.name}** und verwendet **${text.name}** für Anfragen.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error('join_voice error:', err);
      return interaction.reply({
        content: '❌ Fehler beim Starten des Support-Systems. Bitte überprüfe die Bot-Berechtigungen (Connect, Speak, Move Members, Deafen Members).',
        ephemeral: true,
      });
    }
  },
};
