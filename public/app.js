// app.js — логика веб-страницы
const API = '';  // пустая строка = тот же сервер (localhost:3000)

let currentFilter = '';

// ===== Загрузка пользователей =====
async function loadUsers() {
  const list = document.getElementById('users-list');
  try {
    const url = currentFilter ? `${API}/api/users?role=${currentFilter}` : `${API}/api/users`;
    const users = await (await fetch(url)).json();

    if (!users.length) {
      list.innerHTML = '<p style="color:#7a8398;padding:1rem">Нет пользователей</p>';
    } else {
      list.innerHTML = users.map((u) => `
        <div class="user">
          <div class="user-info">
            <strong>${escapeHtml(u.full_name)}</strong>
            <small>${escapeHtml(u.email)}${u.birth_date ? ' · ' + u.birth_date : ''}</small>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span class="badge ${u.role}">${u.role === 'PARENT' ? '👨 Родитель' : '🧒 Ребёнок'}</span>
            <button class="del" onclick="deleteUser(${u.id})">Удалить</button>
          </div>
        </div>
      `).join('');
    }

    // обновляем селекты в форме связей
    updateSelects(users);
  } catch (e) {
    list.innerHTML = `<p class="err">Ошибка загрузки: ${e.message}</p>`;
  }
}

// ===== Селекты родитель/ребёнок =====
async function updateSelects() {
  const users = await (await fetch(`${API}/api/users`)).json();

  const parentSel = document.getElementById('parentSelect');
  const childSel  = document.getElementById('childSelect');

  parentSel.innerHTML = '<option value="">Выберите родителя</option>';
  childSel.innerHTML  = '<option value="">Выберите ребёнка</option>';

  users.filter(u => u.role === 'PARENT').forEach(u => {
    parentSel.innerHTML += `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`;
  });
  users.filter(u => u.role === 'CHILD').forEach(u => {
    childSel.innerHTML += `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`;
  });
}

// ===== Дерево =====
async function loadTree() {
  const tree = document.getElementById('tree');
  try {
    const users = await (await fetch(`${API}/api/users`)).json();
    const parents = users.filter(u => u.role === 'PARENT');

    if (!parents.length) {
      tree.innerHTML = '<p style="color:#7a8398">Нет родителей</p>';
      return;
    }

    const html = await Promise.all(parents.map(async (p) => {
      const children = await (await fetch(`${API}/api/users/${p.id}/children`)).json();
      const kidsHtml = children.length
        ? children.map(c => `<div class="tree-child">🧒 ${escapeHtml(c.full_name)}</div>`).join('')
        : '<div class="tree-child" style="color:#aaa">нет детей</div>';
      return `<div class="tree-parent"><h3>👨 ${escapeHtml(p.full_name)}</h3>${kidsHtml}</div>`;
    }));

    tree.innerHTML = html.join('');
  } catch (e) {
    tree.innerHTML = `<p class="err">Ошибка: ${e.message}</p>`;
  }
}

// ===== Добавить пользователя =====
document.getElementById('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('form-msg');
  msg.textContent = 'Отправка...';
  msg.className = '';

  const body = {
    email:     document.getElementById('email').value,
    password:  document.getElementById('password').value,
    fullName:  document.getElementById('fullName').value,
    role:      document.getElementById('role').value,
    birthDate: document.getElementById('birthDate').value || null,
  };

  try {
    const res = await fetch(`${API}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка');

    msg.textContent = '✅ Пользователь добавлен';
    msg.className = 'ok';
    e.target.reset();
    await loadUsers();
    await loadTree();
  } catch (err) {
    msg.textContent = '❌ ' + err.message;
    msg.className = 'err';
  }
});

// ===== Привязать =====
document.getElementById('link-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('link-msg');
  msg.textContent = '...';

  const parentId = document.getElementById('parentSelect').value;
  const childId  = document.getElementById('childSelect').value;

  try {
    const res = await fetch(`${API}/api/parent-child`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: +parentId, childId: +childId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка');

    msg.textContent = '✅ Связь создана';
    msg.className = 'ok';
    await loadTree();
  } catch (err) {
    msg.textContent = '❌ ' + err.message;
    msg.className = 'err';
  }
});

// ===== Удалить =====
async function deleteUser(id) {
  if (!confirm('Удалить пользователя?')) return;
  try {
    await fetch(`${API}/api/users/${id}`, { method: 'DELETE' });
    await loadUsers();
    await loadTree();
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

// ===== Табы =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.role;
    loadUsers();
  });
});

// ===== Проверка сервера =====
async function checkServer() {
  const el = document.getElementById('api-status');
  try {
    const r = await fetch(`${API}/`);
    el.textContent = r.ok ? '✅ онлайн' : '❌ ошибка';
    el.style.color = r.ok ? '#0a8f3c' : '#c0392b';
  } catch {
    el.textContent = '❌ оффлайн';
    el.style.color = '#c0392b';
  }
}

// ===== Утилита =====
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ===== Старт =====
checkServer();
loadUsers();
loadTree();