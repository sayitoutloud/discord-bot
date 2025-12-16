import { EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import { ProfileSystem } from '../../systems/ProfileSystem.js';

export default {
  customIdPrefix: 'my_profile_modal',
  async execute(interaction) {
    try {
      const [, userId] = (interaction.customId || '').split(':');
      const guild = interaction.guild;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Member nicht gefunden.', flags: 1 << 6 });

      const rolesArr = Array.from(member.roles.cache.values())
        .filter(r => !r.managed && r.id !== guild.id).map(r => r.name);

      const updated = ProfileSystem.updateProfile(userId, {
        name: interaction.fields.getTextInputValue('name') || member.displayName,
        nickname: interaction.fields.getTextInputValue('nickname') || null,
        steamhex: interaction.fields.getTextInputValue('steamhex') || null,
        bio: interaction.fields.getTextInputValue('bio') || null,
        gender: interaction.fields.getTextInputValue('gender') || null,
        roles: rolesArr,
      });

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('✅ Profil aktualisiert')
        .setDescription('Dein Profil wurde gespeichert.')
        .addFields(
          { name: 'Name', value: updated.name || '—', inline: true },
          { name: 'Nickname', value: updated.nickname || '—', inline: true },
          { name: 'Steam Hex', value: updated.steamhex || '—', inline: true },
          { name: 'Geschlecht', value: updated.gender || '—', inline: true },
          { name: 'Biografie', value: updated.bio || '—', inline: false },
          { name: 'Rollen', value: rolesArr.length ? rolesArr.join(', ') : '—', inline: false },
        )
        .setFooter({ text: `Aktualisiert von ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 1 << 6 });

      // Optionales Logging wie bei dir
      if (config.PROFILE_LOG_CHANNEL_ID) {
        const logChannel = await interaction.client.channels.fetch(config.PROFILE_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({ content: `📝 <@${userId}> hat sein Profil aktualisiert.` }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('my-profile modal error', e);
      try { await interaction.reply({ content: '❌ Fehler beim Speichern des Profils.', flags: 1 << 6 }); } catch {}
    }
  },
};
