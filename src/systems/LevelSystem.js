// src/systems/LevelSystem.js
import fs from 'fs';
import path from 'path';
import config from '../config.js';

const DEFAULT_FILE = './data/levels.json';

export class LevelSystem {
  static filePath = path.resolve(process.cwd(), config.LEVEL_FILE || DEFAULT_FILE);

  // ensure data file exists
  static _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
  }

  // load all records (object: userId -> { lvl, xp })
  static _loadAll() {
    try {
      this._ensureFile();
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (err) {
      console.error('LevelSystem load error', err);
      return {};
    }
  }

  static _saveAll(obj) {
    try {
      this._ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('LevelSystem save error', err);
    }
  }

  // get user's record (default lvl 0 xp 0)
  static getUser(userId) {
    const all = this._loadAll();
    if (!all[userId]) {
      all[userId] = { lvl: 0, xp: 0 };
      this._saveAll(all);
    }
    return all[userId];
  }

  // set user's record
  static setUser(userId, record) {
    const all = this._loadAll();
    all[userId] = { lvl: Number(record.lvl || 0), xp: Number(record.xp || 0) };
    // clamp xp to 0..99 (we store xp < 100)
    if (all[userId].xp < 0) all[userId].xp = 0;
    if (all[userId].xp >= 100) all[userId].xp = all[userId].xp % 100;
    this._saveAll(all);
  }

  // add XP (count may be 0..100)
  // returns object { ok: true, before: {...}, after: {...}, leveled: n } or { ok:false, message }
  static addXP(userId, count) {
    if (!Number.isFinite(count)) return { ok: false, message: 'Ungültige XP Anzahl.' };
    count = Math.floor(Number(count));
    if (count < 0) return { ok: false, message: 'Count muss >= 0 sein.' };
    if (count > 100) return { ok: false, message: 'Count darf maximal 100 sein.' };

    const all = this._loadAll();
    const orig = all[userId] ? { lvl: Number(all[userId].lvl), xp: Number(all[userId].xp) } : { lvl: 0, xp: 0 };
    let totalXP = orig.xp + count;
    let levelUps = 0;
    let lvl = orig.lvl;

    // every 100 xp => +1 level
    if (totalXP >= 100) {
      levelUps = Math.floor(totalXP / 100);
      lvl = lvl + levelUps;
      totalXP = totalXP % 100;
    }

    all[userId] = { lvl, xp: totalXP };
    this._saveAll(all);

    return { ok: true, before: orig, after: { lvl, xp: totalXP }, leveled: levelUps };
  }

  // remove XP (count 0..100)
  // if remove more xp than current, decrease level(s) appropriately but not below 0
  // returns { ok:true, before, after, levelDowns } or { ok:false }
  static removeXP(userId, count) {
    if (!Number.isFinite(count)) return { ok: false, message: 'Ungültige XP Anzahl.' };
    count = Math.floor(Number(count));
    if (count < 0) return { ok: false, message: 'Count muss >= 0 sein.' };
    if (count > 100) return { ok: false, message: 'Count darf maximal 100 sein.' };

    const all = this._loadAll();
    const orig = all[userId] ? { lvl: Number(all[userId].lvl), xp: Number(all[userId].xp) } : { lvl: 0, xp: 0 };

    let totalXP = orig.lvl * 100 + orig.xp; // represent total xp
    let newTotal = totalXP - count;
    if (newTotal < 0) newTotal = 0;
    const newLvl = Math.floor(newTotal / 100);
    const newXp = newTotal % 100;

    const levelDowns = orig.lvl - newLvl;

    all[userId] = { lvl: newLvl, xp: newXp };
    this._saveAll(all);

    return { ok: true, before: orig, after: { lvl: newLvl, xp: newXp }, levelDowns };
  }

  // get many users? not needed now

  // utility: progress bar string (length default 12)
  static progressBar(xp, size = 12) {
    const pct = Math.max(0, Math.min(99, Number(xp))) / 100;
    const filled = Math.round(pct * size);
    const empty = size - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentText = `${Math.round(pct * 100)}%`;
    return { bar, percentText };
  }
}
