const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Sleep = require('../models/Sleep');

// @route   GET /api/sleep/stats
// @desc    Получить статистику сна
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const sleepEntries = await Sleep.find({ user: req.user.id });

        if (sleepEntries.length === 0) {
            return res.json({
                success: true,
                data: {
                    avgDuration: 0,
                    avgQuality: 0,
                    totalEntries: 0,
                    avgInterruptions: 0
                }
            });
        }

        const avgDuration = sleepEntries.reduce((sum, entry) => sum + entry.duration, 0) / sleepEntries.length;
        const avgQuality = sleepEntries.reduce((sum, entry) => sum + entry.quality, 0) / sleepEntries.length;
        const avgInterruptions = sleepEntries.reduce((sum, entry) => sum + entry.interruptions, 0) / sleepEntries.length;

        res.json({
            success: true,
            data: {
                avgDuration: avgDuration.toFixed(1),
                avgQuality: avgQuality.toFixed(1),
                totalEntries: sleepEntries.length,
                avgInterruptions: avgInterruptions.toFixed(1)
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики сна:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// @route   GET /api/sleep
// @desc    Получить все записи сна пользователя
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const sleepEntries = await Sleep.find({ user: req.user.id })
            .sort({ date: -1 });
        
        res.json({
            success: true,
            data: sleepEntries
        });
    } catch (error) {
        console.error('Ошибка получения записей сна:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// @route   POST /api/sleep
// @desc    Создать запись сна
// @access  Private
router.post('/', [
    auth,
    body('bedTime').notEmpty().withMessage('Время отхода ко сну обязательно'),
    body('wakeTime').notEmpty().withMessage('Время пробуждения обязательно'),
    body('duration').isFloat({ min: 0, max: 24 }).withMessage('Длительность должна быть от 0 до 24 часов'),
    body('quality').isInt({ min: 1, max: 10 }).withMessage('Качество должно быть от 1 до 10'),
    body('interruptions').optional().isInt({ min: 0 }).withMessage('Количество пробуждений не может быть отрицательным')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const { bedTime, wakeTime, duration, quality, interruptions, notes, feltRested, date } = req.body;

        const sleepEntry = new Sleep({
            user: req.user.id,
            bedTime,
            wakeTime,
            duration,
            quality,
            interruptions: interruptions || 0,
            notes: notes || '',
            feltRested: feltRested || false,
            date: date || new Date()
        });

        await sleepEntry.save();

        res.status(201).json({
            success: true,
            data: sleepEntry,
            message: 'Запись сна добавлена'
        });
    } catch (error) {
        console.error('Ошибка создания записи сна:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// @route   DELETE /api/sleep/:id
// @desc    Удалить запись сна
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const sleepEntry = await Sleep.findById(req.params.id);

        if (!sleepEntry) {
            return res.status(404).json({
                success: false,
                message: 'Запись не найдена'
            });
        }

        // Проверка, что запись принадлежит пользователю
        if (sleepEntry.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        await Sleep.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Запись удалена'
        });
    } catch (error) {
        console.error('Ошибка удаления записи сна:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

module.exports = router;

