// src/systems/SupportSystem.js
import fs from 'fs';
import path from 'path';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'supports.json');
const ASSETS_PATH = path.join(process.cwd(), 'assets');

export class SupportSystem {
  static sessions = new Map();

  static _ensureFile() {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2), 'utf8');
  }

  static start() {
    try {
      this._ensureFile();
      fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2), 'utf8');
      console.log('SupportSystem: started, persisted supports cleared.');
    } catch (err) {
      console.warn('SupportSystem.start error:', err);
    }
  }

  static createSession(guildId, voiceChannelId, textChannelId, client) {
    if (this.sessions.has(guildId)) throw new Error('Support session already exists for this guild.');
    const session = {
      guildId,
      voiceChannelId,
      textChannelId,
      client,
      connection: null,
      player: null,
      queue: new Map(), // Map<userId, entry>
      audioQueue: [],
      audioBusy: false,
    };
    this.sessions.set(guildId, session);

    try {
      this._ensureFile();
      const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      raw[guildId] = { voiceChannelId, textChannelId, createdAt: Date.now() };
      fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2), 'utf8');
    } catch (e) { /* ignore */ }

    return session;
  }

  static hasSession(guildId) {
    return this.sessions.has(guildId);
  }

  static getSession(guildId) {
    return this.sessions.get(guildId) || null;
  }

  static destroySession(guildId) {
    const s = this.sessions.get(guildId);
    if (!s) return false;
    for (const [uid, entry] of s.queue.entries()) {
      try { if (entry.timeoutHandle) clearTimeout(entry.timeoutHandle); } catch (e) {}
    }
    try {
      if (s.player) { try { s.player.stop(); } catch (e) {} s.player = null; }
      if (s.connection) { try { s.connection.destroy(); } catch (e) {} s.connection = null; }
    } catch (e) {}
    this.sessions.delete(guildId);

    try {
      this._ensureFile();
      const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      if (raw[guildId]) delete raw[guildId];
      fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2), 'utf8');
    } catch (e) {}

    return true;
  }

  static _canRequest(guildId, userId) {
    const session = this.getSession(guildId);
    if (!session) return false;
    const entry = session.queue.get(userId);
    if (entry && entry.state === 'waiting') return false;
    const lastHandled = entry?.lastHandledAt || 0;
    if (Date.now() - lastHandled < 2 * 60 * 1000) return false;
    return true;
  }

  static async addRequest(guild, userId) {
    try {
      const guildId = guild.id;
      const session = this.getSession(guildId);
      if (!session) return { ok: false, message: 'no-session' };

      if (!this._canRequest(guildId, userId)) return { ok: false, message: 'rate-limited-or-waiting' };

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return { ok: false, message: 'member-not-found' };

      const textChan = guild.channels.cache.get(session.textChannelId);
      if (!textChan || !textChan.isTextBased()) return { ok: false, message: 'text-channel-unavailable' };

      try {
        if (member.voice) {
          await member.voice.setMute(true, 'Added to support queue');
        }
      } catch (err) {
        console.warn('SupportSystem: mute user failed', err?.message);
      }

      const acceptId = `support_accept:${guildId}:${userId}`;
      const rejectId = `support_reject:${guildId}:${userId}`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(acceptId).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(rejectId).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      const sent = await textChan.send({
        content: `📨 <@${userId}> benötigt Support — Accept oder Reject?`,
        components: [row],
      }).catch(() => null);

      const timeoutHandle = setTimeout(async () => {
        const cur = session.queue.get(userId);
        if (cur && cur.state === 'waiting') {
          try {
            // when timeout happens, finalize as 'timeout'
            await this._finalizeRemoval(guild, userId, 'timeout');
            // optionally announce in channel
            try {
              const chan = await session.client.channels.fetch(session.textChannelId).catch(() => null);
              if (chan && chan.isTextBased()) {
                await chan.send(`<@${userId}> Support Request timed out (10min).`).catch(() => {});
              }
            } catch (e) {}
          } catch (err) {
            console.error('SupportSystem auto-timeout error', err);
          }
        }
      }, 10 * 60 * 1000);

      session.queue.set(userId, {
        state: 'waiting',
        timestamp: Date.now(),
        timeoutHandle,
        messageId: sent ? sent.id : null,
        lastHandledAt: session.queue.get(userId)?.lastHandledAt || 0,
        // permission metadata for accepted flows
        permissionGiven: false,
        allowedChannelId: null,
      });

      return { ok: true, messageId: sent ? sent.id : null };
    } catch (err) {
      console.error('SupportSystem.addRequest error', err);
      return { ok: false, message: 'internal-error' };
    }
  }

  /**
   * AcceptRequest: does NOT call interaction.reply directly.
   * - moves target into supporter's voice
   * - unmutes target
   * - sets per-channel overwrite on supporter channel so target can speak/stream
   * - cancels timeout and marks entry as handled but KEEP entry so that when the user leaves
   *   we can remove the overwrite and then delete the entry after 2min (rate-limit).
   */
  static async acceptRequest(interaction, supporterMember, targetUserId) {
    try {
      const guild = interaction.guild;
      const guildId = guild.id;
      const session = this.getSession(guildId);
      if (!session) return { ok: false, message: 'Session not active.' };

      if (!supporterMember.voice || !supporterMember.voice.channelId) {
        return { ok: false, message: 'Du musst in einem Voice-Channel sein, um zu akzeptieren.' };
      }

      const entry = session.queue.get(targetUserId);
      if (!entry || entry.state !== 'waiting') {
        return { ok: false, message: 'Diese Anfrage ist nicht mehr wartend.' };
      }

      const member = await guild.members.fetch(targetUserId).catch(() => null);
      if (!member) return { ok: false, message: 'User nicht gefunden.' };

      // move member to supporter channel and unmute
      const targetVoiceChannelId = supporterMember.voice.channelId;
      try {
        await member.voice.setChannel(targetVoiceChannelId);
        await member.voice.setMute(false, 'Support accepted');
      } catch (err) {
        console.warn('SupportSystem accept: move/unmute failed', err);
        return { ok: false, message: 'Konnte Benutzer nicht verschieben (Rollen-Hierarchie/Rechte).' };
      }

      // give per-member overwrite on the supporter's voice channel so they can speak/stream/connect
      try {
        const channel = guild.channels.cache.get(targetVoiceChannelId);
        if (channel && channel.permissionsFor) {
          await channel.permissionOverwrites.edit(member.id, {
            Connect: true,
            Speak: true,
            Stream: true,
            ViewChannel: true,
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('SupportSystem accept: set overwrite failed', err);
      }

      // mark entry as handled but KEEP entry (so voiceStateUpdate can remove overwrite when user leaves)
      try {
        if (entry.timeoutHandle) {
          clearTimeout(entry.timeoutHandle);
          entry.timeoutHandle = null;
        }
        entry.state = 'handled';
        entry.lastHandledAt = Date.now();
        entry.permissionGiven = true;
        entry.allowedChannelId = targetVoiceChannelId;
        session.queue.set(targetUserId, entry);
      } catch (e) { /* ignore */ }

      // optionally edit original message to indicate accepted
      try {
        if (entry.messageId && session.client) {
          const chan = await session.client.channels.fetch(session.textChannelId).catch(() => null);
          if (chan && chan.isTextBased()) {
            const msg = await chan.messages.fetch(entry.messageId).catch(() => null);
            if (msg) {
              await msg.edit({ content: `✅ Request from <@${targetUserId}> accepted by <@${supporterMember.id}>.`, components: [] }).catch(() => {});
            }
          }
        }
      } catch (e) { /* ignore */ }

      return { ok: true };
    } catch (err) {
      console.error('SupportSystem.acceptRequest error', err);
      return { ok: false, message: 'Fehler beim Akzeptieren.' };
    }
  }

  /**
   * Reject: mark handled, clear timeout, optionally unmute/move out, edit message and return result.
   * Does NOT attempt audio playing.
   */
  static async rejectRequest(interaction, supporterMember, targetUserId) {
    try {
      const guild = interaction.guild;
      const guildId = guild.id;
      const session = this.getSession(guildId);
      if (!session) return { ok: false, message: 'Session not active.' };

      const entry = session.queue.get(targetUserId);
      if (!entry || entry.state !== 'waiting') {
        return { ok: false, message: 'Diese Anfrage ist nicht mehr wartend.' };
      }

      const member = await guild.members.fetch(targetUserId).catch(() => null);
      if (member && member.voice && member.voice.channelId === session.voiceChannelId) {
        try { await member.voice.setMute(false, 'Support rejected'); } catch (e) {}
        try { await member.voice.setChannel(null).catch(() => {}); } catch (e) {}
      }

      // finalize removal (this will mark handled, edit message, and keep lastHandledAt)
      await this._finalizeRemoval(guild, targetUserId, 'rejected');

      // optionally announce in text channel
      try {
        const chan = await session.client.channels.fetch(session.textChannelId).catch(() => null);
        if (chan && chan.isTextBased()) {
          await chan.send(`<@${targetUserId}> wurde abgelehnt (rejected).`).catch(() => {});
        }
      } catch (e) {}

      return { ok: true };
    } catch (err) {
      console.error('SupportSystem.rejectRequest error', err);
      return { ok: false, message: 'Fehler beim Ablehnen.' };
    }
  }

  /**
   * _finalizeRemoval: unmute + remove from voice (if present), edit request message,
   * mark handled and set lastHandledAt. If permission overwrites were given, remove them.
   */
  static async _finalizeRemoval(guild, userId, reason = 'removed') {
    try {
      const guildId = guild.id;
      const session = this.getSession(guildId);
      if (!session) return;

      const entry = session.queue.get(userId);
      if (!entry) return;

      try { if (entry.timeoutHandle) clearTimeout(entry.timeoutHandle); } catch (e) {}

      const member = await guild.members.fetch(userId).catch(() => null);
      // if member still in the support voice channel -> try to unmute and remove them
      if (member && member.voice && member.voice.channelId === session.voiceChannelId) {
        try { await member.voice.setMute(false, 'Support request handled'); } catch (e) {}
        try { await member.voice.setChannel(null).catch(() => {}); } catch (e) {}
      }

      // if we previously gave a permission overwrite (accepted flow) -> remove it
      try {
        if (entry.permissionGiven && entry.allowedChannelId) {
          const ch = await session.client.channels.fetch(entry.allowedChannelId).catch(() => null);
          if (ch && ch.permissionOverwrites) {
            await ch.permissionOverwrites.delete(userId).catch(() => {});
          }
          entry.permissionGiven = false;
          entry.allowedChannelId = null;
        }
      } catch (e) { /* ignore */ }

      // mark handled and set lastHandledAt
      entry.state = 'handled';
      entry.lastHandledAt = Date.now();
      entry.timeoutHandle = null;
      session.queue.set(userId, entry);

      // edit the request message
      try {
        if (entry.messageId && session.client) {
          const chan = await session.client.channels.fetch(session.textChannelId).catch(() => null);
          if (chan && chan.isTextBased()) {
            const msg = await chan.messages.fetch(entry.messageId).catch(() => null);
            if (msg) {
              await msg.edit({ content: `✅ Request from <@${userId}> handled (${reason}).`, components: [] }).catch(() => {});
            }
          }
        }
      } catch (e) { /* ignore */ }

      // remove entry after 2 minutes (rate-limit window)
      setTimeout(() => {
        try { session.queue.delete(userId); } catch (e) {}
      }, 2 * 60 * 1000);
    } catch (err) {
      console.error('SupportSystem._finalizeRemoval error', err);
    }
  }
}
