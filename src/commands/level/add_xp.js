// src/commands/level/add_xp.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { LevelSystem } from '../../systems/LevelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add_xp')
    .setDescription('Fügt einem Member XP hinzu (0-100) — (Level Manager only)')
    .addUserOption(opt => opt.setName('member').setDescription('Zielmember').setRequired(true))
    .addIntegerOption(opt => opt.setName('count').setDescription('XP Anzahl (0-100)').setRequired(true)),

  async execute(interaction) {
    const guild = interaction.guild;
    const invoker = interaction.member;
    const managerName = config.LEVEL_MANAGER_ROLE_NAME || 'Level Manager';
    const managerRole = guild.roles.cache.find(r => r.name.toLowerCase() === managerName.toLowerCase());
    const allowed = invoker.permissions.has(PermissionFlagsBits.ManageGuild) || (managerRole && invoker.roles.cache.has(managerRole.id));
    if (!allowed) return interaction.reply({ content: '❌ Du hast keine Berechtigung (Level Manager benötigt).', ephemeral: true });

    const targetUser = interaction.options.getUser('member', true);
    const count = interaction.options.getInteger('count', true);

    if (!Number.isFinite(count) || count < 0 || count > 100) {
      return interaction.reply({ content: '❌ Count muss eine Zahl zwischen 0 und 100 sein.', ephemeral: true });
    }

    try {
      const res = LevelSystem.addXP(targetUser.id, count);
      if (!res.ok) {
        return interaction.reply({ content: `❌ ${res.message}`, ephemeral: true });
      }

      // build embed
      const emb = new EmbedBuilder()
        .setTitle('🟢 XP hinzugefügt')
        .addFields(
          { name: 'Member', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
          { name: 'Vorher', value: `Level: ${res.before.lvl} • XP: ${res.before.xp}`, inline: true },
          { name: 'Jetzt', value: `Level: ${res.after.lvl} • XP: ${res.after.xp}`, inline: true },
          { name: 'Erhalten', value: `${count} XP`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [emb], ephemeral: false });

      // log channel
      let logChannel = null;
      if (config.LEVEL_LOG_CHANNEL_ID) {
        logChannel = await interaction.client.channels.fetch(config.LEVEL_LOG_CHANNEL_ID).catch(() => null);
      }
      if (!logChannel) {
        logChannel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('level-logs'));
      }
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({ embeds: [emb] }).catch(() => {});
      }
    } catch (err) {
      console.error('add_xp error', err);
      return interaction.reply({ content: '❌ Unbekannter Fehler beim Hinzufügen von XP.', ephemeral: true });
    }
  },
};
