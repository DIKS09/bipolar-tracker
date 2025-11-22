const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Защита маршрутов
const protect = async (req, res, next) => {
    let token;

    // Проверка наличия токена в заголовках
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Проверка что токен существует
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Не авторизован для доступа к этому маршруту'
        });
    }

    try {
        // Верификация токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production');

        // Добавление пользователя в запрос
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Не авторизован для доступа к этому маршруту'
        });
    }
};

// Экспорт для использования и с деструктуризацией, и без
module.exports = protect;
module.exports.protect = protect;
