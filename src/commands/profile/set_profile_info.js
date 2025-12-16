// src/commands/profile/set_profile_info.js
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set_profile_info')
    .setDescription('Bearbeitet allgemeine Profilinformationen (nur Profile Manager)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const invoker = interaction.member;

    // Prüfen Rolle
    const managerRoleName = (config.PROFILE_MANAGER_ROLE_NAME || 'Profile Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerRoleName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Profile Manager" existiert nicht auf diesem Server.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });

    // Bestehendes Profil holen
    const existing = ProfileSystem.getProfile(targetUser.id) || {};
    const modalId = `profile_info:${targetUser.id}:${Date.now()}`;
    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Profil – Allgemein');

    const mk = (id, label, value = '') => {
      const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(false);
      if (value !== undefined && value !== null) t.setValue(String(value));
      return new ActionRowBuilder().addComponents(t);
    };

    modal.addComponents(
      mk('name', 'Name', targetMember.displayName || targetMember.user.username),
      mk('nickname', 'IC Name', existing.nickname),
      mk('steamhex', 'SteamHex', existing.steamhex),
      mk('bio', 'Bio', existing.bio),
      mk('gender', 'Gender', existing.gender)
    );

    // Handler registrieren
    // client.interactionSystem.registerModal(modalId, async (modalInteraction) => {
    //   try {
    //     const profileUpdate = {
    //       name: modalInteraction.fields.getTextInputValue('name') || targetMember.displayName,
    //       nickname: modalInteraction.fields.getTextInputValue('nickname') || null,
    //       steamhex: modalInteraction.fields.getTextInputValue('steamhex') || null,
    //       bio: modalInteraction.fields.getTextInputValue('bio') || null,
    //       gender: modalInteraction.fields.getTextInputValue('gender') || null,
    //       roles: Array.from(targetMember.roles.cache.values()).filter(r => !r.managed && r.id !== guild.id).map(r => r.name)
    //     };

    //     const before = ProfileSystem.getProfile(targetUser.id);
    //     ProfileSystem.updateProfile(targetUser.id, profileUpdate);

    //     // Log embed
    //     const logEmbed = new EmbedBuilder()
    //       .setTitle('📝 Profil-Info aktualisiert')
    //       .setDescription(`Profil von ${targetUser.tag} wurde bearbeitet von ${modalInteraction.user.tag}`)
    //       .setTimestamp(new Date())
    //       .setColor('Blue');

    //     if (config.PROFILE_LOG_CHANNEL_ID) {
    //       const logChannel = await modalInteraction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
    //       if (logChannel?.isTextBased()) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    //     }

    //     await modalInteraction.reply({ content: '✅ Profil-Info erfolgreich gespeichert.', ephemeral: true });
    //   } catch (err) {
    //     console.error('Profile Info Modal Error', err);
    //     try { await modalInteraction.reply({ content: '❌ Fehler beim Speichern.', ephemeral: true }); } catch {}
    //   }
    // });

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('Show Profile Info Modal failed', err);
      try { await interaction.reply({ content: '❌ Formular konnte nicht geöffnet werden.', ephemeral: true }); } catch {}
    }
  }
};
