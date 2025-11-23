// API конфигурация - используем относительный путь для работы на любом домене
const API_URL = '/api';
let currentMood = null;
let currentFilter = 'all';
let entries = [];
let token = null;
let currentUser = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
    initializeTheme();
    initializeReminders();
    checkAlerts();
});

// Проверка авторизации
async function checkAuth() {
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
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
        
        // Показать имя пользователя
        document.getElementById('userInfo').innerHTML = `<span class="pink-icon">◉</span> ${currentUser.username}`;
        
        // Загрузить данные
        await loadEntries();
        updateUI();
        drawChart();
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Выбор настроения
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMood = btn.dataset.mood;
        });
    });

    // Слайдер интенсивности
    const intensitySlider = document.getElementById('intensity');
    const intensityValue = document.querySelector('.intensity-value');
    
    intensitySlider.addEventListener('input', (e) => {
        intensityValue.textContent = e.target.value;
        intensityValue.style.transform = 'scale(1.2)';
        setTimeout(() => {
            intensityValue.style.transform = 'scale(1)';
        }, 200);
    });

    // Сохранение записи
    document.getElementById('saveEntry').addEventListener('click', saveEntry);

    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderEntries();
        });
    });

    // Экспорт данных
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Выход
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Сохранение новой записи
async function saveEntry() {
    if (!currentMood) {
        showNotification('Пожалуйста, выберите ваше настроение', 'error');
        return;
    }

    const intensity = document.getElementById('intensity').value;
    const notes = document.getElementById('notes').value.trim();

    const entryData = {
        mood: currentMood,
        intensity: parseInt(intensity),
        notes: notes,
        date: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entryData)
        });

        const data = await response.json();

        if (data.success) {
            // Сброс формы
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('intensity').value = 5;
            document.querySelector('.intensity-value').textContent = '5';
            document.getElementById('notes').value = '';
            currentMood = null;

            await loadEntries();
            updateUI();
            showNotification('Запись успешно сохранена!', 'success');
        } else {
            showNotification(data.message || 'Ошибка сохранения записи', 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения записи:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Загрузка записей с сервера
async function loadEntries() {
    try {
        const response = await fetch(`${API_URL}/entries`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            entries = data.data;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки записей:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Обновление UI
function updateUI() {
    updateStats();
    renderEntries();
    drawChart();
    analyzePatterns();
}

// Обновление статистики
function updateStats() {
    const depressiveCount = entries.filter(e => e.mood === 'depressive').length;
    const interfaseCount = entries.filter(e => e.mood === 'interfase').length;
    const manicCount = entries.filter(e => e.mood === 'manic').length;
    const totalDays = entries.length;

    animateValue('depressiveCount', depressiveCount);
    animateValue('interfaseCount', interfaseCount);
    animateValue('manicCount', manicCount);
    animateValue('totalDays', totalDays);
}

// Анимация чисел
function animateValue(id, target) {
    const element = document.getElementById(id);
    const current = parseInt(element.textContent) || 0;
    const increment = target > current ? 1 : -1;
    const duration = 500;
    const steps = Math.abs(target - current);
    
    if (steps === 0) return;
    
    const stepDuration = duration / steps;

    let currentValue = current;
    const timer = setInterval(() => {
        currentValue += increment;
        element.textContent = currentValue;
        
        if (currentValue === target) {
            clearInterval(timer);
        }
    }, stepDuration);
}

// Отрисовка списка записей
function renderEntries() {
    const container = document.getElementById('entriesList');
    
    let filteredEntries = entries;
    if (currentFilter !== 'all') {
        filteredEntries = entries.filter(e => e.mood === currentFilter);
    }

    if (filteredEntries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><span class="pink-icon">✎</span> ${currentFilter === 'all' ? 'Пока нет записей. Добавьте первую запись выше!' : 'Нет записей для выбранного фильтра'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredEntries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = formatDate(date);
        const moodInfo = getMoodInfo(entry.mood);
        
        return `
            <div class="entry-item ${entry.mood}">
                <div class="entry-header">
                    <div class="entry-mood">
                        <span class="pink-icon">${moodInfo.icon}</span>
                        <span>${moodInfo.label}</span>
                    </div>
                    <div class="entry-date">${formattedDate}</div>
                </div>
                <div class="entry-intensity">
                    <span>Интенсивность:</span>
                    <div class="intensity-bar">
                        <div class="intensity-fill" style="width: ${entry.intensity * 10}%"></div>
                    </div>
                    <span><strong>${entry.intensity}/10</strong></span>
                </div>
                ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ''}
                <button class="entry-delete" onclick="deleteEntry('${entry._id}')"><span class="pink-icon">✕</span> Удалить</button>
            </div>
        `;
    }).join('');
}

// Получение информации о настроении
function getMoodInfo(mood) {
    const moodMap = {
        'depressive': { icon: '🌧️', label: 'Депрессивная фаза' },
        'interfase': { icon: '🌤️', label: 'Интерфаза' },
        'manic': { icon: '⚡', label: 'Маниакальная фаза' }
    };
    return moodMap[mood];
}

// Форматирование даты
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Удаление записи
async function deleteEntry(id) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/entries/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            await loadEntries();
            updateUI();
            showNotification('Запись удалена', 'info');
        } else {
            showNotification(data.message || 'Ошибка удаления записи', 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Рисование графика
function drawChart() {
    const canvas = document.getElementById('moodChart');
    const ctx = canvas.getContext('2d');
    
    // Установка размеров canvas
    const container = document.getElementById('chartContainer');
    canvas.width = container.clientWidth - 40;
    canvas.height = 300;
    
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (entries.length === 0) {
        ctx.fillStyle = '#8B8B8B';
        ctx.font = '16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Нет данных для отображения', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Подготовка данных (последние 30 дней)
    const days = 30;
    const dataPoints = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayEntries = entries.filter(e => {
            const entryDate = new Date(e.date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === date.getTime();
        });
        
        if (dayEntries.length > 0) {
            // Среднее значение за день
            const avgIntensity = dayEntries.reduce((sum, e) => {
                let value = e.intensity;
                if (e.mood === 'depressive') value = -value;
                else if (e.mood === 'interfase') value = 0;
                return sum + value;
            }, 0) / dayEntries.length;
            
            dataPoints.push({
                date: date,
                value: avgIntensity,
                mood: dayEntries[0].mood
            });
        } else {
            dataPoints.push({
                date: date,
                value: null,
                mood: null
            });
        }
    }
    
    // Настройки графика
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const stepX = chartWidth / (days - 1);
    
    // Отрисовка осей
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    
    // Ось X
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Ось Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // Центральная линия (интерфаза)
    ctx.strokeStyle = '#C8E6C9';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height / 2);
    ctx.lineTo(canvas.width - padding, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Метки на оси Y
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText('Мания +10', padding - 10, padding + 10);
    ctx.fillText('Интерфаза 0', padding - 10, canvas.height / 2);
    ctx.fillText('Депрессия -10', padding - 10, canvas.height - padding - 5);
    
    // Отрисовка данных
    const validPoints = dataPoints.filter(p => p.value !== null);
    
    if (validPoints.length > 0) {
        // Линия графика
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FF69B4';
        
        validPoints.forEach((point, index) => {
            const pointIndex = dataPoints.indexOf(point);
            const x = padding + pointIndex * stepX;
            const y = canvas.height / 2 - (point.value / 10) * (chartHeight / 2);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Точки на графике
        validPoints.forEach(point => {
            const pointIndex = dataPoints.indexOf(point);
            const x = padding + pointIndex * stepX;
            const y = canvas.height / 2 - (point.value / 10) * (chartHeight / 2);
            
            let color = '#C8E6C9';
            if (point.mood === 'depressive') color = '#A8C7E7';
            else if (point.mood === 'manic') color = '#FFE082';
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
    
    // Метки дат (каждые 5 дней)
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < days; i += 5) {
        const x = padding + i * stepX;
        const date = dataPoints[i].date;
        const label = date.getDate() + '.' + (date.getMonth() + 1);
        ctx.fillText(label, x, canvas.height - padding + 20);
    }
}

// Экспорт данных
function exportData() {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mood-tracker-${currentUser.username}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Данные экспортированы!', 'success');
}

// Выход из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    // Создание элемента уведомления
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
    
    // Добавление анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Удаление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 3000);
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Анализ паттернов
function analyzePatterns() {
    const container = document.getElementById('patternsContainer');
    
    if (entries.length < 3) {
        container.innerHTML = `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: #e3f2fd; border-left: 4px solid #2196F3;">
                <div style="font-weight: 600; margin-bottom: 5px;">📊 Недостаточно данных</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Добавьте минимум 3 записи для анализа паттернов</div>
            </div>
        `;
        return;
    }

    const patterns = [];
    
    // Анализ последних 7 дней
    const last7Days = entries.slice(0, 7);
    const recentMoods = last7Days.map(e => e.mood);
    
    // 1. Проверка на длительную депрессивную фазу
    const depressiveCount = recentMoods.filter(m => m === 'depressive').length;
    if (depressiveCount >= 4) {
        patterns.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Длительная депрессивная фаза',
            message: `${depressiveCount} депрессивных дней из последних 7. Рекомендуем связаться с врачом.`,
            color: '#f44336'
        });
    }
    
    // 2. Проверка на маниакальную фазу
    const manicCount = recentMoods.filter(m => m === 'manic').length;
    if (manicCount >= 3) {
        patterns.push({
            type: 'warning',
            icon: '⚡',
            title: 'Признаки маниакальной фазы',
            message: `${manicCount} маниакальных дней из последних 7. Следите за импульсивностью и сном.`,
            color: '#FF6F00'
        });
    }
    
    // 3. Быстрая цикличность
    let moodChanges = 0;
    for (let i = 1; i < last7Days.length; i++) {
        if (last7Days[i].mood !== last7Days[i-1].mood) {
            moodChanges++;
        }
    }
    if (moodChanges >= 5) {
        patterns.push({
            type: 'info',
            icon: '🔄',
            title: 'Быстрая цикличность',
            message: `${moodChanges} смен настроения за неделю. Это может указывать на быстроциклическое течение.`,
            color: '#FF9800'
        });
    }
    
    // 4. Стабильная интерфаза (хорошо!)
    const interfaseCount = recentMoods.filter(m => m === 'interfase').length;
    if (interfaseCount >= 5) {
        patterns.push({
            type: 'success',
            icon: '✨',
            title: 'Стабильный период',
            message: `${interfaseCount} дней интерфазы из 7! Отличная работа по поддержанию стабильности.`,
            color: '#4CAF50'
        });
    }
    
    // 5. Анализ интенсивности
    const avgIntensity = entries.slice(0, 7).reduce((sum, e) => sum + e.intensity, 0) / Math.min(7, entries.length);
    if (avgIntensity >= 8) {
        patterns.push({
            type: 'warning',
            icon: '📈',
            title: 'Высокая интенсивность симптомов',
            message: `Средняя интенсивность ${avgIntensity.toFixed(1)}/10. Возможно, стоит скорректировать лечение.`,
            color: '#f44336'
        });
    }
    
    // 6. Анализ за месяц - выявление цикла
    if (entries.length >= 20) {
        const last30 = entries.slice(0, 30);
        const depressiveDays = last30.filter(e => e.mood === 'depressive').length;
        const manicDays = last30.filter(e => e.mood === 'manic').length;
        const interfaseDays = last30.filter(e => e.mood === 'interfase').length;
        
        patterns.push({
            type: 'info',
            icon: '📊',
            title: 'Распределение за месяц',
            message: `Депрессия: ${depressiveDays} дн. | Мания: ${manicDays} дн. | Интерфаза: ${interfaseDays} дн.`,
            color: '#2196F3'
        });
    }
    
    // Отрисовка паттернов
    if (patterns.length === 0) {
        container.innerHTML = `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50;">
                <div style="font-weight: 600; margin-bottom: 5px;">✅ Паттернов не обнаружено</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Продолжайте вести записи для отслеживания изменений</div>
            </div>
        `;
    } else {
        container.innerHTML = patterns.map(pattern => `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: ${pattern.color}15; border-left: 4px solid ${pattern.color};">
                <div style="font-weight: 600; margin-bottom: 5px;">${pattern.icon} ${pattern.title}</div>
                <div style="font-size: 0.9rem; color: var(--text-dark);">${pattern.message}</div>
            </div>
        `).join('');
    }
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

// Инициализация напоминаний
function initializeReminders() {
    // Загрузка сохраненных настроек
    const reminderEnabled = localStorage.getItem('dailyReminder') === 'true';
    const reminderTime = localStorage.getItem('reminderTime') || '21:00';
    
    document.getElementById('dailyReminder').checked = reminderEnabled;
    document.getElementById('reminderTime').value = reminderTime;
    
    // Сохранение настроек
    document.getElementById('dailyReminder').addEventListener('change', (e) => {
        localStorage.setItem('dailyReminder', e.target.checked);
        if (e.target.checked) {
            scheduleReminder();
            showNotification('Напоминания включены!', 'success');
        } else {
            showNotification('Напоминания выключены', 'info');
        }
    });
    
    document.getElementById('reminderTime').addEventListener('change', (e) => {
        localStorage.setItem('reminderTime', e.target.value);
        if (document.getElementById('dailyReminder').checked) {
            scheduleReminder();
            showNotification('Время напоминания обновлено', 'success');
        }
    });
    
    // Запуск напоминаний
    if (reminderEnabled) {
        scheduleReminder();
    }
}

// Планирование напоминания
function scheduleReminder() {
    const reminderTime = localStorage.getItem('reminderTime') || '21:00';
    const [hours, minutes] = reminderTime.split(':').map(Number);
    
    const now = new Date();
    const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
    // Если время уже прошло, планируем на завтра
    if (reminderDate <= now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
    }
    
    const timeUntilReminder = reminderDate - now;
    
    setTimeout(() => {
        if (localStorage.getItem('dailyReminder') === 'true') {
            showNotification('⏰ Не забудьте добавить запись настроения!', 'info');
            // Планируем следующее напоминание
            scheduleReminder();
        }
    }, timeUntilReminder);
}

// Проверка алертов
function checkAlerts() {
    const alertsContainer = document.getElementById('alertsContainer');
    const alerts = [];
    
    // Проверка: давно не добавляли запись
    if (entries.length > 0) {
        const lastEntry = new Date(entries[0].date);
        const now = new Date();
        const daysSinceLastEntry = Math.floor((now - lastEntry) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastEntry >= 2) {
            alerts.push({
                icon: '⚠️',
                title: 'Давно не было записей',
                message: `Последняя запись была ${daysSinceLastEntry} дня назад. Добавьте текущее состояние!`,
                color: '#FF9800'
            });
        }
    }
    
    // Проверка: мало данных о сне
    const sleepReminder = localStorage.getItem('sleepReminderShown');
    if (!sleepReminder && entries.length >= 5) {
        alerts.push({
            icon: '😴',
            title: 'Отслеживайте сон',
            message: 'Качество сна критически важно при БАР. Попробуйте трекер сна!',
            color: '#2196F3',
            action: 'sleep'
        });
    }
    
    if (alerts.length > 0) {
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: ${alert.color}15; border-left: 4px solid ${alert.color}; margin-bottom: 10px;">
                <div style="font-weight: 600; margin-bottom: 5px;">${alert.icon} ${alert.title}</div>
                <div style="font-size: 0.9rem; color: var(--text-dark);">${alert.message}</div>
                ${alert.action === 'sleep' ? `
                    <button onclick="location.href='/sleep.html'; localStorage.setItem('sleepReminderShown', 'true');" 
                            style="margin-top: 10px; padding: 8px 16px; background: var(--rose); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Перейти к трекеру сна
                    </button>
                ` : ''}
            </div>
        `).join('');
    }
}

// Обновление графика при изменении размера окна
window.addEventListener('resize', () => {
    drawChart();
});

