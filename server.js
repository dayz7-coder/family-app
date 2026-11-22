require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;// Секретный ключ сервера

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==========================================
// ПРОВЕРКА ТОКЕНА (Охранник)
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: 'Нет доступа. Войдите в систему.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный или просроченный токен.' });
    req.user = user; // Теперь сервер знает, кто пришел и из какой он семьи
    next();
  });
}

// ==========================================
// РЕГИСТРАЦИЯ
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { familyName, email, password, fullName } = req.body;
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email уже занят' });

    const passwordHash = await bcrypt.hash(password, 10);
    const family = await db.createFamily(familyName);
    const user = await db.addUser({ familyId: family.id, email, passwordHash, fullName, role: 'PARENT' });

    res.status(201).json({ message: 'Семья создана', userId: user.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// ВХОД (Выдает токен)
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Неверный email или пароль' });

    // Создаем токен (пропуск)
    const token = jwt.sign(
      { id: user.id, family_id: user.family_id, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { fullName: user.full_name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// ЗАЩИЩЕННЫЕ ДАННЫЕ
// ==========================================
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Сервер БЕРЕТ family_id ИЗ ТОКЕНА, а не из ссылки!
    const users = await db.getUsersByFamily(req.user.family_id);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// СТРАНИЦЫ
// ==========================================
app.get('/', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.get('/register', (req, res) => res.sendFile(__dirname + '/public/register.html'));
app.get('/parent', (req, res) => res.sendFile(__dirname + '/public/parent.html'));

(async () => {
  await db.initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Сервер: http://localhost:${PORT}`);
  });
})();