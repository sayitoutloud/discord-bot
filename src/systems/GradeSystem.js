import fs from 'fs';
import config from '../config.js';

const gradeFile = config.GRADE_FILE || './data/grades.json';

export class GradeSystem {
  /**
   * Stellt sicher, dass Datei existiert
   */
  static ensureFile() {
    if (!fs.existsSync(gradeFile)) {
      fs.mkdirSync('./data', { recursive: true });
      fs.writeFileSync(gradeFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Lade alle Grades aus Datei
   */
  static loadGrades() {
    this.ensureFile();
    const raw = fs.readFileSync(gradeFile, 'utf8');
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Speichere alle Grades
   */
  static saveGrades(grades) {
    this.ensureFile();
    fs.writeFileSync(gradeFile, JSON.stringify(grades, null, 2));
  }

  /**
   * Gibt sortierte Liste (1..N)
   */
  static listGrades() {
    const grades = this.loadGrades();
    return grades.sort((a, b) => a.number - b.number);
  }

  /**
   * Fügt eine neue Grade hinzu
   */
  static addGrade(roleId, roleName, shortcut, number = null) {
    const grades = this.listGrades();

    // Shortcut darf nicht doppelt sein
    if (
    grades.find(
        (g) =>
        g.shortcut &&
        shortcut &&
        g.shortcut.toLowerCase() === shortcut.toLowerCase()
    )
    ) {
    throw new Error('Shortcut already exists');
    }


    // Falls keine Zahl angegeben → automatisch nächste Nummer
    if (!number || isNaN(number)) {
      number = grades.length > 0 ? grades[grades.length - 1].number + 1 : 1;
    } else {
      number = parseInt(number);
      // Wenn die Nummer schon existiert → alles ab dieser Nummer nach hinten verschieben
      const index = grades.findIndex((g) => g.number === number);
      if (index !== -1) {
        for (let i = grades.length - 1; i >= index; i--) {
          grades[i].number++;
        }
      }
    }

    // Neues Grade-Objekt
    const newGrade = {
      roleId: String(roleId),
      roleName,
      shortcut,
      number,
    };

    grades.push(newGrade);
    const sorted = grades.sort((a, b) => a.number - b.number);
    this.saveGrades(sorted);
    return newGrade;
  }

  /**
   * Entferne eine Grade anhand Nummer
   */
  static removeGrade(number) {
    let grades = this.listGrades();
    const index = grades.findIndex((g) => g.number === parseInt(number));
    if (index === -1) throw new Error('Grade not found');
    grades.splice(index, 1);

    // Neu nummerieren, damit keine Lücken entstehen
    grades = grades.map((g, i) => ({ ...g, number: i + 1 }));
    this.saveGrades(grades);
  }

  /**
   * Alle Grades entfernen
   */
  static removeAllGrades() {
    this.saveGrades([]);
  }

  /**
   * === Neue Methoden für Rank-System ===
   */

  /**
   * Gibt alle Grades sortiert (1..N) zurück
   */
  static getAllGrades() {
    return this.listGrades();
  }

  /**
   * Suche Grade anhand roleId
   */
  static findGradeByRoleId(roleId) {
    const list = this.getAllGrades();
    return list.find((g) => String(g.roleId) === String(roleId)) || null;
  }

  /**
   * Finde aktuelle Grade eines Members
   */
  static findMemberGrade(member) {
    const list = this.getAllGrades(); // 1..N
    for (const g of list) {
      if (member.roles.cache.has(g.roleId)) return g;
    }
    return null;
  }

  /**
   * Gib die Grade "oben" (höher) zurück: number - 1
   */
  static getHigherGrade(currentGrade) {
    if (!currentGrade) return null;
    const targetNumber = Number(currentGrade.number) - 1;
    if (targetNumber < 1) return null;
    return this.getAllGrades().find((g) => g.number === targetNumber) || null;
  }

  /**
   * Gib die Grade "unten" (tiefer) zurück: number + 1
   */
  static getLowerGrade(currentGrade) {
    if (!currentGrade) return null;
    const targetNumber = Number(currentGrade.number) + 1;
    return this.getAllGrades().find((g) => g.number === targetNumber) || null;
  }

  /**
   * Entfernt alle grade-roles vom Member
   */
  static async removeAllGradeRolesFromMember(member) {
    const list = this.getAllGrades();
    const roleIds = list.map((g) => g.roleId);
    const toRemove = roleIds.filter((id) => member.roles.cache.has(id));
    if (toRemove.length === 0) return [];
    await member.roles.remove(toRemove, 'Cleaning grade roles before changing grade').catch(() => {});
    return toRemove;
  }

  /**
   * Setzt einem Member die gegebene Grade und passt Prefix an
   */
  static async applyGradeToMember(member, grade, invoker = null) {
    if (!grade) return { ok: false, message: 'Keine Grade angegeben.' };

    const guild = member.guild;
    const me = await guild.members.fetch(member.client.user.id).catch(() => null);
    if (!me) return { ok: false, message: 'Bot Member nicht findbar.' };

    // Check ManageRoles
    if (!me.permissions.has('ManageRoles')) {
      return { ok: false, message: 'Bot benötigt Manage Roles Rechte.' };
    }

    const targetRole = guild.roles.cache.get(grade.roleId);
    if (!targetRole) return { ok: false, message: 'Ziel-Rolle existiert nicht mehr.' };
    if (targetRole.position >= me.roles.highest.position) {
      return { ok: false, message: 'Bot kann die Ziel-Rolle nicht setzen (Rollen-Hierarchie).' };
    }

    // Alte Grade-Rollen entfernen
    await this.removeAllGradeRolesFromMember(member);

    // Neue hinzufügen
    try {
      await member.roles.add(targetRole, 'Grade changed via rank command');
    } catch {
      return { ok: false, message: 'Fehler beim Hinzufügen der Rolle.' };
    }

    // Nickname ändern
    const currentNick = member.nickname || member.user.username || '';
    const bare = currentNick.replace(/^\[[^\]]+\]\s*/, ''); // alten Prefix entfernen
    const newNick = `[${grade.shortcut}] ${bare}`.slice(0, 32); // Discord limit

    if (
      me.permissions.has('ManageNicknames') &&
      me.roles.highest.position > member.roles.highest.position
    ) {
      try {
        await member.setNickname(newNick, 'Grade prefix set');
      } catch {
        // Ignorieren, kein Fatalfehler
      }
    }

    return { ok: true, message: 'Grade applied.' };
  }
}
