// src/commands/profile/set_points.js
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set_points')
    .setDescription('Bearbeitet Level und Punkte eines Profils (nur Profile Manager)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const invoker = interaction.member;

    const managerRoleName = (config.PROFILE_MANAGER_ROLE_NAME || 'Profile Manager').toLowerCase();
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerRoleName);
    if (!managerRole) return interaction.reply({ content: '⚠️ Rolle "Profile Manager" existiert nicht auf diesem Server.', ephemeral: true });
    if (!invoker.roles.cache.has(managerRole.id)) return interaction.reply({ content: '❌ Keine Berechtigung.', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });

    const existing = ProfileSystem.getProfile(targetUser.id) || {};
    const modalId = `profile_points:${targetUser.id}:${Date.now()}`;
    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Profil – Punkte & Level');

    const mk = (id, label, value = '') => {
      const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(false);
      if (value !== undefined && value !== null) t.setValue(String(value));
      return new ActionRowBuilder().addComponents(t);
    };

    modal.addComponents(
      mk('em_points', 'EM Points', existing.em_points ?? 0),
      mk('sp_points', 'SP Points', existing.sp_points ?? 0),
      mk('amp_points', 'AMP Points', existing.amp_points ?? 0),
      mk('rp_points', 'RP Points', existing.rp_points ?? 0)
    );

    // client.interactionSystem.registerModal(modalId, async (modalInteraction) => {
    //   try {
    //     const updated = {
    //       em_points: Number(modalInteraction.fields.getTextInputValue('em_points') || 0),
    //       sp_points: Number(modalInteraction.fields.getTextInputValue('sp_points') || 0),
    //       amp_points: Number(modalInteraction.fields.getTextInputValue('amp_points') || 0),
    //       rp_points: Number(modalInteraction.fields.getTextInputValue('rp_points') || 0),
    //     };
    //     ProfileSystem.updateProfile(targetUser.id, updated);

    //     const logEmbed = new EmbedBuilder()
    //       .setTitle('📊 Profil-Punkte aktualisiert')
    //       .setDescription(`Profil von ${targetUser.tag} wurde bearbeitet von ${modalInteraction.user.tag}`)
    //       .setTimestamp(new Date())
    //       .setColor('Green');

    //     if (config.PROFILE_LOG_CHANNEL_ID) {
    //       const logChannel = await modalInteraction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
    //       if (logChannel?.isTextBased()) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    //     }

    //     await modalInteraction.reply({ content: '✅ Punkte & Level erfolgreich aktualisiert.', ephemeral: true });
    //   } catch (err) {
    //     console.error('Profile Points Modal Error', err);
    //     try { await modalInteraction.reply({ content: '❌ Fehler beim Speichern der Punkte.', ephemeral: true }); } catch {}
    //   }
    // });

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('Show Profile Points Modal failed', err);
      try { await interaction.reply({ content: '❌ Formular konnte nicht geöffnet werden.', ephemeral: true }); } catch {}
    }
  }
};
