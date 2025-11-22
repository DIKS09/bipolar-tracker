const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Entry = require('../models/Entry');
const { protect } = require('../middleware/auth');

// Все маршруты защищены
router.use(protect);

// @route   GET /api/entries
// @desc    Получить все записи пользователя
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, mood } = req.query;
        
        let query = { user: req.user._id };

        // Фильтр по датам
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Фильтр по настроению
        if (mood && ['depressive', 'interfase', 'manic'].includes(mood)) {
            query.mood = mood;
        }

        const entries = await Entry.find(query).sort({ date: -1 });

        res.json({
            success: true,
            count: entries.length,
            data: entries
        });
    } catch (error) {
        console.error('Ошибка получения записей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении записей'
        });
    }
});

// @route   GET /api/entries/stats
// @desc    Получить статистику записей
// @access  Private
router.get('/stats', async (req, res) => {
    try {
        const entries = await Entry.find({ user: req.user._id });

        const stats = {
            total: entries.length,
            depressive: entries.filter(e => e.mood === 'depressive').length,
            interfase: entries.filter(e => e.mood === 'interfase').length,
            manic: entries.filter(e => e.mood === 'manic').length,
            averageIntensity: entries.length > 0 
                ? (entries.reduce((sum, e) => sum + e.intensity, 0) / entries.length).toFixed(1)
                : 0
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении статистики'
        });
    }
});

// @route   GET /api/entries/:id
// @desc    Получить одну запись
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Запись не найдена'
            });
        }

        // Проверка что запись принадлежит пользователю
        if (entry.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Нет доступа к этой записи'
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Ошибка получения записи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении записи'
        });
    }
});

// @route   POST /api/entries
// @desc    Создать новую запись
// @access  Private
router.post('/', [
    body('mood').isIn(['depressive', 'interfase', 'manic']).withMessage('Укажите корректный тип настроения'),
    body('intensity').isInt({ min: 1, max: 10 }).withMessage('Интенсивность должна быть от 1 до 10'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Заметки не должны превышать 1000 символов')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { mood, intensity, notes, date } = req.body;

        const entry = await Entry.create({
            user: req.user._id,
            mood,
            intensity,
            notes: notes || '',
            date: date || Date.now()
        });

        res.status(201).json({
            success: true,
            message: 'Запись успешно создана',
            data: entry
        });
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при создании записи'
        });
    }
});

// @route   PUT /api/entries/:id
// @desc    Обновить запись
// @access  Private
router.put('/:id', [
    body('mood').optional().isIn(['depressive', 'interfase', 'manic']).withMessage('Укажите корректный тип настроения'),
    body('intensity').optional().isInt({ min: 1, max: 10 }).withMessage('Интенсивность должна быть от 1 до 10'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Заметки не должны превышать 1000 символов')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        let entry = await Entry.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Запись не найдена'
            });
        }

        // Проверка что запись принадлежит пользователю
        if (entry.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Нет доступа к этой записи'
            });
        }

        entry = await Entry.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            message: 'Запись успешно обновлена',
            data: entry
        });
    } catch (error) {
        console.error('Ошибка обновления записи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении записи'
        });
    }
});

// @route   DELETE /api/entries/:id
// @desc    Удалить запись
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Запись не найдена'
            });
        }

        // Проверка что запись принадлежит пользователю
        if (entry.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Нет доступа к этой записи'
            });
        }

        await entry.deleteOne();

        res.json({
            success: true,
            message: 'Запись успешно удалена'
        });
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении записи'
        });
    }
});

module.exports = router;

