// src/commands/admin/rankdown.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { GradeSystem } from '../../systems/GradeSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rankdown')
    .setDescription('Senkt den Rank eines Members (nur Rank Manager).')
    .addUserOption(o => o.setName('member').setDescription('Zielmember').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;

    // Berechtigung
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === (config.RANK_MANAGER_ROLE_NAME || '').toLowerCase());
    const allowed = invoker.permissions.has(PermissionFlagsBits.ManageRoles) || (managerRole && invoker.roles.cache.has(managerRole.id));
    if (!allowed) return interaction.reply({ content: '❌ Du hast keine Berechtigung (Rank Manager benötigt).', ephemeral: true });

    const user = interaction.options.getUser('member', true);
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Member nicht gefunden.', ephemeral: true });

    const grades = GradeSystem.getAllGrades();
    if (!grades || grades.length === 0) {
      return interaction.reply({ content: 'ℹ️ Keine Grades im System vorhanden.', ephemeral: true });
    }

    const current = GradeSystem.findMemberGrade(member);
    let targetGrade = null;

    if (!current) {
      // kein grade -> gib die letzte (niedrigste)
      targetGrade = grades[grades.length - 1];
    } else {
      // next lower = number + 1
      targetGrade = GradeSystem.getLowerGrade(current);
      if (!targetGrade) {
        return interaction.reply({ content: `ℹ️ ${member.user.tag} ist bereits auf der niedrigsten Grade.`, ephemeral: true });
      }
    }

    const res = await GradeSystem.applyGradeToMember(member, targetGrade, invoker);
    if (!res.ok) return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('📉 Rank Down')
      .setDescription(`${member.user.tag} wurde auf **${targetGrade.roleName}** (№${targetGrade.number}) gesetzt.`)
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Neue Grade', value: `${targetGrade.roleName} (${targetGrade.shortcut})`, inline: true },
        { name: 'Durch', value: `${interaction.user.tag}`, inline: false },
      )
      .setTimestamp();

    // send log
    let logChannel = null;
    if (config.RANK_LOG_CHANNEL_ID) {
      logChannel = await interaction.client.channels.fetch(config.RANK_LOG_CHANNEL_ID).catch(() => null);
    }
    if (!logChannel) {
      logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('rank-logs'));
    }
    if (logChannel && logChannel.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});

    return interaction.reply({ content: `✅ ${member.user.tag} wurde auf **${targetGrade.roleName}** (№${targetGrade.number}) gesetzt.`, ephemeral: false });
  },
};
