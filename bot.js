const TelegramBot = require('node-telegram-bot-api');

// ==========================================
// 1. НАСТРОЙКИ
// ==========================================
const TOKEN = '9205995875:AAEW_IfAAV7j5ppTPaMcV8Btrsvu2SHayU8'; // <-- ОБЯЗАТЕЛЬНО ВСТАВЬ СВОЙ ТОКЕН
const WEBAPP_URL = 'https://family-app.layero.app';

// Вспомогательная функция для паузы
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 2. ИНИЦИАЛИЗАЦИЯ БОТА
// ==========================================
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 Бот успешно запущен и слушает команды...');

// ==========================================
// 3. НАСТРОЙКА МЕНЮ КОМАНД
// ==========================================
bot.setMyCommands([
  { command: 'start', description: 'Приветствие и запуск' },
  { command: 'help', description: 'Список всех команд' },
  { command: 'app', description: 'Открыть семейное приложение' },
  { command: 'users', description: 'Показать всех пользователей из базы' }
]).then(() => {
  console.log('✅ Меню команд в Telegram обновлено.');
}).catch((err) => {
  console.error('⚠️ Ошибка при настройке меню:', err.message);
});
// Настраиваем кнопку меню как "Список команд"
bot.setChatMenuButton({
  menu_button: {
    type: 'commands' // <-- Это говорит Telegram: "Показывай кнопку со списком команд"
  }
}).then(() => {
  console.log('✅ Кнопка меню команд настроена');
}).catch((err) => {
  console.error('Ошибка настройки кнопки:', err.message);
});

// ==========================================
// 4. ОБРАБОТЧИКИ КОМАНД
// ==========================================

// Команда /start
// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Отправляем сообщение с кнопкой
    await bot.sendMessage(chatId, '👋 Добро пожаловать в семейное приложение!\n\nЗдесь вы можете управлять списком семьи, добавлять детей и родителей.\n\nЧто умеет бот:\n/app — открыть приложение\n/users — посмотреть всех из базы\n/help — справка\n\nНажми на кнопку ниже, чтобы начать 👇', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👨‍👩‍👧‍👦 Открыть приложение', web_app: { url: WEBAPP_URL } }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка в /start:', error.message);
  }
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const text = 'Доступные команды:\n' +
    '/start — приветствие\n' +
    '/app — открыть сайт\n' +
    '/users — показать список пользователей\n' +
    '/help — эта справка';
  
  await bot.sendMessage(chatId, text);
});

// Команда /app
bot.onText(/\/app/, async (msg) => {  
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, 'Нажми на кнопку ниже, чтобы открыть приложение:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👨‍👩‍👧‍👦 Открыть сайт', web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
});

// Команда /users (запрос к базе данных на Layero)
bot.onText(/\/users/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Показываем статус "печатает..."
    await bot.sendChatAction(chatId, 'typing');
    
    // Делаем запрос к API твоего сайта
    const res = await fetch(`${WEBAPP_URL}/api/users`);
    
    if (!res.ok) {
      throw new Error(`Сервер вернул статус ${res.status}`);
    }
    
    const users = await res.json();

    if (users.length === 0) {
      return await bot.sendMessage(chatId, 'В базе пока нет пользователей.');
    }

    // Формируем красивый список
    let text = '👥 *Пользователи в базе:*\n\n';
    users.forEach(u => {
      const role = u.role === 'PARENT' ? '👨 Родитель' : '🧒 Ребёнок';
      text += `ID: ${u.id} | ${u.full_name} (${role})\n`;
    });

    // Отправляем (Markdown делает текст жирным)
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Ошибка при запросе /users:', error.message);
    await bot.sendMessage(chatId, '❌ Не удалось загрузить данные. Возможно, сервер Layero спит или выдал ошибку.');
  }
});

// ==========================================
// 5. ОБРАБОТКА ОБЫЧНЫХ СООБЩЕНИЙ
// ==========================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Если это команда (начинается с /), игнорируем, так как её обработали выше
  if (!text || text.startsWith('/')) return;

  // Если пользователь написал просто текст
  await bot.sendMessage(chatId, `Вы написали: "${text}".\nЧтобы открыть меню, введите /help`);
});

// Обработка ошибок polling (чтобы бот не падал при сбоях сети)
bot.on('polling_error', (error) => {
  console.error('⚠️ Ошибка сети (polling):', error.message);
});