// src/systems/ProfileSystem.js
import fs from 'fs';
import path from 'path';
import config from '../config.js';

const DEFAULT_FILE = './data/profiles.json';

export class ProfileSystem {
  static filePath = path.resolve(process.cwd(), config.PROFILE_FILE || DEFAULT_FILE);

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
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch (err) {
      console.error('ProfileSystem: Fehler beim Laden der Datei', err);
      return {};
    }
  }

  static _saveAll(data) {
    try {
      this._ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('ProfileSystem: Fehler beim Speichern der Datei', err);
    }
  }

  // Get profile (returns object with default keys)
  static getProfile(userId) {
    const all = this._loadAll();
    const p = all[userId] || {};
    return {
      name: p.name || null,
      nickname: p.nickname || null,
      steamhex: p.steamhex || null,
      bio: p.bio || null,
      gender: p.gender || null,
      level: (typeof p.level === 'number') ? p.level : null,
      xp: (typeof p.xp === 'number') ? p.xp : null,
      em_points: (typeof p.em_points === 'number') ? p.em_points : null,
      sp_points: (typeof p.sp_points === 'number') ? p.sp_points : null,
      amp_points: (typeof p.amp_points === 'number') ? p.amp_points : null,
      rp_points: (typeof p.rp_points === 'number') ? p.rp_points : null,
      roles: Array.isArray(p.roles) ? p.roles : [],
    };
  }

  // Overwrite full profile object (only allowed fields will be saved)
  static setProfile(userId, profileObj) {
    const all = this._loadAll();
    const clean = {
      name: profileObj.name || null,
      nickname: profileObj.nickname || null,
      steamhex: profileObj.steamhex || null,
      bio: profileObj.bio || null,
      gender: profileObj.gender || null,
      level: (typeof profileObj.level === 'number') ? profileObj.level : (profileObj.level ? Number(profileObj.level) : null),
      xp: (typeof profileObj.xp === 'number') ? profileObj.xp : (profileObj.xp ? Number(profileObj.xp) : null),
      em_points: (typeof profileObj.em_points === 'number') ? profileObj.em_points : (profileObj.em_points ? Number(profileObj.em_points) : null),
      sp_points: (typeof profileObj.sp_points === 'number') ? profileObj.sp_points : (profileObj.sp_points ? Number(profileObj.sp_points) : null),
      amp_points: (typeof profileObj.amp_points === 'number') ? profileObj.amp_points : (profileObj.amp_points ? Number(profileObj.amp_points) : null),
      rp_points: (typeof profileObj.rp_points === 'number') ? profileObj.rp_points : (profileObj.rp_points ? Number(profileObj.rp_points) : null),
      roles: Array.isArray(profileObj.roles) ? profileObj.roles : (profileObj.roles ? String(profileObj.roles).split(',').map(s => s.trim()).filter(Boolean) : []),
    };
    all[userId] = clean;
    this._saveAll(all);
    return clean;
  }

  // Update partial fields (merge)
  static updateProfile(userId, partial) {
    const existing = this.getProfile(userId);
    const merged = { ...existing, ...partial };
    return this.setProfile(userId, merged);
  }

  static removeProfile(userId) {
    const all = this._loadAll();
    if (all[userId]) {
      delete all[userId];
      this._saveAll(all);
      return true;
    }
    return false;
  }
}
