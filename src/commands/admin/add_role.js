// src/commands/admin/add_role.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add_role')
    .setDescription('Fügt einem Member eine Rolle hinzu (Admin/Role-Manager).')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmitglied').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Rolle, die hinzugefügt werden soll').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const targetUser = interaction.options.getUser('member', true);
    const role = interaction.options.getRole('role', true);

    // Berechtigungscheck: Invoker muss entweder ManageRoles oder ROLE_MANAGER_ROLE_NAME haben
    const roleManager = guild.roles.cache.find(r => r.name.toLowerCase() === (config.ROLE_MANAGER_ROLE_NAME || '').toLowerCase());
    const allowed = invoker.permissions.has(PermissionFlagsBits.ManageRoles) || (roleManager && invoker.roles.cache.has(roleManager.id));
    if (!allowed) {
      return interaction.reply({ content: '❌ Du hast keine Berechtigung, Rollen hinzuzufügen.', ephemeral: true });
    }

    // Member-Objekt holen
    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });

    // Bot-Berechtigungen & Hierarchie prüfen
    const me = await guild.members.fetch(interaction.client.user.id);
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ Ich habe nicht die nötigen Rechte (Manage Roles).', ephemeral: true });
    }
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({ content: '❌ Ich kann diese Rolle nicht vergeben (Rollen-Hierarchie).', ephemeral: true });
    }
    if (role.position >= invoker.roles.highest.position && !invoker.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Du kannst keine Rollen vergeben, die gleich- oder höher positioniert sind als deine höchste Rolle.', ephemeral: true });
    }

    // Rolle hinzufügen (falls nicht schon vorhanden)
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: 'ℹ️ Der Member hat diese Rolle bereits.', ephemeral: true });
    }

    try {
      await member.roles.add(role, `Role added by ${interaction.user.tag} via /add_role`);
    } catch (err) {
      console.error('add_role error:', err);
      return interaction.reply({ content: '❌ Fehler beim Hinzufügen der Rolle.', ephemeral: true });
    }

    // Log-Embed senden
    const embed = new EmbedBuilder()
      .setTitle('✅ Rolle hinzugefügt')
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Rolle', value: `${role.name} (${role.id})`, inline: true },
        { name: 'Durch', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
      )
      .setTimestamp();

    // Log-Channel ermitteln
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

    return interaction.reply({ content: `✅ Rolle **${role.name}** wurde zu **${member.user.tag}** hinzugefügt.`, ephemeral: false });
  },
};
