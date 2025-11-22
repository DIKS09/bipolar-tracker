// API URL
const API_URL = 'http://localhost:3000/api';

// Переключение между вкладками
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Переключение активной вкладки
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Переключение форм
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabName}Form`).classList.add('active');
        
        // Очистка сообщений
        hideMessages();
    });
});

// Обработка формы входа
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const form = e.target;
    form.classList.add('loading');
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохранение токена и данных пользователя
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Вход выполнен успешно! Перенаправление...');
            
            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } else {
            showError(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showError('Ошибка подключения к серверу. Убедитесь, что сервер запущен.');
    } finally {
        form.classList.remove('loading');
    }
});

// Обработка формы регистрации
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // Проверка совпадения паролей
    if (password !== passwordConfirm) {
        showError('Пароли не совпадают');
        return;
    }
    
    const form = e.target;
    form.classList.add('loading');
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохранение токена и данных пользователя
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Регистрация успешна! Перенаправление...');
            
            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } else {
            if (data.errors && data.errors.length > 0) {
                showError(data.errors.map(err => err.msg).join(', '));
            } else {
                showError(data.message || 'Ошибка регистрации');
            }
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showError('Ошибка подключения к серверу. Убедитесь, что сервер запущен.');
    } finally {
        form.classList.remove('loading');
    }
});

// Показ ошибки
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// Показ успеха
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.add('show');
}

// Скрытие сообщений
function hideMessages() {
    document.getElementById('errorMessage').classList.remove('show');
    document.getElementById('successMessage').classList.remove('show');
}

// Переключение видимости пароля
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = event.target;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<span class="pink-icon">◎</span>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<span class="pink-icon">◉</span>';
    }
}

// Проверка авторизации при загрузке
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Если пользователь уже авторизован, перенаправляем на главную
        window.location.href = '/index.html';
    }
});

