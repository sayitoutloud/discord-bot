import { EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';

export default {
  customIdPrefix: 'profile_info',
  async execute(interaction) {
    try {
      const [, targetUserId] = (interaction.customId || '').split(':');
      if (!targetUserId) return interaction.reply({ content: '❌ Zielmember fehlt.', flags: 1 << 6 });

      const guild = interaction.guild;
      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) return interaction.reply({ content: '❌ Member nicht gefunden.', flags: 1 << 6 });

      const profileUpdate = {
        name: interaction.fields.getTextInputValue('name') || targetMember.displayName,
        nickname: interaction.fields.getTextInputValue('nickname') || null,
        steamhex: interaction.fields.getTextInputValue('steamhex') || null,
        bio: interaction.fields.getTextInputValue('bio') || null,
        gender: interaction.fields.getTextInputValue('gender') || null,
        roles: Array.from(targetMember.roles.cache.values())
          .filter(r => !r.managed && r.id !== guild.id).map(r => r.name),
      };

      ProfileSystem.updateProfile(targetUserId, profileUpdate);

      if (config.PROFILE_LOG_CHANNEL_ID) {
        const logChannel = await interaction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📝 Profil-Info aktualisiert')
            .setDescription(`Profil von <@${targetUserId}> bearbeitet von ${interaction.user.tag}`)
            .setColor('Blue')
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      await interaction.reply({ content: '✅ Profil-Info gespeichert.', flags: 1 << 6 });
    } catch (e) {
      console.error('profile-info modal error', e);
      try { await interaction.reply({ content: '❌ Fehler beim Speichern.', flags: 1 << 6 }); } catch {}
    }
  },
};
