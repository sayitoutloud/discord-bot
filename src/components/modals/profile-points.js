import { EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';

export default {
  customIdPrefix: 'profile_points',
  async execute(interaction) {
    try {
      const [, targetUserId] = (interaction.customId || '').split(':');
      if (!targetUserId) return interaction.reply({ content: '❌ Zielmember fehlt.', flags: 1 << 6 });

      const updated = {
        em_points: Number(interaction.fields.getTextInputValue('em_points') || 0),
        sp_points: Number(interaction.fields.getTextInputValue('sp_points') || 0),
        amp_points: Number(interaction.fields.getTextInputValue('amp_points') || 0),
        rp_points: Number(interaction.fields.getTextInputValue('rp_points') || 0),
      };
      ProfileSystem.updateProfile(targetUserId, updated);

      if (config.PROFILE_LOG_CHANNEL_ID) {
        const logChannel = await interaction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📊 Profil-Punkte aktualisiert')
            .setDescription(`Profil von <@${targetUserId}> bearbeitet von ${interaction.user.tag}`)
            .setColor('Green')
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      await interaction.reply({ content: '✅ Punkte & Level gespeichert.', flags: 1 << 6 });
    } catch (e) {
      console.error('profile-points modal error', e);
      try { await interaction.reply({ content: '❌ Fehler beim Speichern der Punkte.', flags: 1 << 6 }); } catch {}
    }
  },
};
