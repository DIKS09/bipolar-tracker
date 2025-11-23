const mongoose = require('mongoose');

const connectDB = async () => {
    const pink = '\x1b[95m'; // Розовый цвет
    const reset = '\x1b[0m'; // Сброс цвета
    
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bipolar-tracker');

        console.log(`${pink}✓${reset} MongoDB подключена: ${conn.connection.host}`);
    } catch (error) {
        console.error(`${pink}✗${reset} Ошибка подключения MongoDB: ${error.message}`);
        console.log(`${pink}⚠${reset} Сервер продолжает работать без базы данных`);
        console.log(`${pink}→${reset} Фронтенд доступен, но функции сохранения данных не работают`);
        // Не останавливаем сервер, продолжаем работу
    }
};

module.exports = connectDB;

