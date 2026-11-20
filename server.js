// server.js — REST API для приложения "Родители и Дети"
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));   // ← добавить эту строку

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Проверка: сервер жив
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Сервер "Родители и Дети" работает',
    endpoints: [
      'GET    /api/users',
      'GET    /api/users/:id',
      'POST   /api/users',
      'DELETE /api/users/:id',
      'GET    /api/users/:id/children',
      'GET    /api/users/:id/parents',
      'POST   /api/parent-child',
      'GET    /api/parents',
      'GET    /api/children',
    ],
  });
});

// --- Все пользователи ---
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    let users = await db.getAllUsers();
    if (role) users = users.filter((u) => u.role === role.toUpperCase());
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Все родители ---
app.get('/api/parents', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users.filter((u) => u.role === 'PARENT'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Все дети ---
app.get('/api/children', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users.filter((u) => u.role === 'CHILD'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Один пользователь ---
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.getUserById(+req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Регистрация ---
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, fullName, role, birthDate } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Нужны email, password, fullName, role' });
    }

    // Простейшее "хеширование" (пока без bcrypt)
    const passwordHash = `hash_${password}`;

    const user = await db.addUser({ email, passwordHash, fullName, role, birthDate });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Удалить ---
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await db.getUserById(+req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    await db.deleteUser(+req.params.id);
    res.json({ ok: true, deleted: user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Дети родителя ---
app.get('/api/users/:id/children', async (req, res) => {
  try {
    const children = await db.getChildren(+req.params.id);
    res.json(children);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Родители ребёнка ---
app.get('/api/users/:id/parents', async (req, res) => {
  try {
    const parents = await db.getParents(+req.params.id);
    res.json(parents);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Привязать ребёнка к родителю ---
app.post('/api/parent-child', async (req, res) => {
  try {
    const { parentId, childId } = req.body;
    if (!parentId || !childId) {
      return res.status(400).json({ error: 'Нужны parentId и childId' });
    }
    await db.linkParentChild(+parentId, +childId);
    res.json({ ok: true, parentId, childId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.url} не найден` });
});

// ============================================================
// СТАРТ
// ============================================================
(async () => {
  await db.initDatabase();
  app.listen(PORT,'0.0.0.0', () => {
    console.log(`\n🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📋 Проверка:      http://localhost:${PORT}/`);
    console.log(`👨 Родители:      http://localhost:${PORT}/api/parents`);
    console.log(`🧒 Дети:          http://localhost:${PORT}/api/children\n`);
  });
})();