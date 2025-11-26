// API конфигурация - используем относительный путь для работы на любом домене
const API_URL = '/api';
let currentMood = null;
let currentFilter = 'all';
let entries = [];
let token = null;
let currentUser = null;

// Аудио-рекордер
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordingStartTime = null;
let recordingInterval = null;

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
            
            // Показать/скрыть соответствующие секции
            updateSymptomSections(currentMood);
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

    // Слайдер агрессивности
    const aggressivenessSlider = document.getElementById('aggressiveness');
    const aggressivenessValue = document.querySelector('.aggressiveness-value');
    
    if (aggressivenessSlider) {
        aggressivenessSlider.addEventListener('input', (e) => {
            aggressivenessValue.textContent = e.target.value;
            aggressivenessValue.style.transform = 'scale(1.2)';
            setTimeout(() => {
                aggressivenessValue.style.transform = 'scale(1)';
            }, 200);
        });
    }

    // Слайдер раздражительности
    const irritabilitySlider = document.getElementById('irritability');
    const irritabilityValue = document.querySelector('.irritability-value');
    
    if (irritabilitySlider) {
        irritabilitySlider.addEventListener('input', (e) => {
            irritabilityValue.textContent = e.target.value;
            irritabilityValue.style.transform = 'scale(1.2)';
            setTimeout(() => {
                irritabilityValue.style.transform = 'scale(1)';
            }, 200);
        });
    }

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
    
    // Экспорт PDF
    document.getElementById('exportPDF').addEventListener('click', exportPDF);
    
    // Выход
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Аудио-рекордер
    initializeAudioRecorder();

    // Носимые устройства
    initializeWearables();
}

// Инициализация аудио-рекордера
function initializeAudioRecorder() {
    const recordBtn = document.getElementById('audioRecordBtn');
    const deleteBtn = document.getElementById('audioDeleteBtn');

    recordBtn.addEventListener('click', toggleAudioRecording);
    deleteBtn.addEventListener('click', deleteAudioRecording);
}

// Переключение записи аудио
async function toggleAudioRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        await startAudioRecording();
    } else {
        stopAudioRecording();
    }
}

// Начать запись аудио
async function startAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            document.getElementById('audioPlayer').src = audioUrl;
            document.getElementById('audioPreview').style.display = 'block';
            
            // Останавливаем все треки
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();

        // UI обновления
        document.getElementById('audioIcon').textContent = '⏹️';
        document.getElementById('audioText').textContent = 'Остановить запись';
        document.getElementById('audioRecordBtn').classList.add('recording');
        document.getElementById('audioTimer').style.display = 'block';

        // Таймер
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('recordingTime').textContent = `${minutes}:${seconds}`;
        }, 1000);

        showNotification('Запись началась', 'info');
    } catch (error) {
        console.error('Ошибка доступа к микрофону:', error);
        showNotification('Не удалось получить доступ к микрофону', 'error');
    }
}

// Остановить запись аудио
function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        clearInterval(recordingInterval);

        // UI обновления
        document.getElementById('audioIcon').textContent = '🎤';
        document.getElementById('audioText').textContent = 'Записать голосовую заметку';
        document.getElementById('audioRecordBtn').classList.remove('recording');
        document.getElementById('audioTimer').style.display = 'none';
        document.getElementById('recordingTime').textContent = '00:00';

        showNotification('Запись сохранена', 'success');
    }
}

// Удалить аудио-запись
function deleteAudioRecording() {
    audioBlob = null;
    document.getElementById('audioPlayer').src = '';
    document.getElementById('audioPreview').style.display = 'none';
    showNotification('Аудио-запись удалена', 'info');
}

// Конвертация Blob в Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Обновление секций симптомов в зависимости от выбранной фазы
function updateSymptomSections(mood) {
    const depressiveSymptoms = document.getElementById('depressiveSymptoms');
    const manicSymptoms = document.getElementById('manicSymptoms');
    const aggressivenessScale = document.getElementById('aggressivenessScale');
    const irritabilityScale = document.getElementById('irritabilityScale');
    const moodStabilityCheck = document.getElementById('moodStabilityCheck');

    // Скрыть все секции
    depressiveSymptoms.style.display = 'none';
    manicSymptoms.style.display = 'none';
    aggressivenessScale.style.display = 'none';
    irritabilityScale.style.display = 'none';
    moodStabilityCheck.style.display = 'none';

    // Показать соответствующие секции
    if (mood === 'depressive') {
        depressiveSymptoms.style.display = 'block';
        aggressivenessScale.style.display = 'block';
    } else if (mood === 'manic') {
        manicSymptoms.style.display = 'block';
        irritabilityScale.style.display = 'block';
    } else if (mood === 'interfase') {
        moodStabilityCheck.style.display = 'block';
    }
}

// Сохранение новой записи
async function saveEntry() {
    if (!currentMood) {
        showNotification('Пожалуйста, выберите ваше настроение', 'error');
        return;
    }

    const intensity = document.getElementById('intensity').value;
    const notes = document.getElementById('notes').value.trim();

    // Собираем симптомы депрессии
    const depressiveSymptoms = {
        insomnia: document.querySelector('input[name="depressive-insomnia"]')?.checked || false,
        oversleeping: document.querySelector('input[name="depressive-oversleeping"]')?.checked || false,
        energyLoss: document.querySelector('input[name="depressive-energyLoss"]')?.checked || false,
        lossOfInterest: document.querySelector('input[name="depressive-lossOfInterest"]')?.checked || false,
        suicidalThoughts: document.querySelector('input[name="depressive-suicidalThoughts"]')?.checked || false,
        appetiteChanges: document.querySelector('input[name="depressive-appetiteChanges"]')?.checked || false
    };

    // Собираем симптомы мании
    const manicSymptoms = {
        reducedSleep: document.querySelector('input[name="manic-reducedSleep"]')?.checked || false,
        rapidSpeech: document.querySelector('input[name="manic-rapidSpeech"]')?.checked || false,
        racingThoughts: document.querySelector('input[name="manic-racingThoughts"]')?.checked || false,
        impulsivity: document.querySelector('input[name="manic-impulsivity"]')?.checked || false,
        excessiveSpending: document.querySelector('input[name="manic-excessiveSpending"]')?.checked || false
    };

    // Собираем триггеры
    const triggers = {
        stress: document.querySelector('input[name="trigger-stress"]')?.checked || false,
        lackOfSleep: document.querySelector('input[name="trigger-lackOfSleep"]')?.checked || false,
        conflict: document.querySelector('input[name="trigger-conflict"]')?.checked || false,
        alcohol: document.querySelector('input[name="trigger-alcohol"]')?.checked || false,
        seasonalChanges: document.querySelector('input[name="trigger-seasonalChanges"]')?.checked || false
    };

    const entryData = {
        mood: currentMood,
        intensity: parseInt(intensity),
        notes: notes,
        date: new Date().toISOString(),
        depressiveSymptoms: depressiveSymptoms,
        manicSymptoms: manicSymptoms,
        triggers: triggers
    };

    // Добавляем фазо-специфичные шкалы
    if (currentMood === 'depressive') {
        entryData.aggressiveness = parseInt(document.getElementById('aggressiveness').value);
    } else if (currentMood === 'manic') {
        entryData.irritability = parseInt(document.getElementById('irritability').value);
    } else if (currentMood === 'interfase') {
        entryData.moodStability = document.getElementById('moodStability')?.checked || false;
    }

    // Добавляем аудио-запись, если есть
    if (audioBlob) {
        try {
            const audioBase64 = await blobToBase64(audioBlob);
            const audioDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
            entryData.audioNote = audioBase64;
            entryData.audioNoteDuration = audioDuration;
        } catch (error) {
            console.error('Ошибка конвертации аудио:', error);
        }
    }

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
            
            // Сбросить чекбоксы
            document.querySelectorAll('.symptom-checkbox, .trigger-checkbox').forEach(cb => cb.checked = false);
            
            // Сбросить шкалы
            document.getElementById('aggressiveness').value = 5;
            document.querySelector('.aggressiveness-value').textContent = '5';
            document.getElementById('irritability').value = 5;
            document.querySelector('.irritability-value').textContent = '5';
            if (document.getElementById('moodStability')) {
                document.getElementById('moodStability').checked = false;
            }
            
            // Скрыть все секции
            document.getElementById('depressiveSymptoms').style.display = 'none';
            document.getElementById('manicSymptoms').style.display = 'none';
            document.getElementById('aggressivenessScale').style.display = 'none';
            document.getElementById('irritabilityScale').style.display = 'none';
            document.getElementById('moodStabilityCheck').style.display = 'none';
            
            // Сбросить аудио
            audioBlob = null;
            document.getElementById('audioPlayer').src = '';
            document.getElementById('audioPreview').style.display = 'none';
            
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
    updateAdvancedAnalytics();
    analyzeEarlyWarning();
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
        
        // Формируем список симптомов
        let symptomsHtml = '';
        if (entry.mood === 'depressive' && entry.depressiveSymptoms) {
            const symptoms = [];
            if (entry.depressiveSymptoms.insomnia) symptoms.push('Бессонница');
            if (entry.depressiveSymptoms.oversleeping) symptoms.push('Пересып');
            if (entry.depressiveSymptoms.energyLoss) symptoms.push('Упадок сил');
            if (entry.depressiveSymptoms.lossOfInterest) symptoms.push('Потеря интереса');
            if (entry.depressiveSymptoms.suicidalThoughts) symptoms.push('Суицидальные мысли');
            if (entry.depressiveSymptoms.appetiteChanges) symptoms.push('Изменения аппетита');
            if (symptoms.length > 0) {
                symptomsHtml = `<div style="margin-top: 10px;"><strong>Симптомы:</strong> ${symptoms.join(', ')}</div>`;
            }
        } else if (entry.mood === 'manic' && entry.manicSymptoms) {
            const symptoms = [];
            if (entry.manicSymptoms.reducedSleep) symptoms.push('Сниженная потребность во сне');
            if (entry.manicSymptoms.rapidSpeech) symptoms.push('Ускоренная речь');
            if (entry.manicSymptoms.racingThoughts) symptoms.push('Скачки мыслей');
            if (entry.manicSymptoms.impulsivity) symptoms.push('Повышенная импульсивность');
            if (entry.manicSymptoms.excessiveSpending) symptoms.push('Траты денег');
            if (symptoms.length > 0) {
                symptomsHtml = `<div style="margin-top: 10px;"><strong>Симптомы:</strong> ${symptoms.join(', ')}</div>`;
            }
        }

        // Формируем список триггеров
        let triggersHtml = '';
        if (entry.triggers) {
            const triggers = [];
            if (entry.triggers.stress) triggers.push('Стресс');
            if (entry.triggers.lackOfSleep) triggers.push('Недосып');
            if (entry.triggers.conflict) triggers.push('Конфликт');
            if (entry.triggers.alcohol) triggers.push('Алкоголь');
            if (entry.triggers.seasonalChanges) triggers.push('Сезонные изменения');
            if (triggers.length > 0) {
                triggersHtml = `<div style="margin-top: 10px;"><strong>Триггеры:</strong> ${triggers.join(', ')}</div>`;
            }
        }

        // Фазо-специфичные шкалы
        let scalesHtml = '';
        if (entry.mood === 'depressive' && entry.aggressiveness) {
            scalesHtml = `<div style="margin-top: 10px;"><strong>Агрессивность:</strong> ${entry.aggressiveness}/10</div>`;
        } else if (entry.mood === 'manic' && entry.irritability) {
            scalesHtml = `<div style="margin-top: 10px;"><strong>Раздражительность:</strong> ${entry.irritability}/10</div>`;
        } else if (entry.mood === 'interfase' && entry.moodStability) {
            scalesHtml = `<div style="margin-top: 10px;"><strong>✓</strong> Настроение не менялось</div>`;
        }

        // Аудио-запись
        let audioHtml = '';
        if (entry.audioNote) {
            const duration = entry.audioNoteDuration ? formatDuration(entry.audioNoteDuration) : '';
            audioHtml = `
                <div style="margin-top: 10px;">
                    <strong>🎤 Голосовая заметка ${duration}</strong>
                    <audio controls style="width: 100%; margin-top: 5px; border-radius: 8px;" preload="none">
                        <source src="${entry.audioNote}" type="audio/webm">
                        Ваш браузер не поддерживает аудио.
                    </audio>
                </div>
            `;
        }
        
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
                ${symptomsHtml}
                ${triggersHtml}
                ${scalesHtml}
                ${entry.notes ? `<div class="entry-notes" style="margin-top: 10px;">${escapeHtml(entry.notes)}</div>` : ''}
                ${audioHtml}
                <button class="entry-delete" onclick="deleteEntry('${entry._id}')"><span class="pink-icon">✕</span> Удалить</button>
            </div>
        `;
    }).join('');
}

// Форматирование длительности аудио
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `(${mins}:${secs.toString().padStart(2, '0')})`;
}
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

// Экспорт PDF отчета для врача
async function exportPDF() {
    if (entries.length === 0) {
        showNotification('Нет данных для экспорта', 'error');
        return;
    }

    showNotification('Генерация PDF отчета...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        // Заголовок
        doc.setFontSize(20);
        doc.text('Отчет о настроении', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.text(`Пациент: ${currentUser.username}`, 105, y, { align: 'center' });
        y += 5;
        doc.text(`Период: ${formatDate(new Date(entries[entries.length - 1].date))} - ${formatDate(new Date(entries[0].date))}`, 105, y, { align: 'center' });
        y += 5;
        doc.text(`Дата создания отчета: ${new Date().toLocaleDateString('ru-RU')}`, 105, y, { align: 'center' });
        y += 15;

        // Линия
        doc.setDrawColor(255, 105, 180);
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        // Общая статистика
        doc.setFontSize(14);
        doc.setTextColor(255, 105, 180);
        doc.text('Общая статистика', 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const depressiveCount = entries.filter(e => e.mood === 'depressive').length;
        const manicCount = entries.filter(e => e.mood === 'manic').length;
        const interfaseCount = entries.filter(e => e.mood === 'interfase').length;
        const avgIntensity = (entries.reduce((sum, e) => sum + e.intensity, 0) / entries.length).toFixed(1);

        doc.text(`Всего записей: ${entries.length}`, 20, y);
        y += 6;
        doc.text(`Депрессивных дней: ${depressiveCount} (${(depressiveCount / entries.length * 100).toFixed(0)}%)`, 20, y);
        y += 6;
        doc.text(`Маниакальных дней: ${manicCount} (${(manicCount / entries.length * 100).toFixed(0)}%)`, 20, y);
        y += 6;
        doc.text(`Дней интерфазы: ${interfaseCount} (${interfaseCount / entries.length * 100).toFixed(0)}%)`, 20, y);
        y += 6;
        doc.text(`Средняя интенсивность симптомов: ${avgIntensity}/10`, 20, y);
        y += 12;

        // Средняя продолжительность эпизодов
        doc.setFontSize(14);
        doc.setTextColor(255, 105, 180);
        doc.text('Средняя продолжительность эпизодов', 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const avgDepDuration = document.getElementById('avgDepressiveDuration').textContent;
        const avgManDuration = document.getElementById('avgManicDuration').textContent;
        const avgIntDuration = document.getElementById('avgInterfaseDuration').textContent;

        doc.text(`Депрессивная фаза: ${avgDepDuration} дней`, 20, y);
        y += 6;
        doc.text(`Маниакальная фаза: ${avgManDuration} дней`, 20, y);
        y += 6;
        doc.text(`Интерфаза: ${avgIntDuration} дней`, 20, y);
        y += 12;

        // Самые частые триггеры
        doc.setFontSize(14);
        doc.setTextColor(255, 105, 180);
        doc.text('Самые частые триггеры', 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const triggerCounts = {
            stress: 0, lackOfSleep: 0, conflict: 0, alcohol: 0, seasonalChanges: 0
        };
        const triggerNames = {
            stress: 'Стресс', lackOfSleep: 'Недосып', conflict: 'Конфликт',
            alcohol: 'Алкоголь', seasonalChanges: 'Сезонные изменения'
        };

        entries.forEach(entry => {
            if (entry.triggers) {
                Object.keys(entry.triggers).forEach(trigger => {
                    if (entry.triggers[trigger]) triggerCounts[trigger]++;
                });
            }
        });

        const sortedTriggers = Object.entries(triggerCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sortedTriggers.length > 0) {
            sortedTriggers.forEach(([trigger, count]) => {
                doc.text(`${triggerNames[trigger]}: ${count} раз`, 20, y);
                y += 6;
            });
        } else {
            doc.text('Триггеры не отмечены', 20, y);
            y += 6;
        }
        y += 6;

        // Самые частые симптомы
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(255, 105, 180);
        doc.text('Самые частые симптомы', 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const symptomCounts = {};
        const symptomNames = {
            insomnia: 'Бессонница', oversleeping: 'Пересып', energyLoss: 'Упадок сил',
            lossOfInterest: 'Потеря интереса', suicidalThoughts: 'Суицидальные мысли',
            appetiteChanges: 'Изменения аппетита', reducedSleep: 'Сниженная потребность во сне',
            rapidSpeech: 'Ускоренная речь', racingThoughts: 'Скачки мыслей',
            impulsivity: 'Импульсивность', excessiveSpending: 'Траты денег'
        };

        entries.forEach(entry => {
            if (entry.depressiveSymptoms) {
                Object.keys(entry.depressiveSymptoms).forEach(symptom => {
                    if (entry.depressiveSymptoms[symptom]) {
                        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
                    }
                });
            }
            if (entry.manicSymptoms) {
                Object.keys(entry.manicSymptoms).forEach(symptom => {
                    if (entry.manicSymptoms[symptom]) {
                        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
                    }
                });
            }
        });

        const sortedSymptoms = Object.entries(symptomCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sortedSymptoms.length > 0) {
            sortedSymptoms.forEach(([symptom, count]) => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                const percentage = (count / entries.length * 100).toFixed(0);
                doc.text(`${symptomNames[symptom]}: ${count} раз (${percentage}%)`, 20, y);
                y += 6;
            });
        } else {
            doc.text('Симптомы не отмечены', 20, y);
            y += 6;
        }
        y += 10;

        // Последние записи
        if (y > 200) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(255, 105, 180);
        doc.text('Последние 10 записей', 20, y);
        y += 8;

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        const recentEntries = entries.slice(0, 10);
        recentEntries.forEach(entry => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const moodInfo = getMoodInfo(entry.mood);
            const date = new Date(entry.date).toLocaleDateString('ru-RU');
            
            doc.setFont(undefined, 'bold');
            doc.text(`${date} - ${moodInfo.label} (${entry.intensity}/10)`, 20, y);
            y += 5;
            
            doc.setFont(undefined, 'normal');
            if (entry.notes) {
                const lines = doc.splitTextToSize(entry.notes, 170);
                lines.slice(0, 3).forEach(line => {
                    doc.text(line, 20, y);
                    y += 4;
                });
            }
            y += 4;
        });

        // Сохранение файла
        const filename = `mood-report-${currentUser.username}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        showNotification('PDF отчет создан!', 'success');
    } catch (error) {
        console.error('Ошибка создания PDF:', error);
        showNotification('Ошибка создания PDF отчета', 'error');
    }
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

// Продвинутая аналитика
function updateAdvancedAnalytics() {
    if (entries.length < 3) {
        // Недостаточно данных
        document.getElementById('avgDepressiveDuration').textContent = '-';
        document.getElementById('avgManicDuration').textContent = '-';
        document.getElementById('avgInterfaseDuration').textContent = '-';
        document.getElementById('triggerAnalysis').innerHTML = '<p style="color: var(--text-light); text-align: center;">Недостаточно данных для анализа</p>';
        document.getElementById('symptomAnalysis').innerHTML = '<p style="color: var(--text-light); text-align: center;">Недостаточно данных для анализа</p>';
        document.getElementById('seasonalPatterns').innerHTML = '<p style="color: var(--text-light); text-align: center;">Недостаточно данных для анализа</p>';
        document.getElementById('sleepMoodCorrelation').innerHTML = '<p class="correlation-text" style="color: var(--text-light);">Недостаточно данных для анализа корреляции</p>';
        return;
    }

    // 1. Средняя продолжительность эпизодов
    calculateEpisodeDurations();

    // 2. Анализ триггеров
    analyzeTriggers();

    // 3. Анализ симптомов
    analyzeSymptoms();

    // 4. Сезонные паттерны
    analyzeSeasonalPatterns();

    // 5. Корреляция сна и настроения
    analyzeSleepMoodCorrelation();
}

// Расчет средней продолжительности эпизодов
function calculateEpisodeDurations() {
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const episodes = {
        depressive: [],
        manic: [],
        interfase: []
    };

    let currentEpisode = null;
    let currentMood = null;
    let episodeStart = null;

    sortedEntries.forEach((entry, index) => {
        const entryDate = new Date(entry.date);
        
        if (entry.mood !== currentMood) {
            // Завершаем предыдущий эпизод
            if (currentEpisode !== null && episodeStart !== null) {
                const duration = Math.floor((entryDate - episodeStart) / (1000 * 60 * 60 * 24));
                if (duration > 0) {
                    episodes[currentMood].push(duration);
                }
            }
            
            // Начинаем новый эпизод
            currentMood = entry.mood;
            episodeStart = entryDate;
            currentEpisode = 0;
        }
        
        currentEpisode++;
    });

    // Завершаем последний эпизод
    if (currentMood && episodeStart) {
        const duration = Math.floor((new Date() - episodeStart) / (1000 * 60 * 60 * 24));
        if (duration > 0) {
            episodes[currentMood].push(duration);
        }
    }

    // Вычисляем средние значения
    const avgDepressive = episodes.depressive.length > 0 
        ? (episodes.depressive.reduce((a, b) => a + b, 0) / episodes.depressive.length).toFixed(1)
        : '-';
    const avgManic = episodes.manic.length > 0 
        ? (episodes.manic.reduce((a, b) => a + b, 0) / episodes.manic.length).toFixed(1)
        : '-';
    const avgInterfase = episodes.interfase.length > 0 
        ? (episodes.interfase.reduce((a, b) => a + b, 0) / episodes.interfase.length).toFixed(1)
        : '-';

    document.getElementById('avgDepressiveDuration').textContent = avgDepressive;
    document.getElementById('avgManicDuration').textContent = avgManic;
    document.getElementById('avgInterfaseDuration').textContent = avgInterfase;
}

// Анализ триггеров
function analyzeTriggers() {
    const triggerCounts = {
        stress: 0,
        lackOfSleep: 0,
        conflict: 0,
        alcohol: 0,
        seasonalChanges: 0
    };

    const triggerNames = {
        stress: 'Стресс',
        lackOfSleep: 'Недосып',
        conflict: 'Конфликт',
        alcohol: 'Алкоголь',
        seasonalChanges: 'Сезонные изменения'
    };

    entries.forEach(entry => {
        if (entry.triggers) {
            Object.keys(entry.triggers).forEach(trigger => {
                if (entry.triggers[trigger]) {
                    triggerCounts[trigger]++;
                }
            });
        }
    });

    const totalTriggers = Object.values(triggerCounts).reduce((a, b) => a + b, 0);
    
    if (totalTriggers === 0) {
        document.getElementById('triggerAnalysis').innerHTML = '<p style="color: var(--text-light); text-align: center;">Триггеры не отмечены в записях</p>';
        return;
    }

    // Сортируем по убыванию
    const sortedTriggers = Object.entries(triggerCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    const html = sortedTriggers.map(([trigger, count]) => {
        const percentage = (count / totalTriggers * 100).toFixed(0);
        return `
            <div class="trigger-item">
                <div>
                    <div class="trigger-name">${triggerNames[trigger]}</div>
                    <div class="trigger-bar">
                        <div class="trigger-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="trigger-count">
                    <span>${count}</span>
                    <span style="font-size: 0.9rem; color: var(--text-light);">(${percentage}%)</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('triggerAnalysis').innerHTML = html;
}

// Анализ симптомов
function analyzeSymptoms() {
    const symptomCounts = {};
    const symptomNames = {
        // Депрессия
        insomnia: 'Бессонница',
        oversleeping: 'Пересып',
        energyLoss: 'Упадок сил',
        lossOfInterest: 'Потеря интереса',
        suicidalThoughts: 'Суицидальные мысли',
        appetiteChanges: 'Изменения аппетита',
        // Мания
        reducedSleep: 'Сниженная потребность во сне',
        rapidSpeech: 'Ускоренная речь',
        racingThoughts: 'Скачки мыслей',
        impulsivity: 'Импульсивность',
        excessiveSpending: 'Траты денег'
    };

    entries.forEach(entry => {
        if (entry.depressiveSymptoms) {
            Object.keys(entry.depressiveSymptoms).forEach(symptom => {
                if (entry.depressiveSymptoms[symptom]) {
                    symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
                }
            });
        }
        if (entry.manicSymptoms) {
            Object.keys(entry.manicSymptoms).forEach(symptom => {
                if (entry.manicSymptoms[symptom]) {
                    symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
                }
            });
        }
    });

    const totalSymptoms = Object.values(symptomCounts).reduce((a, b) => a + b, 0);
    
    if (totalSymptoms === 0) {
        document.getElementById('symptomAnalysis').innerHTML = '<p style="color: var(--text-light); text-align: center;">Симптомы не отмечены в записях</p>';
        return;
    }

    // Топ-5 симптомов
    const sortedSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const html = sortedSymptoms.map(([symptom, count]) => {
        const percentage = (count / entries.length * 100).toFixed(0);
        return `
            <div class="symptom-item">
                <div>
                    <div class="symptom-name">${symptomNames[symptom]}</div>
                    <div class="symptom-bar">
                        <div class="symptom-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="symptom-count">
                    <span>${count}</span>
                    <span style="font-size: 0.9rem; color: var(--text-light);">(${percentage}%)</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('symptomAnalysis').innerHTML = html;
}

// Сезонные паттерны
function analyzeSeasonalPatterns() {
    const seasonMoods = {
        winter: { depressive: 0, manic: 0, interfase: 0, name: 'Зима', icon: '❄️' },
        spring: { depressive: 0, manic: 0, interfase: 0, name: 'Весна', icon: '🌸' },
        summer: { depressive: 0, manic: 0, interfase: 0, name: 'Лето', icon: '☀️' },
        fall: { depressive: 0, manic: 0, interfase: 0, name: 'Осень', icon: '🍂' }
    };

    entries.forEach(entry => {
        const date = new Date(entry.date);
        const month = date.getMonth();
        let season;
        
        if (month >= 11 || month <= 1) season = 'winter';
        else if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else season = 'fall';

        seasonMoods[season][entry.mood]++;
    });

    const html = Object.entries(seasonMoods).map(([season, data]) => {
        const total = data.depressive + data.manic + data.interfase;
        if (total === 0) return '';

        let dominantMood = 'Интерфаза';
        let maxCount = data.interfase;
        
        if (data.depressive > maxCount) {
            dominantMood = 'Депрессивная';
            maxCount = data.depressive;
        }
        if (data.manic > maxCount) {
            dominantMood = 'Маниакальная';
        }

        return `
            <div class="season-item">
                <div class="season-icon">${data.icon}</div>
                <div class="season-name">${data.name}</div>
                <div class="season-mood">${dominantMood}</div>
                <div style="font-size: 0.85rem; color: var(--text-light); margin-top: 5px;">${total} записей</div>
            </div>
        `;
    }).join('');

    document.getElementById('seasonalPatterns').innerHTML = html || '<p style="color: var(--text-light); text-align: center;">Недостаточно данных</p>';
}

// Корреляция сна и настроения
async function analyzeSleepMoodCorrelation() {
    try {
        // Пытаемся получить данные о сне
        const sleepResponse = await fetch(`${API_URL}/sleep`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (sleepResponse.ok) {
            const sleepData = await sleepResponse.json();
            if (sleepData.success && sleepData.data.length > 0) {
                const sleepEntries = sleepData.data;
                
                // Находим совпадающие даты
                let correlationCount = 0;
                let poorSleepDepression = 0;
                let goodSleepStable = 0;

                entries.forEach(entry => {
                    const entryDate = new Date(entry.date).toDateString();
                    const matchingSleep = sleepEntries.find(sleep => 
                        new Date(sleep.date).toDateString() === entryDate
                    );

                    if (matchingSleep) {
                        correlationCount++;
                        
                        if (matchingSleep.quality === 'poor' && entry.mood === 'depressive') {
                            poorSleepDepression++;
                        }
                        if (matchingSleep.quality === 'good' && entry.mood === 'interfase') {
                            goodSleepStable++;
                        }
                    }
                });

                if (correlationCount > 0) {
                    const correlationPercent = ((poorSleepDepression + goodSleepStable) / correlationCount * 100).toFixed(0);
                    
                    document.getElementById('sleepMoodCorrelation').innerHTML = `
                        <p class="correlation-text">
                            Найдено <strong>${correlationCount}</strong> совпадающих записей.
                        </p>
                        <div class="correlation-value">${correlationPercent}% корреляция</div>
                        <p class="correlation-text" style="font-size: 0.9rem;">
                            • Плохой сон → Депрессия: ${poorSleepDepression} случаев<br>
                            • Хороший сон → Стабильность: ${goodSleepStable} случаев
                        </p>
                    `;
                } else {
                    document.getElementById('sleepMoodCorrelation').innerHTML = `
                        <p class="correlation-text">Нет совпадающих дат между записями настроения и сна</p>
                    `;
                }
            } else {
                document.getElementById('sleepMoodCorrelation').innerHTML = `
                    <p class="correlation-text">Нет данных о сне. <a href="/sleep.html" style="color: var(--rose);">Начните отслеживать сон</a> для анализа корреляции.</p>
                `;
            }
        } else {
            throw new Error('Не удалось загрузить данные о сне');
        }
    } catch (error) {
        console.error('Ошибка анализа корреляции сна:', error);
        document.getElementById('sleepMoodCorrelation').innerHTML = `
            <p class="correlation-text">Нет данных о сне. <a href="/sleep.html" style="color: var(--rose);">Начните отслеживать сон</a> для анализа корреляции.</p>
        `;
    }
}

// Система раннего предупреждения
function analyzeEarlyWarning() {
    const container = document.getElementById('earlyWarningContainer');
    
    if (entries.length < 7) {
        container.innerHTML = `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: #e3f2fd; border-left: 4px solid #2196F3;">
                <div style="font-weight: 600; margin-bottom: 5px;">📊 Недостаточно данных</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Добавьте минимум 7 записей для активации системы раннего предупреждения</div>
            </div>
        `;
        return;
    }

    const warnings = [];
    const last7Days = entries.slice(0, 7);
    const last3Days = entries.slice(0, 3);
    
    // 1. Анализ изменения интенсивности
    const recentIntensities = last3Days.map(e => e.intensity);
    const avgRecentIntensity = recentIntensities.reduce((a, b) => a + b, 0) / recentIntensities.length;
    const previousIntensities = entries.slice(3, 10).map(e => e.intensity);
    const avgPreviousIntensity = previousIntensities.length > 0 
        ? previousIntensities.reduce((a, b) => a + b, 0) / previousIntensities.length 
        : avgRecentIntensity;

    if (avgRecentIntensity > avgPreviousIntensity + 2) {
        warnings.push({
            type: 'warning',
            icon: '📈',
            title: 'Резкое усиление симптомов',
            message: `Интенсивность симптомов выросла с ${avgPreviousIntensity.toFixed(1)} до ${avgRecentIntensity.toFixed(1)}. Возможно начало эпизода.`,
            recommendations: ['Свяжитесь с врачом', 'Соблюдайте режим сна', 'Избегайте триггеров'],
            color: '#FF9800'
        });
    }

    // 2. Анализ изменения настроения
    const recentMoods = last3Days.map(e => e.mood);
    const moodChanged = recentMoods[0] !== recentMoods[1] || recentMoods[1] !== recentMoods[2];
    const currentMoodType = recentMoods[0];
    
    // Если было стабильно, но начало меняться
    const previous4to7 = entries.slice(3, 7).map(e => e.mood);
    const wasStable = previous4to7.every(m => m === 'interfase');
    
    if (wasStable && currentMoodType !== 'interfase') {
        warnings.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Выход из интерфазы',
            message: `Обнаружен переход из стабильного периода в ${currentMoodType === 'depressive' ? 'депрессивную' : 'маниакальную'} фазу.`,
            recommendations: [
                'Немедленно свяжитесь с врачом',
                'Пересмотрите терапию',
                'Избегайте стрессовых ситуаций'
            ],
            color: '#f44336'
        });
    }

    // 3. Анализ паттерна симптомов
    if (currentMoodType === 'depressive') {
        const suicidalThoughtsCount = last7Days.filter(e => 
            e.depressiveSymptoms && e.depressiveSymptoms.suicidalThoughts
        ).length;
        
        if (suicidalThoughtsCount >= 2) {
            warnings.push({
                type: 'critical',
                icon: '🚨',
                title: 'КРИТИЧЕСКОЕ: Суицидальные мысли',
                message: `Обнаружены суицидальные мысли в ${suicidalThoughtsCount} записях за последнюю неделю.`,
                recommendations: [
                    'НЕМЕДЛЕННО свяжитесь с врачом или психиатром',
                    'Позвоните на горячую линию: 8-800-2000-122',
                    'Не оставайтесь в одиночестве',
                    'Обратитесь к близким за поддержкой'
                ],
                color: '#d32f2f'
            });
        }

        const sleepIssues = last3Days.filter(e => 
            e.depressiveSymptoms && (e.depressiveSymptoms.insomnia || e.depressiveSymptoms.oversleeping)
        ).length;
        
        if (sleepIssues === 3) {
            warnings.push({
                type: 'warning',
                icon: '😴',
                title: 'Проблемы со сном 3 дня подряд',
                message: 'Нарушения сна могут усугубить депрессивное состояние.',
                recommendations: [
                    'Соблюдайте гигиену сна',
                    'Избегайте кофеина после 15:00',
                    'Проконсультируйтесь о корректировке препаратов'
                ],
                color: '#FF6F00'
            });
        }
    }

    if (currentMoodType === 'manic') {
        const reducedSleepCount = last3Days.filter(e => 
            e.manicSymptoms && e.manicSymptoms.reducedSleep
        ).length;
        
        if (reducedSleepCount >= 2) {
            warnings.push({
                type: 'warning',
                icon: '⚡',
                title: 'Сниженная потребность во сне',
                message: 'Признак маниакального эпизода. Недостаток сна может усилить манию.',
                recommendations: [
                    'Свяжитесь с врачом для корректировки лечения',
                    'Принимайте препараты строго по графику',
                    'Избегайте стимуляторов (кофеин, энергетики)',
                    'Придерживайтесь режима отхода ко сну'
                ],
                color: '#FF9800'
            });
        }

        const impulsivityCount = last3Days.filter(e => 
            e.manicSymptoms && (e.manicSymptoms.impulsivity || e.manicSymptoms.excessiveSpending)
        ).length;
        
        if (impulsivityCount >= 2) {
            warnings.push({
                type: 'warning',
                icon: '💸',
                title: 'Импульсивное поведение',
                message: 'Повышенная импульсивность и траты - признаки мании.',
                recommendations: [
                    'Ограничьте доступ к крупным суммам денег',
                    'Попросите близких помочь контролировать финансы',
                    'Избегайте принятия важных решений'
                ],
                color: '#FF6F00'
            });
        }
    }

    // 4. Анализ триггеров
    const recentTriggers = [];
    last3Days.forEach(entry => {
        if (entry.triggers) {
            Object.keys(entry.triggers).forEach(trigger => {
                if (entry.triggers[trigger]) {
                    recentTriggers.push(trigger);
                }
            });
        }
    });

    const triggerFrequency = {};
    recentTriggers.forEach(t => {
        triggerFrequency[t] = (triggerFrequency[t] || 0) + 1;
    });

    const frequentTriggers = Object.entries(triggerFrequency).filter(([_, count]) => count >= 2);
    if (frequentTriggers.length > 0) {
        const triggerNames = {
            stress: 'стресс', lackOfSleep: 'недосып', conflict: 'конфликты',
            alcohol: 'алкоголь', seasonalChanges: 'сезонные изменения'
        };
        
        const triggerList = frequentTriggers.map(([t, _]) => triggerNames[t]).join(', ');
        warnings.push({
            type: 'info',
            icon: '🎯',
            title: 'Повторяющиеся триггеры',
            message: `Обнаружены частые триггеры: ${triggerList}`,
            recommendations: [
                'Постарайтесь минимизировать воздействие триггеров',
                'Используйте техники совладания',
                'Обсудите с врачом профилактические меры'
            ],
            color: '#2196F3'
        });
    }

    // 5. Положительные паттерны
    if (last7Days.every(e => e.mood === 'interfase') && avgRecentIntensity < 5) {
        warnings.push({
            type: 'success',
            icon: '✨',
            title: 'Стабильный период',
            message: '7 дней интерфазы с низкой интенсивностью симптомов. Отличная работа!',
            recommendations: [
                'Продолжайте соблюдать режим',
                'Не прекращайте лечение',
                'Продолжайте вести дневник'
            ],
            color: '#4CAF50'
        });
    }

    // Отрисовка предупреждений
    if (warnings.length === 0) {
        container.innerHTML = `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50;">
                <div style="font-weight: 600; margin-bottom: 5px;">✅ Тревожных признаков не обнаружено</div>
                <div style="font-size: 0.9rem; color: var(--text-dark);">Продолжайте вести записи и следить за своим состоянием</div>
            </div>
        `;
    } else {
        container.innerHTML = warnings.map(warning => `
            <div class="pattern-alert" style="padding: 15px; border-radius: 12px; background: ${warning.color}15; border-left: 4px solid ${warning.color}; margin-bottom: 15px;">
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 1.05rem;">${warning.icon} ${warning.title}</div>
                <div style="font-size: 0.95rem; color: var(--text-dark); margin-bottom: 10px;">${warning.message}</div>
                ${warning.recommendations ? `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Рекомендации:</div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
                            ${warning.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
}

// Инициализация носимых устройств
function initializeWearables() {
    document.querySelectorAll('.wearable-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const device = this.dataset.device;
            connectWearableDevice(device, this);
        });
    });
}

// Подключение носимого устройства
function connectWearableDevice(device, button) {
    const deviceNames = {
        googlefit: 'Google Fit',
        fitbit: 'Fitbit',
        applehealth: 'Apple Health',
        samsunghealth: 'Samsung Health'
    };

    showNotification(`Подключение к ${deviceNames[device]}...`, 'info');

    // Имитация подключения (в будущем здесь будет реальная интеграция с OAuth)
    setTimeout(() => {
        showNotification(
            `Интеграция с ${deviceNames[device]} находится в разработке. Скоро вы сможете синхронизировать данные о сне и активности!`,
            'info'
        );
    }, 1000);
}

// Обновление графика при изменении размера окна
window.addEventListener('resize', () => {
    drawChart();
});

