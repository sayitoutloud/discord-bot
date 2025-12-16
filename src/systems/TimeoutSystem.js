// src/systems/TimeoutSystem.js
import fs from 'fs';
import path from 'path';
import config from '../config.js';

export class TimeoutSystem {
  static filePath = path.resolve(process.cwd(), config.TIMEOUT_FILE || './data/timeouts.json');
  // in-memory map of timers: { "<guildId>|<userId>": timeoutObject }
  static timers = new Map();

  static _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
  }

  static _loadAll() {
    try {
      this._ensureFile();
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (err) {
      console.error('TimeoutSystem load error', err);
      return {};
    }
  }

  static _saveAll(data) {
    try {
      this._ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('TimeoutSystem save error', err);
    }
  }

  // get guild object; structure: { [guildId]: { timeouts: { userId: { expiresAt, moderatorId } } } }
  static _ensureGuild(guildId) {
    const all = this._loadAll();
    if (!all[guildId]) {
      all[guildId] = { timeouts: {} };
      this._saveAll(all);
    }
    return all;
  }

  // Public: list timeouts for guild
  static getTimeouts(guildId) {
    const all = this._loadAll();
    if (!all[guildId] || !all[guildId].timeouts) return {};
    return all[guildId].timeouts;
  }

  // Save (persist) a timeout entry
  static _persistTimeout(guildId, userId, entry) {
    const all = this._loadAll();
    if (!all[guildId]) all[guildId] = { timeouts: {} };
    all[guildId].timeouts = all[guildId].timeouts || {};
    all[guildId].timeouts[userId] = entry;
    this._saveAll(all);
  }

  static _removePersisted(guildId, userId) {
    const all = this._loadAll();
    if (!all[guildId] || !all[guildId].timeouts) return;
    if (all[guildId].timeouts[userId]) delete all[guildId].timeouts[userId];
    this._saveAll(all);
  }

  // Internal helper: compute ms remaining until expiresAt
  static _msRemaining(expiresAt) {
    return Math.max(0, Number(expiresAt) - Date.now());
  }

  // Create / find the "Timed Out" role (or return existing). Returns role or null.
  static async _ensureTimeoutRole(guild) {
    const name = config.TIMEOUT_ROLE_NAME || 'Timed Out';
    // try find by exact name (case-sensitive)
    let role = guild.roles.cache.find(r => r.name === name);
    if (role) return role;
    // try case-insensitive
    role = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (role) return role;

    // create role if bot has ManageRoles
    try {
      const me = guild.members.me;
      if (!me) return null;
      if (!me.permissions.has('ManageRoles')) return null;
      // create role with red color, not hoisted
      role = await guild.roles.create({ name, color: 'DarkRed', reason: 'Create timed out role for TimeoutSystem' });
      return role;
    } catch (err) {
      console.warn('TimeoutSystem: cannot create timeout role', err);
      return null;
    }
  }

  // Set a timeout: hours -> number, can be float.
  // returns { ok:true, message, expiresAt } or { ok:false, message }
  static async setTimeout(guild, userId, hours, moderatorId = null, reason = 'Timeout by manager') {
    try {
      if (!guild || !guild.id) return { ok: false, message: 'Ungültige Guild.' };
      if (!Number.isFinite(hours) || hours <= 0) return { ok: false, message: 'Hours muss > 0 sein.' };

      // Discord limits: max ~28 days (in ms)
      const MAX_MS = 28 * 24 * 60 * 60 * 1000;
      const ms = Math.floor(hours * 60 * 60 * 1000);
      if (ms > MAX_MS) return { ok: false, message: 'Maximale Timeout-Länge ist 28 Tage.' };

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return { ok: false, message: 'Member nicht gefunden.' };

      // Set native discord timeout
      try {
        await member.timeout(ms, reason).catch(err => { throw err; });
      } catch (err) {
        console.error('TimeoutSystem: failed to set discord timeout', err);
        return { ok: false, message: 'Bot konnte Discord Timeout nicht setzen (Rechte/Hierarchie?)' };
      }

      // add timed-out role (optional)
      const role = await this._ensureTimeoutRole(guild);
      if (role) {
        try {
          // Check hierarchy
          const me = guild.members.me;
          if (me && role.position < me.roles.highest.position) {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role, `Timeout role added (${hours}h)`).catch(() => {});
            }
          } else {
            // cannot add role due to hierarchy; ignore but warn in debug
            console.warn('TimeoutSystem: cannot add timeout role due role hierarchy.');
          }
        } catch (err) {
          console.warn('TimeoutSystem: failed to add timed role', err);
        }
      }

      const expiresAt = Date.now() + ms;
      // persist
      this._persistTimeout(guild.id, userId, { expiresAt, moderatorId: moderatorId || null, reason });

      // schedule removal
      this._scheduleRemoval(guild.id, userId, expiresAt);

      return { ok: true, message: 'Timeout gesetzt.', expiresAt };
    } catch (err) {
      console.error('TimeoutSystem.setTimeout error', err);
      return { ok: false, message: 'Interner Fehler' };
    }
  }

  // Remove timeout immediately: clears discord timeout and role and persisted entry
  static async removeTimeout(guild, userId, actorId = null) {
    try {
      if (!guild || !guild.id) return { ok: false, message: 'Ungültige Guild.' };

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return { ok: false, message: 'Member nicht gefunden.' };

      // remove discord timeout by setting to null (member.timeout(0) not allowed). Use member.timeout(null) or member.timeout(0)?
      // discord.js: member.timeout(null) clears timeout
      try {
        // Clear timeout
        await member.timeout(null, `Timeout removed by ${actorId || 'manager'}`).catch(() => {});
      } catch (err) {
        console.warn('TimeoutSystem: failed to clear discord timeout', err);
      }

      // remove timed role
      const roleName = config.TIMEOUT_ROLE_NAME || 'Timed Out';
      const role = guild.roles.cache.find(r => r.name === roleName || r.name.toLowerCase() === roleName.toLowerCase());
      if (role && member.roles.cache.has(role.id)) {
        try {
          const me = guild.members.me;
          if (me && role.position < me.roles.highest.position) {
            await member.roles.remove(role, `Timeout role removed`).catch(() => {});
          } else {
            // cannot remove due to hierarchy, ignore
          }
        } catch (err) {
          console.warn('TimeoutSystem: failed to remove role', err);
        }
      }

      // clear persisted entry
      this._removePersisted(guild.id, userId);

      // clear scheduled timer if exists
      const key = `${guild.id}|${userId}`;
      const t = this.timers.get(key);
      if (t && t.timeoutHandle) {
        clearTimeout(t.timeoutHandle);
      }
      this.timers.delete(key);

      return { ok: true, message: 'Timeout entfernt.' };
    } catch (err) {
      console.error('TimeoutSystem.removeTimeout error', err);
      return { ok: false, message: 'Interner Fehler' };
    }
  }

  // Schedule removal when expiresAt reached
  static _scheduleRemoval(guildId, userId, expiresAt) {
    try {
      const key = `${guildId}|${userId}`;
      // clear existing
      const prev = this.timers.get(key);
      if (prev && prev.timeoutHandle) clearTimeout(prev.timeoutHandle);

      const ms = this._msRemaining(expiresAt);
      if (ms <= 0) {
        // expire immediately via process later
        this.timers.delete(key);
        return;
      }

      const timeoutHandle = setTimeout(async () => {
        try {
          // try to fetch guild from client stored in timers
          const timerObj = this.timers.get(key);
          const client = timerObj?.client;
          const guild = client ? client.guilds.cache.get(guildId) : null;
          if (guild) {
            await this.removeTimeout(guild, userId).catch(() => {});
            // log via client
            try {
              const logId = config.TIMEOUT_LOG_CHANNEL_ID;
              let channel = null;
              if (logId && client) channel = await client.channels.fetch(logId).catch(() => null);
              if (!channel && guild) channel = guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes('timeout-logs'));
              if (channel && channel.isTextBased()) {
                await channel.send({
                  embeds: [{
                    title: '⏱️ Timeout abgelaufen',
                    description: `Timeout von <@${userId}> in **${guild.name}** ist abgelaufen und wurde entfernt.`,
                    timestamp: new Date()
                  }]
                }).catch(() => {});
              }
            } catch (e) { /* ignore logging errors */ }
          } else {
            // guild not found — still remove persisted
            const all = this._loadAll();
            if (all[guildId] && all[guildId].timeouts && all[guildId].timeouts[userId]) {
              delete all[guildId].timeouts[userId];
              this._saveAll(all);
            }
          }
        } catch (err) {
          console.error('TimeoutSystem scheduled removal error', err);
        } finally {
          this.timers.delete(key);
        }
      }, ms);

      this.timers.set(key, { timeoutHandle, expiresAt, client: prev?.client ?? null });
    } catch (err) {
      console.error('TimeoutSystem._scheduleRemoval error', err);
    }
  }

  // Start: call on bot startup to reapply persisted timeouts and schedule removals
  // Usage: TimeoutSystem.start(client) after client.login()
  static async start(client) {
    try {
      // load all persisted timeouts
      const all = this._loadAll();
      for (const guildId of Object.keys(all)) {
        const guildData = all[guildId];
        if (!guildData || !guildData.timeouts) continue;
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        for (const userId of Object.keys(guildData.timeouts)) {
          const entry = guildData.timeouts[userId];
          const expiresAt = Number(entry.expiresAt);
          const ms = this._msRemaining(expiresAt);
          if (ms <= 0) {
            // expired while bot offline — remove persisted
            delete all[guildId].timeouts[userId];
            continue;
          }
          // Reapply discord timeout and role if guild available
          if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              try {
                await member.timeout(ms, 'Reapplying timeout after bot restart').catch(() => {});
              } catch (e) {
                console.warn('TimeoutSystem start: failed to reapply discord timeout', e);
              }
              // ensure timed role
              try {
                const role = await this._ensureTimeoutRole(guild);
                if (role) {
                  const me = guild.members.me;
                  if (me && role.position < me.roles.highest.position) {
                    if (!member.roles.cache.has(role.id)) await member.roles.add(role, 'Reapply timed role after restart').catch(() => {});
                  }
                }
              } catch (e) { /* ignore */ }
            }
          }
          // schedule removal with client reference for logging
          const key = `${guildId}|${userId}`;
          const timeoutHandle = setTimeout(async () => {
            try {
              const guildForTimer = client.guilds.cache.get(guildId);
              if (guildForTimer) {
                await this.removeTimeout(guildForTimer, userId).catch(() => {});
                // logging
                const logId = config.TIMEOUT_LOG_CHANNEL_ID;
                let channel = null;
                if (logId) channel = await client.channels.fetch(logId).catch(() => null);
                if (!channel && guildForTimer) channel = guildForTimer.channels.cache.find(c => c.name && c.name.toLowerCase().includes('timeout-logs'));
                if (channel && channel.isTextBased()) {
                  await channel.send({
                    embeds: [{
                      title: '⏱️ Timeout abgelaufen',
                      description: `Timeout von <@${userId}> in **${guildForTimer.name}** ist abgelaufen und wurde entfernt.`,
                      timestamp: new Date()
                    }]
                  }).catch(() => {});
                }
              } else {
                // clean persisted if guild not found
                const allNow = this._loadAll();
                if (allNow[guildId] && allNow[guildId].timeouts && allNow[guildId].timeouts[userId]) {
                  delete allNow[guildId].timeouts[userId];
                  this._saveAll(allNow);
                }
              }
            } catch (e) { console.error('Timeout scheduled removal', e); }
            this.timers.delete(key);
          }, ms);

          this.timers.set(key, { timeoutHandle, expiresAt, client });
        }
      }
      // save any cleanup we did (expired removals)
      this._saveAll(all);
      console.log('TimeoutSystem: started and scheduled persisted timeouts.');
    } catch (err) {
      console.error('TimeoutSystem.start error', err);
    }
  }
}
