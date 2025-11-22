const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mood: {
        type: String,
        enum: ['depressive', 'interfase', 'manic'],
        required: [true, 'Пожалуйста, укажите тип настроения']
    },
    intensity: {
        type: Number,
        required: [true, 'Пожалуйста, укажите интенсивность'],
        min: [1, 'Интенсивность должна быть от 1 до 10'],
        max: [10, 'Интенсивность должна быть от 1 до 10']
    },
    notes: {
        type: String,
        maxlength: [1000, 'Заметки не должны превышать 1000 символов']
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Индекс для быстрого поиска по пользователю и дате
EntrySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Entry', EntrySchema);

