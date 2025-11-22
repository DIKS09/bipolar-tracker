const mongoose = require('mongoose');

const connectDB = async () => {
    const pink = '\x1b[95m'; // Розовый цвет
    const reset = '\x1b[0m'; // Сброс цвета
    
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bipolar-tracker', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`${pink}✓${reset} MongoDB подключена: ${conn.connection.host}`);
    } catch (error) {
        console.error(`${pink}✗${reset} Ошибка подключения MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

