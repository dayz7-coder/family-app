// database.js — работа с БД
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'family.sqlite');
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('PARENT','CHILD')),
      birth_date    TEXT,
      created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS parent_child (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      child_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (parent_id, child_id),
      CHECK (parent_id <> child_id)
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_pc_parent ON parent_child(parent_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_pc_child  ON parent_child(child_id)`);
}

// ===== Операции =====
async function addUser({ email, passwordHash, fullName, role, birthDate = null }) {
  if (!['PARENT', 'CHILD'].includes(role)) {
    throw new Error('role должен быть PARENT или CHILD');
  }
  const res = await run(
    `INSERT INTO users (email, password_hash, full_name, role, birth_date)
     VALUES (?, ?, ?, ?, ?)`,
    [email, passwordHash, fullName, role, birthDate]
  );
  return get('SELECT id, email, full_name, role, birth_date, created_at FROM users WHERE id = ?', [res.lastID]);
}

async function linkParentChild(parentId, childId) {
  const parent = await get('SELECT role FROM users WHERE id = ?', [parentId]);
  const child  = await get('SELECT role FROM users WHERE id = ?', [childId]);

  if (!parent || !child) throw new Error('Пользователь не найден');
  if (parent.role !== 'PARENT') throw new Error('parentId должен иметь role=PARENT');
  if (child.role !== 'CHILD')   throw new Error('childId должен иметь role=CHILD');

  await run(
    `INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)`,
    [parentId, childId]
  );
}

function getChildren(parentId) {
  return all(
    `SELECT u.id, u.full_name, u.birth_date
     FROM parent_child pc
     JOIN users u ON u.id = pc.child_id
     WHERE pc.parent_id = ?
     ORDER BY u.id`,
    [parentId]
  );
}

function getParents(childId) {
  return all(
    `SELECT u.id, u.full_name
     FROM parent_child pc
     JOIN users u ON u.id = pc.parent_id
     WHERE pc.child_id = ?
     ORDER BY u.id`,
    [childId]
  );
}

function getAllUsers() {
  return all('SELECT id, email, full_name, role, birth_date, created_at FROM users ORDER BY id');
}

function getUserById(id) {
  return get('SELECT id, email, full_name, role, birth_date, created_at FROM users WHERE id = ?', [id]);
}

function getUserByEmail(email) {
  return get('SELECT * FROM users WHERE email = ?', [email]);
}

async function deleteUser(id) {
  await run('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = {
  db,
  initDatabase,
  addUser,
  linkParentChild,
  getChildren,
  getParents,
  getAllUsers,
  getUserById,
  getUserByEmail,
  deleteUser,
};