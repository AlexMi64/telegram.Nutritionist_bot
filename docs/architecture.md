# Архитектура Eat_bot

## Обзор системы

Eat_bot - это асинхронный Telegram-бот на Node.js для контроля питания, реализованный с соблюдением принципов модульной архитектуры и твердо регламентированных интерфейсов.

## Основные компоненты

### 🎯 Основные модули

```
Eat_bot/
├── 🏗️ Core System          # Ядро системы
│   ├── Telegram Bot API    # Интерфейс Telegram
│   ├── State Manager       # Управление состояниями
│   └── Event Handler       # Обработка событий
│
├── 🧠 AI Engine           # Искусственный интеллект
│   ├── OpenAI/OpenRouter   # LLM интеграция
│   ├── Nutrition Analyzer  # Анализ еды
│   └── Coach Engine        # Коутинг функции
│
├── 💾 Data Layer          # Слой данных
│   ├── SQLite Database     # Основная БД
│   ├── Models/Entities     # Модели данных
│   └── Migrations          # Миграции
│
├── 📡 External APIs       # Внешние интеграции
│   ├── Telegram Bot API
│   ├── OpenRouter API
│   └── Nutrition APIs (опционально)
│
└── 🛠️ Utilities           # Утилиты
    ├── Logging System      # Логирование
    ├── Error Handling      # Обработка ошибок
    └── Config Management   # Управление конфигурацией
```

## 📋 Детальная архитектура

### 1. Telegram Bot Layer (Уровень бота)
```
┌─────────────────┐
│   Bot Handler   │ ← Получает обновления от Telegram
│   State FSM     │ ← Управляет состояниями пользователей
│   Command Proc  │ ← Обрабатывает команды
└─────────────────┘
         ↓
    Webhook/Polling
         ↓
    Telegram API
```

**Ключевые файлы:**
- `src/bot/bot.js` - Основной бот
- `config/` - Конфигурация webhook/polling

### 2. AI Processing Layer (Уровень ИИ)
```
┌─────────────────┐
│ OpenAI/OpenRouter│ ← LLM для анализа
│   Coach Engine   │ ← Коутинг и мотивация
│ Input Validation │ ← Проверка данных
└─────────────────┘
         ↓
    JSON Response
         ↓
   Telegram Message
```

**Ключевые файлы:**
- `src/services/openaiService.js` - AI интеграция
- `src/services/scheduler.js` - Планировщик уведомлений

### 3. Data Persistence Layer (Уровень данных)
```
┌─────────────────┐
│   Sequelize ORM │ ← Object-Relational Mapping
│   SQLite DB      │ ← Встраиваемая БД
│   Models         │ ← Сущности: User, Meal, Progress, Notification
│   Migrations     │ ← Контроль версий схемы
└─────────────────┘
```

**Ключевые файлы:**
- `src/database/models/` - Модели данных
- `src/database/connection.js` - Подключение к БД
- `migrations/` - Миграции базы

## 🔄 Рабочий процесс (Workflow)

### 1. Регистрация пользователя
```
Пользователь → /start → Bot Handler
    ↓
FSM State: gender → age → height → weight → main_goal
    ↓
Открытые вопросы: motivation_level → motivation_type → workout_frequency
    ↓
Личные предпочтения: favorite_foods → disliked_foods
    ↓
Автоматический расчет норм → Сохранение профиля → Активация уведомлений
```

### 2. Анализ приема пищи
```
Текст от пользователя → Input Validation → AI Analyzer
    ↓
NLP Processing → Nutrition Calculation → Database Save
    ↓
Motivational Response → Statistics Calculation → Telegram Send
```

### 3. Ежедневные уведомления
```
Cron Scheduler → User Check → Personalized Message Generation
    ↓
AI Coach Engine → Motivation Analysis → Telegram Notification
```

## 🗃️ Модели данных

### User Model
```javascript
{
  id: PRIMARY_KEY,
  telegramId: INTEGER UNIQUE NOT NULL,  // Телеграм ID
  // Базовая информация
  age: INTEGER,
  gender: ENUM('male', 'female', 'other'),
  height: FLOAT,  // см
  weight: FLOAT,  // кг
  // Цели (по тренеру)
  targetCaloriesPerDay: INTEGER,
  targetProtein: FLOAT,
  targetFat: FLOAT,
  targetCarbs: FLOAT,
  // Coach данные
  mainGoal: ENUM('lose_weight', 'gain_muscle', 'maintain', 'health'),
  currentMotivationLevel: ENUM('low', 'medium', 'high'),
  motivationType: ENUM('achievement', 'health', 'appearance', 'comfort'),
  // Предпочтения
  favoriteFoods: JSON_ARRAY,
  dislikedFoods: JSON_ARRAY,
  workoutFrequency: INTEGER,
  // Системные поля
  state: STRING,  // FSM состояние
  notificationsEnabled: BOOLEAN,
  timezone: STRING
}
```

### Meal Model
```javascript
{
  id: PRIMARY_KEY,
  userId: FOREIGN_KEY → User.id,
  date: DATETIME,
  mealType: ENUM('breakfast', 'lunch', 'dinner', 'snack'),
  // Пищевая ценность
  calories: FLOAT,
  protein: FLOAT,
  fat: FLOAT,
  carbs: FLOAT,
  // Мета данные
  description: TEXT,
  photoPath: STRING,
  aiAnalysis: JSON
}
```

### Progress Model
```javascript
{
  id: PRIMARY_KEY,
  userId: FOREIGN_KEY → User.id,
  date: DATE UNIQUE(user_id, date),
  // Измерения тела
  weight: FLOAT,
  bodyFatPercentage: FLOAT,
  // Ежедневные итоги
  totalCalories: FLOAT NOT NULL DEFAULT 0,
  totalProtein: FLOAT NOT NULL DEFAULT 0,
  totalFat: FLOAT NOT NULL DEFAULT 0,
  totalCarbs: FLOAT NOT NULL DEFAULT 0,
  workoutsCount: INTEGER NOT NULL DEFAULT 0,
  // Заметки
  notes: TEXT,
  motivationRating: INTEGER  // 1-5 рейтинг мотивации
}
```

### Notification Model
```javascript
{
  id: PRIMARY_KEY,
  userId: FOREIGN_KEY → User.id,
  type: ENUM('morning', 'reminder', 'motivation', 'achievement'),
  scheduledTime: DATETIME NOT NULL,
  sentAt: DATETIME,
  status: ENUM('pending', 'sent', 'cancelled', 'failed'),
  message: TEXT,
  metadata: JSON  // Дополнительные данные для персонализации
}
```

## ⚙️ Конфигурация и окружения

### Переменные окружения

#### Telegram Bot
```env
BOT_TOKEN=ваш_bo_token
WEBHOOK_URL=  # Для production
WEBHOOK_PORT=3000
```

#### AI Integration
```env
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_VISION_MODEL=gpt-4-vision-preview
```

#### Database
```env
DATABASE_URL=sqlite:///./eat_bot.db
NODE_ENV=development
```

### Production vs Development
- **Development**: Polling, verbose logging, local DB
- **Production**: Webhook, optimized logging, prod DB

## 🛡️ Безопасность и отказоустойчивость

### Валидация данных
- Input sanitization во всех endpoints
- Rate limiting: max 100 requests/day per user
- AI API fallbacks при недоступности

### Обработка ошибок
- Graceful error handling с логированием
- User-friendly сообщения об ошибках
- Retry логик для внешних API

### Безопасность
- Secrets в environment variables
- Input validation against injection
- GPT API через OpenRouter proxy

## 📈 Масштабируемость

### Текущая архитектура
- Поддерживает 1000+ пользователей
- SQLite с индексами для быстрых запросов
- Asynchronously обработка всех операций

### Будущие улучшения
- PostgreSQL для production scale
- Redis для session storage
- Microservices architecture
- Load balancing

## 🔧 Разработка

### Стандарты кода
- ESLint для code quality
- Prettier для formatting
- JSDoc для документации функций
- Git Flow для branching strategy

### Testing стратегия
- Unit tests для util функций
- Integration tests для AI services
- E2E tests для telegram workflows

## 📊 Мониторинг

### Метрики
- Response time для AI calls
- User engagement (daily active users)
- Error rates и success rates
- Database query performance

### Логирование
- Winston для structured logging
- Error tracking с stack traces
- Performance monitoring
