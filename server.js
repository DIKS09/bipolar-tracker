const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Подключение к базе данных
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Дополнительные заголовки безопасности для продакшна
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// API маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/sleep', require('./routes/sleep'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден'
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Ошибка сервера'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    const pink = '\x1b[95m'; // Розовый цвет
    const reset = '\x1b[0m'; // Сброс цвета
    console.log(`${pink}♦${reset} Сервер запущен на порту ${PORT}`);
    console.log(`${pink}●${reset} Откройте: http://localhost:${PORT}`);
    console.log(`${pink}★${reset} Режим: ${process.env.NODE_ENV || 'development'}`);
});
