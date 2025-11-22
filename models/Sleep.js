const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    bedTime: {
        type: String,
        required: true
    },
    wakeTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // в часах
        required: true
    },
    quality: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    interruptions: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    },
    feltRested: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Индекс для быстрого поиска по пользователю и дате
SleepSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Sleep', SleepSchema);

