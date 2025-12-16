// src/systems/WarnSystem.js
import fs from 'fs';
import path from 'path';
import config from '../config.js';

const DEFAULT_FILE = './data/warns.json';

export class WarnSystem {
  static filePath = path.resolve(process.cwd(), config.WARN_FILE || DEFAULT_FILE);

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
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      console.error('WarnSystem load error', err);
      return {};
    }
  }

  static _saveAll(data) {
    try {
      this._ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('WarnSystem save error', err);
    }
  }

  // ensure guild object
  static _ensureGuild(guildId) {
    const all = this._loadAll();
    if (!all[guildId]) {
      all[guildId] = { warnRoles: [], userWarns: {} };
      this._saveAll(all);
    }
    return all;
  }

  // set a warn role mapping { name, roleId } (name unique per guild)
  static setWarnRole(guildId, name, roleId) {
    if (!name || !roleId) throw new Error('Name und RoleId erforderlich.');
    const all = this._ensureGuild(guildId);
    const guild = all[guildId];
    // prevent duplicate names
    const exists = guild.warnRoles.find(w => String(w.name).toLowerCase() === String(name).toLowerCase());
    if (exists) {
      // replace roleId if name exists
      exists.roleId = String(roleId);
    } else {
      guild.warnRoles.push({ name: String(name), roleId: String(roleId) });
    }
    all[guildId] = guild;
    this._saveAll(all);
    return guild.warnRoles;
  }

  static getWarnRoles(guildId) {
    const all = this._loadAll();
    return (all[guildId] && Array.isArray(all[guildId].warnRoles)) ? all[guildId].warnRoles : [];
  }

  static getWarnByName(guildId, name) {
    if (!name) return null;
    const roles = this.getWarnRoles(guildId);
    return roles.find(r => String(r.name).toLowerCase() === String(name).toLowerCase()) || null;
  }

  // apply warn: add role to user and store warn record (no duplicates)
  static async applyWarn(guild, userId, warnName) {
    if (!guild || !guild.id) return { ok: false, message: 'Ungültiger Guild.' };
    const gId = guild.id;
    const warn = this.getWarnByName(gId, warnName);
    if (!warn) return { ok: false, message: 'Warn Name nicht gefunden.' };

    const role = guild.roles.cache.get(warn.roleId);
    if (!role) return { ok: false, message: 'Warn-Rolle existiert nicht auf dem Server.' };

    // check bot can manage role
    const me = guild.members.me || await guild.members.fetch((await guild.client.users.fetch(guild.client.user.id)).id).catch(() => null);
    if (me && role.position >= me.roles.highest.position) {
      return { ok: false, message: 'Bot kann die Warn-Rolle nicht setzen (Rollen-Hierarchie).' };
    }

    // add role
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return { ok: false, message: 'Member nicht gefunden.' };
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, `Warn applied: ${warnName}`).catch(err => { throw err; });
      }
    } catch (err) {
      console.error('WarnSystem applyWarn role add error', err);
      return { ok: false, message: 'Fehler beim Hinzufügen der Rolle.' };
    }

    // store in json
    const all = this._ensureGuild(gId);
    const users = all[gId].userWarns || {};
    users[userId] = users[userId] || [];
    if (!users[userId].includes(warn.name)) users[userId].push(warn.name);
    all[gId].userWarns = users;
    this._saveAll(all);
    return { ok: true, warnName: warn.name, roleId: warn.roleId };
  }

  // reset warns for user: remove all warn-roles defined for guild and clear record
  static async resetWarns(guild, userId) {
    if (!guild || !guild.id) return { ok: false, message: 'Ungültiger Guild.' };
    const gId = guild.id;
    const all = this._loadAll();
    if (!all[gId]) return { ok: false, message: 'Keine Warn-Daten für Guild.' };

    const warnRoles = Array.isArray(all[gId].warnRoles) ? all[gId].warnRoles : [];
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return { ok: false, message: 'Member nicht gefunden.' };

    // remove roles if present
    const removed = [];
    for (const w of warnRoles) {
      try {
        const role = guild.roles.cache.get(w.roleId);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role, 'Warns reset').catch(() => {});
          removed.push(w.name);
        }
      } catch (e) {
        // ignore
      }
    }

    // clear record
    all[gId].userWarns = all[gId].userWarns || {};
    if (all[gId].userWarns[userId]) delete all[gId].userWarns[userId];
    this._saveAll(all);

    return { ok: true, removed };
  }

  // list user warns
  static getUserWarns(guildId, userId) {
    const all = this._loadAll();
    if (!all[guildId] || !all[guildId].userWarns) return [];
    return all[guildId].userWarns[userId] || [];
  }


  // systems/WarnSystem.js (am Ende der Klasse hinzufügen)

    static resetWarnList(guildId) {
    if (!guildId) {
      return { ok: false, message: 'guildId erforderlich.' };
    }
    try {
      const all = this._loadAll();
      if (!all[guildId]) {
        // nothing to do, create empty structure
        all[guildId] = { warnRoles: [], userWarns: {} };
        this._saveAll(all);
        return { ok: true, message: 'Warn-Liste geleert (war leer).', previousCount: 0 };
      }
      const prev = Array.isArray(all[guildId].warnRoles) ? all[guildId].warnRoles.length : 0;
      all[guildId].warnRoles = [];
      // keep userWarns untouched (we only clear templates)
      this._saveAll(all);
      return { ok: true, message: 'Warn-Liste geleert.', previousCount: prev };
    } catch (err) {
      console.error('WarnSystem.resetWarnList error:', err);
      return { ok: false, message: 'Fehler beim Leeren der Warn-Liste.' };
    }
  }

}
