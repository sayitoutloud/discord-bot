// src/commands/admin/remove_role.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove_role')
    .setDescription('Entfernt eine Rolle von einem Member (Admin/Role-Manager).')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmitglied').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Rolle, die entfernt werden soll').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const targetUser = interaction.options.getUser('member', true);
    const role = interaction.options.getRole('role', true);

    // Berechtigungscheck
    const roleManager = guild.roles.cache.find(r => r.name.toLowerCase() === (config.ROLE_MANAGER_ROLE_NAME || '').toLowerCase());
    const allowed = invoker.permissions.has(PermissionFlagsBits.ManageRoles) || (roleManager && invoker.roles.cache.has(roleManager.id));
    if (!allowed) {
      return interaction.reply({ content: '❌ Du hast keine Berechtigung, Rollen zu entfernen.', ephemeral: true });
    }

    // Member-Objekt holen
    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });

    // Bot Rechte & Hierarchie prüfen
    const me = await guild.members.fetch(interaction.client.user.id);
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ Ich habe nicht die nötigen Rechte (Manage Roles).', ephemeral: true });
    }
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({ content: '❌ Ich kann diese Rolle nicht entfernen (Rollen-Hierarchie).', ephemeral: true });
    }
    if (role.position >= invoker.roles.highest.position && !invoker.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Du kannst Rollen nicht entfernen, die gleich- oder höher positioniert sind als deine höchste Rolle.', ephemeral: true });
    }

    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ content: 'ℹ️ Der Member hat die Rolle nicht.', ephemeral: true });
    }

    try {
      await member.roles.remove(role, `Role removed by ${interaction.user.tag} via /remove_role`);
    } catch (err) {
      console.error('remove_role error:', err);
      return interaction.reply({ content: '❌ Fehler beim Entfernen der Rolle.', ephemeral: true });
    }

    // Log-Embed senden
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Rolle entfernt')
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Rolle', value: `${role.name} (${role.id})`, inline: true },
        { name: 'Durch', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
      )
      .setTimestamp();

    let logChannel = null;
    if (config.ROLE_LOG_CHANNEL_ID) {
      logChannel = await interaction.client.channels.fetch(config.ROLE_LOG_CHANNEL_ID).catch(() => null);
    }
    if (!logChannel) {
      logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('role-logs'));
    }
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    return interaction.reply({ content: `✅ Rolle **${role.name}** wurde von **${member.user.tag}** entfernt.`, ephemeral: false });
  },
};
