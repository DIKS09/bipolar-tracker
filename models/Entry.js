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
    // Симптомы депрессии
    depressiveSymptoms: {
        insomnia: { type: Boolean, default: false },
        oversleeping: { type: Boolean, default: false },
        energyLoss: { type: Boolean, default: false },
        lossOfInterest: { type: Boolean, default: false },
        suicidalThoughts: { type: Boolean, default: false },
        appetiteChanges: { type: Boolean, default: false }
    },
    // Симптомы мании/гипомании
    manicSymptoms: {
        reducedSleep: { type: Boolean, default: false },
        rapidSpeech: { type: Boolean, default: false },
        racingThoughts: { type: Boolean, default: false },
        impulsivity: { type: Boolean, default: false },
        excessiveSpending: { type: Boolean, default: false }
    },
    // Триггеры
    triggers: {
        stress: { type: Boolean, default: false },
        lackOfSleep: { type: Boolean, default: false },
        conflict: { type: Boolean, default: false },
        alcohol: { type: Boolean, default: false },
        seasonalChanges: { type: Boolean, default: false }
    },
    // Фазо-специфичные шкалы
    aggressiveness: {
        type: Number,
        min: [1, 'Агрессивность должна быть от 1 до 10'],
        max: [10, 'Агрессивность должна быть от 1 до 10']
    },
    irritability: {
        type: Number,
        min: [1, 'Раздражительность должна быть от 1 до 10'],
        max: [10, 'Раздражительность должна быть от 1 до 10']
    },
    moodStability: {
        type: Boolean,
        default: false
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

