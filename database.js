const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'family.sqlite');
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { err ? rej(err) : res(this); }));
const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  // Таблица семей
  await run(`
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица пользователей (с паролями)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('PARENT','CHILD')),
      birth_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    )
  `);

  // Связи родитель-ребенок
  await run(`
    CREATE TABLE IF NOT EXISTS parent_child (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (parent_id, child_id)
    )
  `);
  
  console.log('✅ База данных готова');
}

// Создать семью
async function createFamily(name) {
  const res = await run(`INSERT INTO families (name) VALUES (?)`, [name]);
  return get(`SELECT * FROM families WHERE id = ?`, [res.lastID]);
}

// Добавить пользователя
async function addUser({ familyId, email, passwordHash, fullName, role, birthDate = null }) {
  const res = await run(
    `INSERT INTO users (family_id, email, password_hash, full_name, role, birth_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [familyId, email, passwordHash, fullName, role, birthDate]
  );
  return get('SELECT id, family_id, email, full_name, role, birth_date FROM users WHERE id = ?', [res.lastID]);
}

// Найти по email (для входа)
async function getUserByEmail(email) {
  return get('SELECT * FROM users WHERE email = ?', [email]);
}

// Получить всех пользователей ТОЛЬКО ОДНОЙ семьи
async function getUsersByFamily(familyId) {
  return all(`SELECT id, full_name, role, birth_date FROM users WHERE family_id = ?`, [familyId]);
}

module.exports = { db, initDatabase, createFamily, addUser, getUserByEmail, getUsersByFamily };