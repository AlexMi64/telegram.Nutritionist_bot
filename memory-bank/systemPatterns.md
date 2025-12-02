# Системные Паттерны - Eat_bot

## Архитектурная организация

Проект Eat_bot использует модульную архитектуру с четким разделением ответственности, следуя принципам SOLID и DDD.

### 📦 **Архитектурные компоненты**

```
Eat_bot/
├── 🧠 Core Layer (ядро)
│   ├── config/          # Конфигурации и константы
│   └── lang/           # Интернационализация
├── 📋 Business Layer   # Бизнес-логика
│   └── controllers/    # Контроллеры обработки
├── 🗄️ Data Layer       # Доступ к данным
│   └── database/       # Модели и миграции
├── 🔧 Service Layer    # Внешние сервисы
│   └── services/       # OpenAI, Scheduler, etc.
└── 📚 Presentation     # Документация
    └── docs/
```

## Ключевые архитектурные паттерны

### 🔄 **Контроллерный паттерн**
```javascript
// Паттерн контроллеров в Eat_bot
class Controller {
  async handle(request) {
    try {
      // 1. Валидация и подготовка данных
      const data = await this.validateRequest(request);

      // 2. Вызов бизнес-логики
      const result = await this.processData(data);

      // 3. Формирование ответа
      return await this.formatResponse(result);
    } catch (error) {
      await this.handleError(error, request);
    }
  }
}
```
**Реализовано в**: `controllers/commandHandlers.js`, `controllers/onboardingController.js`, `controllers/foodAnalysisController.js`

### 🌐 **Локализационный паттерн**
```javascript
// Паттерн использования интернационализации
const t = require('../config/lang').t;

// Вместо хардкода:
await bot.sendMessage(chatId, "Привет!");

// Используем ключи:
await bot.sendMessage(chatId, t('welcome.greeting'));

// С параметрами:
await bot.sendMessage(chatId, t('stats.calories', {calories: 2500}));
```
**Преимущества**:
- Легкое добавление новых языков
- Централизованное управление текстами
- Удобство для переводчиков

### 🛡️ **Ошибка-first паттерн**
```javascript
// Паттерн обработки ошибок
async function handleCommand(bot, user) {
  try {
    // Основная логика
    const result = await processCommand(user);
    await sendSuccessMessage(bot, user, result);
  } catch (error) {
    // Всегда обрабатываем ошибки
    const errorKey = mapErrorToKey(error);
    await bot.sendMessage(user.chatId, t(errorKey));
    await logError(error); // Логируем для debugging
  }
}
```
**Реализовано в**: Всех контроллерах, сервисах

### ⚙️ **Конфигурационный паттерн**
```javascript
// Паттерн использования конфигураций
const { CONSTANTS, ConstantsUtils } = require('../config/constants');

// Вместо магических чисел:
if (age < 10 && age > 120) { ... }

// Используем константы:
if (age < CONSTANTS.VALIDATION.AGE.MIN ||
    age > CONSTANTS.VALIDATION.AGE.MAX) { ... }

// Бизнес-логика вынесена в утилиты:
const targets = ConstantsUtils.calculateDailyTargets(bmr, weight, frequency);
```

## Системные интерфейсы

### 🎯 **Интерфейсы контроллеров**
```javascript
interface Controller {
  async handle(bot, msg|user, text, chatId): Promise<void>
}

interface ErrorHandler {
  async handle(error, context): Promise<void>
}
```

### 🔧 **Интерфейсы сервисов**
```javascript
interface AIService {
  async analyzeFood(text: string): Promise<AnalysisResult>
  async generateMotivation(user): Promise<string>
}

interface NotificationService {
  async schedule(user, type, time): Promise<boolean>
  async cancel(userId): Promise<boolean>
}
```

### 📊 **Модели данных**
```javascript
// Паттерн моделей с валидацией
const UserSchema = {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  telegramId: { type: DataTypes.INTEGER, unique: true },
  gender: {
    type: DataTypes.ENUM,
    values: Object.values(CONSTANTS.GENDERS)
  },
  state: {
    type: DataTypes.ENUM,
    values: Object.values(CONSTANTS.ONBOARDING_STATES)
  }
};
```

## Технические паттерны

### 🚀 **Асинхронные операции**
```javascript
// Паттерн async/await с graceful error handling
async function apiCall() {
  const timeout = TIMEOUT_MS;
  const [safeCall, safeTimeout] = await Promise.all([
    Promise.race([
      callExternalAPI(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API_TIMEOUT')), timeout)
      )
    ]),
    new Promise(resolve =>
      setTimeout(() => resolve('TIMEOUT'), timeout)
    )
  ]);

  return safeCall || handleFallback();
}
```

### 🧩 **Модульная структура**
```javascript
// Паттерн импортов для readability
const { User, Meal } = require('../database/models');
const { CONSTANTS, ConstantsUtils } = require('../config/constants');
const { t } = require('../config/lang');

// Вместо одного большого require:
// const everything = require('../config');
// everything.CONSTANTS... everything.t()...

module.exports = { handleFoodAnalysis };
```

### 🔄 **Потоки данных**

#### Onboarding Flow
```
Telegram Msg → CommandHandlers → OnboardingController → User Model
      ↓                                               ↓
    Validation ← ConstantsUtils ← User Validation ← DB Save
```

#### Food Analysis Flow
```
Text Input → FoodAnalysisController → OpenAI API → AI Processing
      ↓                                                     ↓
    MealModel ← Save Meal ← Nutrition Calculation ← User Model
```

#### Statistics Flow
```
/stats Command → CommandHandlers → User Query → Calculate Stats
      ↓                                                 ↓
    Format Response ← t() Localization ← Load User Data ← DB
```

## Безопасность и валидация

### 🛡️ **Валидационные паттерны**
```javascript
// Паттерн многоуровневой валидации
function validateInput(input) {
  // 1. Типизация
  if (typeof input !== 'string') throw new Error('INVALID_TYPE');

  // 2. Форматирование
  const cleaned = input.trim().toLowerCase();

  // 3. Бизнес-правила
  if (!meetsBusinessRules(cleaned)) throw new Error('BUSINESS_RULE_VIOLATION');

  // 4. Системные границы
  if (cleaned.length > MAX_LENGTH) throw new Error('TOO_LONG');

  return cleaned;
}
```

## Производительность

### ⚡ **Кеширование паттерны**
```javascript
// Паттерн кеширования для тяжелых операций
const userCache = new MemoryCache(TTL_MINUTES);

async function getUserWithCache(telegramId) {
  let user = userCache.get(telegramId);

  if (!user) {
    user = await User.findOne({ where: { telegramId } });
    userCache.set(telegramId, user, TTL_MINUTES);
  }

  return user;
}
```

### 📊 **Батчинг паттерны**
```javascript
// Паттерн групповой обработки для API оптимизации
async function batchProcess(items, batchSize = 10) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResult = await Promise.all(batch.map(processItem));
    results.push(...batchResult);
  }

  return results;
}
```

## Мониторинг и логирование

### 📝 **Паттерны логирования**
```javascript
// Структурированное логирование
const logger = {
  info: (msg, data = {}) =>
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`, data),

  error: (msg, error) =>
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`,
                  { error: error.message, stack: error.stack }),

  userAction: (userId, action, data) =>
    console.log(`[USER:${userId}] ${action}`, data)
};
```

## Интеграционные паттерны

### 🤖 **Telegram Bot API**
- Обработка сообщений через polling/long polling
- Graceful handling of Telegram API limits
- Retry mechanisms for network failures

### 🧠 **AI Service Integration**
- Circuit breaker pattern для API защиты
- Fallback responses при недоступности AI
- Response time monitoring и оптимизация

*Эти паттерны формируют основу для масштабируемой, поддерживаемой и эффективной системы Eat_bot.*
