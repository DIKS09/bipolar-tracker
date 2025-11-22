# 🚀 Быстрый старт

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Установка и запуск MongoDB

### Windows:
```bash
# Скачайте MongoDB с https://www.mongodb.com/try/download/community
# После установки:
net start MongoDB
```

### macOS (с Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Шаг 3: Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bipolar-tracker
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

Или скопируйте пример:
```bash
# Windows PowerShell
Copy-Item env.example .env

# macOS/Linux
cp env.example .env
```

## Шаг 4: Запуск приложения

```bash
npm start
```

Или в режиме разработки с автоперезагрузкой:
```bash
npm run dev
```

## Шаг 5: Открыть в браузере

Перейдите на: **http://localhost:3000**

## ✅ Готово!

1. Зарегистрируйтесь на странице входа
2. Начните добавлять записи о настроении
3. Смотрите статистику и графики

---

## ⚠️ Возможные проблемы

### "Cannot connect to MongoDB"
- Проверьте, что MongoDB запущена
- Проверьте `MONGODB_URI` в файле `.env`

### "Port 3000 is already in use"
- Измените `PORT` в файле `.env` на другой (например, 3001)

### "npm ERR!"
- Удалите папку `node_modules` и файл `package-lock.json`
- Запустите `npm install` снова

---

**Наслаждайтесь использованием! 💖**

