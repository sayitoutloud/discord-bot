// src/events/voiceStateUpdate.js
import { SupportSystem } from '../systems/SupportSystem.js';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;
      const guildId = guild.id;
      const session = SupportSystem.getSession(guildId);
      if (!session) return;

      const voiceChannelId = session.voiceChannelId;
      if (!voiceChannelId) return;

      // ignore bot
      if (newState.member?.user?.bot) return;

      // --- User joins the support voice channel ---
      if (oldState.channelId !== voiceChannelId && newState.channelId === voiceChannelId) {
        console.log(`[SupportSystem] ${newState.member.user.tag} joined support voice`);
        const userId = newState.member.id;
        const res = await SupportSystem.addRequest(guild, userId);
        if (!res.ok) {
          const txt = guild.channels.cache.get(session.textChannelId);
          if (txt?.isTextBased()) {
            await txt.send(
              `<@${userId}> konnte nicht in die Support-Warteschlange eingereiht werden: ${res.message}`
            ).catch(() => {});
          }
        }
      }

      // --- User leaves the support voice channel (normal queue) ---
      if (oldState.channelId === voiceChannelId && newState.channelId !== voiceChannelId) {
        console.log(`[SupportSystem] ${newState.member.user.tag} left support voice`);
        const userId = newState.member.id;
        const q = session.queue.get(userId);
        if (q && q.state === 'waiting') {
          try {
            if (q.timeoutHandle) clearTimeout(q.timeoutHandle);
            session.queue.delete(userId);
            if (q.messageId) {
              const chan = await guild.channels.fetch(session.textChannelId).catch(() => null);
              if (chan?.isTextBased()) {
                const msg = await chan.messages.fetch(q.messageId).catch(() => null);
                if (msg) {
                  await msg.edit({
                    content: `ℹ️ <@${userId}> hat den Support-Channel verlassen.`,
                    components: [],
                  }).catch(() => {});
                }
              }
            }
          } catch (e) {
            console.warn('voiceStateUpdate leave edit fail', e);
          }
        }
      }

      // --- User left some channel: check if they had permissionGiven on that channel (accepted flow) ---
      // oldState.channelId is the channel they left
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const userId = newState.member?.id || oldState.member?.id;
        if (userId) {
          const entry = session.queue.get(userId);
          if (entry && entry.permissionGiven && entry.allowedChannelId === oldState.channelId) {
            // user left the accepted channel -> finalize (removes overwrite etc)
            try {
              console.log(`[SupportSystem] accepted user ${userId} left channel ${oldState.channelId} — finalizing.`);
              await SupportSystem._finalizeRemoval(guild, userId, 'left-channel');
            } catch (e) {
              console.error('Error finalizing accepted user leave', e);
            }
          }
        }
      }

    } catch (err) {
      console.error('voiceStateUpdate support error', err);
    }
  },
};
