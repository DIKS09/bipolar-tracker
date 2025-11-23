// API конфигурация - используем относительный путь для работы на любом домене
const API_URL = '/api';
let token = null;
let currentUser = null;
let sleepEntries = [];

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
    initializeTheme();
});

// Проверка авторизации
async function checkAuth() {
    token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Не авторизован');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        document.getElementById('userInfo').innerHTML = `<span class="pink-icon">◉</span> ${currentUser.username}`;
        
        await loadSleepData();
        updateUI();
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Инициализация обработчиков
function initializeEventListeners() {
    // Слайдеры
    const durationSlider = document.getElementById('duration');
    const qualitySlider = document.getElementById('quality');
    const interruptionsSlider = document.getElementById('interruptions');
    
    durationSlider.addEventListener('input', (e) => {
        document.getElementById('durationValue').textContent = e.target.value;
    });
    
    qualitySlider.addEventListener('input', (e) => {
        document.getElementById('qualityValue').textContent = e.target.value;
    });
    
    interruptionsSlider.addEventListener('input', (e) => {
        document.getElementById('interruptionsValue').textContent = e.target.value;
    });

    // Автоматический расчет длительности
    const bedTimeInput = document.getElementById('bedTime');
    const wakeTimeInput = document.getElementById('wakeTime');
    
    bedTimeInput.addEventListener('change', calculateDuration);
    wakeTimeInput.addEventListener('change', calculateDuration);

    // Сохранение
    document.getElementById('saveSleep').addEventListener('click', saveSleep);
    
    // Выход
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Расчет длительности сна
function calculateDuration() {
    const bedTime = document.getElementById('bedTime').value;
    const wakeTime = document.getElementById('wakeTime').value;
    
    if (!bedTime || !wakeTime) return;
    
    const [bedHour, bedMin] = bedTime.split(':').map(Number);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    
    let bedMinutes = bedHour * 60 + bedMin;
    let wakeMinutes = wakeHour * 60 + wakeMin;
    
    // Если проснулись раньше чем легли (сон через полночь)
    if (wakeMinutes < bedMinutes) {
        wakeMinutes += 24 * 60;
    }
    
    const duration = (wakeMinutes - bedMinutes) / 60;
    const roundedDuration = Math.round(duration * 2) / 2; // Округление до 0.5
    
    document.getElementById('duration').value = Math.min(12, roundedDuration);
    document.getElementById('durationValue').textContent = Math.min(12, roundedDuration);
}

// Сохранение записи сна
async function saveSleep() {
    const bedTime = document.getElementById('bedTime').value;
    const wakeTime = document.getElementById('wakeTime').value;
    const duration = parseFloat(document.getElementById('duration').value);
    const quality = parseInt(document.getElementById('quality').value);
    const interruptions = parseInt(document.getElementById('interruptions').value);
    const feltRested = document.getElementById('feltRested').checked;
    const notes = document.getElementById('sleepNotes').value.trim();

    if (!bedTime || !wakeTime) {
        showNotification('Пожалуйста, укажите время сна и пробуждения', 'error');
        return;
    }

    const sleepData = {
        bedTime,
        wakeTime,
        duration,
        quality,
        interruptions,
        feltRested,
        notes,
        date: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/sleep`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sleepData)
        });

        const data = await response.json();

        if (data.success) {
            // Сброс формы
            document.getElementById('bedTime').value = '';
            document.getElementById('wakeTime').value = '';
            document.getElementById('duration').value = 8;
            document.getElementById('durationValue').textContent = '8';
            document.getElementById('quality').value = 5;
            document.getElementById('qualityValue').textContent = '5';
            document.getElementById('interruptions').value = 0;
            document.getElementById('interruptionsValue').textContent = '0';
            document.getElementById('feltRested').checked = false;
            document.getElementById('sleepNotes').value = '';

            await loadSleepData();
            updateUI();
            showNotification('Запись сна сохранена!', 'success');
        } else {
            showNotification(data.message || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Загрузка данных сна
async function loadSleepData() {
    try {
        const response = await fetch(`${API_URL}/sleep`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            sleepEntries = data.data;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Обновление UI
function updateUI() {
    updateStats();
    renderSleepList();
    drawSleepChart();
}

// Обновление статистики
async function updateStats() {
    try {
        const response = await fetch(`${API_URL}/sleep/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('avgDuration').textContent = data.data.avgDuration;
            document.getElementById('avgQuality').textContent = data.data.avgQuality;
            document.getElementById('avgInterruptions').textContent = data.data.avgInterruptions;
            document.getElementById('totalSleep').textContent = data.data.totalEntries;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Отрисовка списка записей
function renderSleepList() {
    const container = document.getElementById('sleepList');
    
    if (sleepEntries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><span class="pink-icon">✎</span> Пока нет записей. Добавьте первую запись выше!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sleepEntries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = formatDate(date);
        const qualityColor = entry.quality >= 7 ? '#4CAF50' : entry.quality >= 4 ? '#FFC107' : '#f44336';
        
        return `
            <div class="entry-item" style="border-left-color: ${qualityColor};">
                <div class="entry-header">
                    <div class="entry-mood">
                        <span style="font-size: 1.5rem;">${entry.feltRested ? '😊' : '😴'}</span>
                        <span><strong>${entry.duration}ч сна</strong></span>
                    </div>
                    <div class="entry-date">${formattedDate}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                    <div>
                        <small style="color: var(--text-light);">Время сна</small>
                        <div><strong>${entry.bedTime} - ${entry.wakeTime}</strong></div>
                    </div>
                    <div>
                        <small style="color: var(--text-light);">Качество</small>
                        <div><strong>${entry.quality}/10</strong></div>
                    </div>
                    <div>
                        <small style="color: var(--text-light);">Пробуждений</small>
                        <div><strong>${entry.interruptions}</strong></div>
                    </div>
                </div>
                ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ''}
                <button class="entry-delete" onclick="deleteSleep('${entry._id}')"><span class="pink-icon">✕</span> Удалить</button>
            </div>
        `;
    }).join('');
}

// Удаление записи
async function deleteSleep(id) {
    if (!confirm('Удалить эту запись?')) return;

    try {
        const response = await fetch(`${API_URL}/sleep/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            await loadSleepData();
            updateUI();
            showNotification('Запись удалена', 'info');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification('Ошибка удаления', 'error');
    }
}

// Рисование графика
function drawSleepChart() {
    const canvas = document.getElementById('sleepChart');
    const ctx = canvas.getContext('2d');
    
    const container = document.getElementById('chartContainer');
    canvas.width = container.clientWidth - 40;
    canvas.height = 300;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (sleepEntries.length === 0) {
        ctx.fillStyle = '#8B8B8B';
        ctx.font = '16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Нет данных для отображения', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Последние 14 дней
    const days = 14;
    const dataPoints = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayEntries = sleepEntries.filter(e => {
            const entryDate = new Date(e.date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === date.getTime();
        });
        
        if (dayEntries.length > 0) {
            const entry = dayEntries[0];
            dataPoints.push({
                date: date,
                duration: entry.duration,
                quality: entry.quality
            });
        } else {
            dataPoints.push({
                date: date,
                duration: null,
                quality: null
            });
        }
    }
    
    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const stepX = chartWidth / (days - 1);
    
    // Оси
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // Метки Y
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 12; i += 2) {
        const y = canvas.height - padding - (i / 12) * chartHeight;
        ctx.fillText(i + 'ч', padding - 10, y + 5);
    }
    
    const validPoints = dataPoints.filter(p => p.duration !== null);
    
    if (validPoints.length > 0) {
        // Линия длительности
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FF69B4';
        
        validPoints.forEach((point, index) => {
            const pointIndex = dataPoints.indexOf(point);
            const x = padding + pointIndex * stepX;
            const y = canvas.height - padding - (point.duration / 12) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Точки
        validPoints.forEach(point => {
            const pointIndex = dataPoints.indexOf(point);
            const x = padding + pointIndex * stepX;
            const y = canvas.height - padding - (point.duration / 12) * chartHeight;
            
            const qualityColor = point.quality >= 7 ? '#4CAF50' : point.quality >= 4 ? '#FFC107' : '#f44336';
            
            ctx.fillStyle = qualityColor;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
    
    // Метки дат
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < days; i += 2) {
        const x = padding + i * stepX;
        const date = dataPoints[i].date;
        const label = date.getDate() + '.' + (date.getMonth() + 1);
        ctx.fillText(label, x, canvas.height - padding + 20);
    }
}

// Форматирование даты
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return 'Сегодня';
    } else if (days === 1) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
    }
}

// Выход
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 20px 30px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.25);
        z-index: 1000;
        animation: slideInRight 0.4s ease-out;
        border-left: 5px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#FF69B4'};
        max-width: 300px;
        font-weight: 600;
        color: #4A4A4A;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s ease-out';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Инициализация темной темы
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeIcon').textContent = '☀️';
    }
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Обновление графика при изменении размера окна
window.addEventListener('resize', () => {
    drawSleepChart();
});

