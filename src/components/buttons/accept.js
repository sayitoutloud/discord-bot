// src/components/buttons/accept.js
import { SupportSystem } from '../../systems/SupportSystem.js';

export default {
  customIdPrefix: 'support_accept',

  async execute(interaction) {
    try {
      const [prefix, guildId, userId] = interaction.customId.split(':');
      if (prefix !== 'support_accept') return;

      // acknowledge immediately
      await interaction.deferReply({ ephemeral: true });

      // role check
      const managerRoleName = process.env.SUPPORT_ROLE_NAME || 'Server Support';
      const managerRole = interaction.guild.roles.cache.find(r => r.name === managerRoleName);
      if (!managerRole || !interaction.member.roles.cache.has(managerRole.id)) {
        return await interaction.editReply({
          content: '❌ Nur Mitglieder mit der Rolle **Server Support** können Requests annehmen.'
        });
      }

      const result = await SupportSystem.acceptRequest(interaction, interaction.member, userId);

      if (result.ok) {
        await interaction.editReply({ content: `✅ Request von <@${userId}> wurde akzeptiert. Der Nutzer wurde in deinen Voice-Channel verschoben.` });
      } else {
        await interaction.editReply({ content: `⚠️ ${result.message || 'Fehler beim Akzeptieren.'}` });
      }
    } catch (err) {
      console.error('accept button error', err);
      try { await interaction.editReply({ content: '❌ Fehler beim Akzeptieren.' }); } catch {}
    }
  }
};
