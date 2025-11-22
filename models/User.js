const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Пожалуйста, укажите имя пользователя'],
        unique: true,
        trim: true,
        minlength: [3, 'Имя пользователя должно быть минимум 3 символа'],
        maxlength: [30, 'Имя пользователя не должно превышать 30 символов']
    },
    email: {
        type: String,
        required: [true, 'Пожалуйста, укажите email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Пожалуйста, укажите корректный email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Пожалуйста, укажите пароль'],
        minlength: [6, 'Пароль должен быть минимум 6 символов'],
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Шифрование пароля перед сохранением
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Метод для проверки пароля
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

