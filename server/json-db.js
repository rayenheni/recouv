// Minimal JSON store with a better-sqlite3-like API (preview / fallback)
const fs = require('fs');
const path = require('path');

function parseLike(pattern) {
  const esc = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
  }

  _tables() { return this.db.data; }

  run(...params) {
    const sql = this.sql;
    const data = this._tables();

    let m = sql.match(/^INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (m) {
      const table = m[1];
      const cols = m[2].split(',').map(s => s.trim());
      const row = {};
      cols.forEach((c, i) => { row[c] = params[i]; });
      data[table] = data[table] || [];
      if (table === 'admins' && data[table].some(r => r.username === row.username)) {
        this.db.save();
        return { changes: 0 };
      }
      if (table === 'site_content' && data[table].some(r => r.key === row.key)) {
        this.db.save();
        return { changes: 0 };
      }
      row.id = (data[table].reduce((a, r) => Math.max(a, r.id || 0), 0) || 0) + 1;
      if (!row.created_at) row.created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
      data[table].push(row);
      this.db.save();
      return { changes: 1, lastInsertRowid: row.id };
    }

    m = sql.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)(?:\s+ON\s+CONFLICT\((\w+)\)\s+DO\s+UPDATE\s+SET\s+value=excluded\.value)?/i);
    if (m) {
      const table = m[1];
      const cols = m[2].split(',').map(s => s.trim());
      const conflict = m[4];
      const row = {};
      cols.forEach((c, i) => { row[c] = params[i]; });
      data[table] = data[table] || [];
      if (conflict) {
        const existing = data[table].find(r => r[conflict] === row[conflict]);
        if (existing) {
          existing.value = row.value;
          this.db.save();
          return { changes: 1 };
        }
      }
      row.id = (data[table].reduce((a, r) => Math.max(a, r.id || 0), 0) || 0) + 1;
      if (!row.created_at) row.created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
      if (row.is_read === undefined && (table === 'contacts' || table === 'downloads')) row.is_read = 0;
      data[table].push(row);
      this.db.save();
      return { changes: 1, lastInsertRowid: row.id };
    }

    m = sql.match(/^UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (m) {
      const table = m[1];
      const sets = m[2].split(',').map(s => s.trim());
      const whereCol = m[3];
      const setCols = sets.map(s => s.split('=')[0].trim());
      const id = params[params.length - 1];
      const row = (data[table] || []).find(r => String(r[whereCol]) === String(id));
      if (row) {
        setCols.forEach((c, i) => { row[c] = params[i]; });
        this.db.save();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    m = sql.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (m) {
      const table = m[1];
      const col = m[2];
      const before = (data[table] || []).length;
      data[table] = (data[table] || []).filter(r => String(r[col]) !== String(params[0]));
      this.db.save();
      return { changes: before - data[table].length };
    }

    return { changes: 0 };
  }

  get(...params) {
    const rows = this.all(...params);
    return rows[0];
  }

  all(...params) {
    const sql = this.sql;
    const data = this._tables();

    let m = sql.match(/^SELECT\s+COUNT\(\*\)\s+as\s+n\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (m) {
      let rows = [...(data[m[1]] || [])];
      const where = m[2] || '';
      let pi = 0;
      if (/nom LIKE \?/.test(where)) {
        const q = parseLike(params[pi]);
        rows = rows.filter(r =>
          q.test(String(r.nom || '')) ||
          q.test(String(r.email || '')) ||
          q.test(String(r.entreprise || '')) ||
          q.test(String(r.message || r.guide || ''))
        );
        pi += 4;
      }
      if (/is_read\s*=\s*0/.test(where)) rows = rows.filter(r => !r.is_read);
      if (/is_read\s*=\s*1/.test(where)) rows = rows.filter(r => r.is_read);
      if (/created_at LIKE/.test(where)) {
        const like = parseLike(params[pi] || params[0]);
        rows = rows.filter(r => like.test(String(r.created_at || '')));
      }
      return [{ n: rows.length }];
    }

    m = sql.match(/^SELECT\s+key,\s*value\s+FROM\s+site_content/i);
    if (m) return data.site_content || [];

    m = sql.match(/^SELECT\s+(?:\*|id|[\w,\s]+)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (m) {
      return (data[m[1]] || []).filter(r => String(r[m[2]]) === String(params[0]));
    }

    m = sql.match(/^SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+1=1([\s\S]*)$/i);
    if (m) {
      const table = m[1];
      let rows = [...(data[table] || [])];
      const rest = m[2] || '';
      let pi = 0;
      if (/AND \(nom LIKE \?/.test(rest)) {
        const q = parseLike(params[pi]);
        rows = rows.filter(r =>
          q.test(String(r.nom || '')) ||
          q.test(String(r.email || '')) ||
          q.test(String(r.entreprise || '')) ||
          q.test(String(r.message || r.guide || ''))
        );
        pi += 4;
      }
      if (/AND is_read = 0/.test(rest)) rows = rows.filter(r => !r.is_read);
      if (/AND is_read = 1/.test(rest)) rows = rows.filter(r => r.is_read);
      rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      let limit = 50, offset = 0;
      if (/LIMIT \?/.test(rest)) {
        limit = params[pi++] || 50;
        if (/OFFSET \?/.test(rest)) offset = params[pi++] || 0;
      }
      return rows.slice(offset, offset + limit);
    }

    m = sql.match(/^SELECT\s+\*\s+FROM\s+(\w+)\s+ORDER BY/i);
    if (m) {
      const rows = [...(data[m[1]] || [])];
      rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      return rows;
    }

    return [];
  }
}

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { contacts: [], downloads: [], admins: [], site_content: [] };
    if (fs.existsSync(filePath)) {
      try { this.data = Object.assign(this.data, JSON.parse(fs.readFileSync(filePath, 'utf8'))); } catch {}
    }
  }
  save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
  exec(_sql) { /* schema no-op */ }
  prepare(sql) { return new Statement(this, sql); }
  transaction(fn) { return (arg) => fn(arg); }
}

module.exports = JsonDatabase;
