// src/components/buttons/reject.js
import { SupportSystem } from '../../systems/SupportSystem.js';

export default {
  customIdPrefix: 'support_reject',
  async execute(interaction) {
    try {
      const [prefix, guildId, userId] = interaction.customId.split(':');
      if (prefix !== 'support_reject') return;

      // acknowledge
      await interaction.deferReply({ ephemeral: true });

      const managerRoleName = process.env.SUPPORT_ROLE_NAME || 'Server Support';
      const managerRole = interaction.guild.roles.cache.find(r => r.name === managerRoleName);
      if (!managerRole || !interaction.member.roles.cache.has(managerRole.id)) {
        return await interaction.editReply({ content: '❌ Nur Server Support kann Requests ablehnen.' });
      }

      const result = await SupportSystem.rejectRequest(interaction, interaction.member, userId);
      if (result.ok) {
        await interaction.editReply({ content: `❌ Du hast <@${userId}> abgelehnt.` });
      } else {
        await interaction.editReply({ content: `⚠️ ${result.message || 'Fehler beim Ablehnen.'}` });
      }
    } catch (err) {
      console.error('reject button error', err);
      try { await interaction.editReply({ content: '❌ Fehler beim Ablehnen.' }); } catch {}
    }
  }
};
