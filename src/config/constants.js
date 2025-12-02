// Константы проекта Eat_bot
const CONSTANTS = {
  // Состояния онбординга и диалогов
  ONBOARDING_STATES: {
    GENDER: 'gender',
    AGE: 'age',
    HEIGHT: 'height',
    WEIGHT: 'weight',
    MAIN_GOAL: 'main_goal',
    CURRENT_MOTIVATION_LEVEL: 'current_motivation_level',
    MOTIVATION_TYPE: 'motivation_type',
    WORKOUT_FREQUENCY: 'workout_frequency',
    CURRENT_DIET_METHOD: 'current_diet_method',
    FAVORITE_FOODS: 'favorite_foods',
    DISLIKED_FOODS: 'disliked_foods',
    AWAITING_FOOD_DETAILS: 'awaiting_food_details',
    AWAITING_FOOD_TYPE: 'awaiting_food_type',
    AWAITING_FOOD_WEIGHT: 'awaiting_food_weight'
  },

  // Цели питания
  GOALS: {
    LOSE_WEIGHT: 'lose_weight',
    GAIN_MUSCLE: 'gain_muscle',
    MAINTAIN: 'maintain',
    HEALTH: 'health'
  },

  // Уровни мотивации
  MOTIVATION_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  },

  // Типы мотивации
  MOTIVATION_TYPES: {
    ACHIEVEMENT: 'achievement',
    HEALTH: 'health',
    APPEARANCE: 'appearance',
    COMFORT: 'comfort'
  },

  // Пол пользователя
  GENDERS: {
    MALE: 'male',
    FEMALE: 'female'
  },

  // Типы приемов пищи
  MEAL_TYPES: {
    BREAKFAST: 'breakfast',
    LUNCH: 'lunch',
    DINNER: 'dinner',
    SNACK: 'snack'
  },

  // Типы уведомлений
  NOTIFICATION_TYPES: {
    MORNING: 'morning',
    MIDDAY: 'midday',
    EVENING: 'evening',
    REMINDER: 'reminder',
    MOTIVATION: 'motivation',
    ACHIEVEMENT: 'achievement'
  },

  // Ключи для сопоставления текста с константами
  TEXT_TO_CONSTANTS: {
    // Пол
    gender: {
      'муж': 'male',
      'мужчина': 'male',
      'жен': 'female',
      'женщина': 'female',
      'male': 'male',
      'female': 'female'
    },

    // Цели
    goal: {
      'похудеть': 'lose_weight',
      'lose_weight': 'lose_weight',
      'снизить вес': 'lose_weight',
      'набрать': 'gain_muscle',
      'gain_muscle': 'gain_muscle',
      'мышечную': 'gain_muscle',
      'поддерживать': 'maintain',
      'maintain': 'maintain',
      'здоровье': 'health',
      'health': 'health'
    },

    // Уровень мотивации
    motivationLevel: {
      '1': 'low',
      'низкий': 'low',
      'low': 'low',
      '2': 'medium',
      'средний': 'medium',
      'medium': 'medium',
      '3': 'high',
      'высокий': 'high',
      'high': 'high'
    },

    // Тип мотивации
    motivationType: {
      'достижения': 'achievement',
      'результаты': 'achievement',
      'здоровье': 'health',
      'health': 'health',
      'внешнего': 'appearance',
      'внешний': 'appearance',
      'вид': 'appearance',
      'удобство': 'comfort',
      'комфорт': 'comfort'
    }
  },

  // Настройки формулы Mifflin-St Jeor
  BMR_FORMULA: {
    MALE_BASE: 5,
    FEMALE_BASE: -161,
    WEIGHT_MULTIPLIER: 10,
    HEIGHT_MULTIPLIER: 6.25,
    AGE_MULTIPLIER: -5
  },

  // Множители активности для BMR
  ACTIVITY_MULTIPLIERS: {
    0: 1.2,   // Сидячий образ жизни
    1: 1.375, // Легкая активность (1-2 раза в неделю)
    2: 1.55,  // Средняя активность (3-4 раза в неделю)
    3: 1.725, // Высокая активность (5-6 раз в неделю)
    4: 1.725, // Очень высокая активность
    5: 1.725  // Экстремальная активность
  },

  // Кэффициенты для расчета норм питания
  NUTRITION_RATIOS: {
    DEFAULT_PROTEIN_PER_KG: 1.8, // г белка на кг веса
    FAT_CALORIE_RATIO: 0.25,      // 25% калорий из жиров
    CARB_CALORIE_RATIO: 0.55,     // 55% калорий из углеводов
    FAT_CALORIES_PER_GRAM: 9,     // калорий в 1г жира
    CARB_CALORIES_PER_GRAM: 4     // калорий в 1г углеводов
  },

  // Основные команды бота
  COMMANDS: {
    START: '/start',
    HELP: '/help',
    STATS: '/stats',
    SETTINGS: '/settings',
    ENABLE_NOTIFICATIONS: '/enable_notifications',
    DISABLE_NOTIFICATIONS: '/disable_notifications'
  },

  // Регулярные выражения
  REGEX: {
    COMMAND: /^\/[a-zA-Z_]+/,
    NUMBER: /^\d+$/
  },

  // Валидационные пределы
  VALIDATION: {
    AGE: { MIN: 0, MAX: 120 },
    HEIGHT: { MIN: 100, MAX: 250 }, // см
    WEIGHT: { MIN: 20, MAX: 300 },  // кг
    WORKOUT_FREQUENCY: { MIN: 0, MAX: 7 }, // раз в неделю
    FOOD_DESCRIPTION_LENGTH: { MIN: 2, MAX: 500 } // символов
  },

  // Вероятности и настройки
  PROBABILITIES: {
    MOTIVATION_MESSAGE_CHANCE: 0.3, // 30% шанс отправки мотивационного сообщения
    RANDOM_RANGE_MIN: 0,
    RANDOM_RANGE_MAX: 1
  },

  // Таймауты и лимиты
  TIMEOUTS: {
    AI_REQUEST: 30000,        // 30 секунд на AI запрос
    RETRY_ATTEMPTS: 3,        // 3 попытки повтора
    DATABASE_TIMEOUT: 60000,  // 60 секунд на DB запросы
    FOOD_DETAILS_TIMEOUT: 10  // 10 минут на уточнение еды
  },

  // Настройки планировщика
  SCHEDULER: {
    TIMEZONE: 'Europe/Moscow',
    MORNING_HOUR: 7,
    MIDDAY_HOUR: 12,
    EVENING_HOUR: 19,
    REMINDER_INTERVAL_HOURS: 4,
    MAX_NOTIFICATIONS_PER_DAY: 4
  },

  // Пути к файлам и директориям
  PATHS: {
    DATABASE_FILE: './eat_bot.db',
    LOGS_DIR: './logs',
    CONFIG_DIR: './config',
    MIGRATIONS_DIR: './migrations',
    SEEDERS_DIR: './seeders'
  },

  // Настройки базы данных
  DATABASE: {
    DIALECT: 'sqlite',
    POOL_MAX: 5,
    POOL_MIN: 1,
    ACQUIRE_TIMEOUT: 60000,
    IDLE_TIMEOUT: 10000
  },

  // API пределы и ключи
  API: {
    MAX_FOOD_PHOTOS: 10,        // Максимум фото на анализ
    MAX_VOICE_DURATION: 300,    // Максимум 5 минут голосового
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
    TELEGRAM_API_TIMEOUT: 5000  // 5 секунд на Telegram API
  },

  // Сообщения об ошибках
  ERROR_MESSAGES: {
    USER_NOT_STARTED: 'Сначала запустите бота командой /start',
    DATABASE_ERROR: 'Ошибка базы данных',
    AI_SERVICE_UNAVAILABLE: 'AI сервис временно недоступен',
    INVALID_INPUT: 'Некорректный ввод',
    RATE_LIMIT_EXCEEDED: 'Превышен лимит запросов'
  },

  // Уровни логирования
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },

  // HTTP статус коды
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  }
};

// Функции-утилиты для работы с константами
const ConstantsUtils = {
  // Получение текстового представления константы
  getGoalText: (goalKey) => {
    const labels = {
      'lose_weight': 'Похудеть и снизить вес',
      'gain_muscle': 'Набрать мышечную массу',
      'maintain': 'Поддерживать текущий вес',
      'health': 'Улучшить здоровье и питание'
    };
    return labels[goalKey] || goalKey;
  },

  getMotivationText: (levelKey) => {
    const labels = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return labels[levelKey] || levelKey;
  },

  getMotivationTypeText: (typeKey) => {
    const labels = {
      'achievement': 'Достижения и результаты',
      'health': 'Забота о здоровье',
      'appearance': 'Улучшение внешнего вида',
      'comfort': 'Удобство и комфорт'
    };
    return labels[typeKey] || typeKey;
  },

  getLanguageName: (langKey) => {
    const labels = {
      'ru': 'Русский',
      'en': 'English',
      'uk': 'Українська'
    };
    return labels[langKey] || langKey;
  },

  // Проверка валидности
  isValidState: (state) => {
    return Object.values(CONSTANTS.ONBOARDING_STATES).includes(state);
  },

  isValidGoal: (goal) => {
    return Object.values(CONSTANTS.GOALS).includes(goal);
  },

  isValidMotivationLevel: (level) => {
    return Object.values(CONSTANTS.MOTIVATION_LEVELS).includes(level);
  },

  isValidMotivationType: (type) => {
    return Object.values(CONSTANTS.MOTIVATION_TYPES).includes(type);
  },

  // Преобразования текста в константы
  textToGender: (text) => {
    return CONSTANTS.TEXT_TO_CONSTANTS.gender[text.toLowerCase().trim()];
  },

  textToGoal: (text) => {
    const normalized = text.toLowerCase().trim();
    return CONSTANTS.TEXT_TO_CONSTANTS.goal[normalized] ||
           Object.keys(CONSTANTS.TEXT_TO_CONSTANTS.goal).find(key =>
             normalized.includes(key)) ?
           CONSTANTS.TEXT_TO_CONSTANTS.goal[
             Object.keys(CONSTANTS.TEXT_TO_CONSTANTS.goal).find(key =>
               normalized.includes(key))
           ] : null;
  },

  textToMotivationLevel: (text) => {
    const normalized = text.toLowerCase().trim();
    return CONSTANTS.TEXT_TO_CONSTANTS.motivationLevel[normalized];
  },

  textToMotivationType: (text) => {
    const normalized = text.toLowerCase().trim();
    return Object.keys(CONSTANTS.TEXT_TO_CONSTANTS.motivationType).find(key =>
             normalized.includes(key)) ?
           CONSTANTS.TEXT_TO_CONSTANTS.motivationType[
             Object.keys(CONSTANTS.TEXT_TO_CONSTANTS.motivationType).find(key =>
               normalized.includes(key))
           ] : null;
  },

  // Расчеты BMR
  calculateBMR: (age, gender, height, weight) => {
    let bmr;
    if (gender === CONSTANTS.GENDERS.MALE) {
      bmr = CONSTANTS.BMR_FORMULA.WEIGHT_MULTIPLIER * weight +
            CONSTANTS.BMR_FORMULA.HEIGHT_MULTIPLIER * height +
            CONSTANTS.BMR_FORMULA.AGE_MULTIPLIER * age +
            CONSTANTS.BMR_FORMULA.MALE_BASE;
    } else {
      bmr = CONSTANTS.BMR_FORMULA.WEIGHT_MULTIPLIER * weight +
            CONSTANTS.BMR_FORMULA.HEIGHT_MULTIPLIER * height +
            CONSTANTS.BMR_FORMULA.AGE_MULTIPLIER * age +
            CONSTANTS.BMR_FORMULA.FEMALE_BASE;
    }
    return Math.round(bmr);
  },

  // Расчет ежедневных норм
  calculateDailyTargets: (bmr, weight, activityLevel = 2) => {
    const activityMultiplier = CONSTANTS.ACTIVITY_MULTIPLIERS[activityLevel] || CONSTANTS.ACTIVITY_MULTIPLIERS[2];
    const totalCalories = Math.round(bmr * activityMultiplier);

    return {
      caloriesPerDay: totalCalories,
      protein: Math.round(weight * CONSTANTS.NUTRITION_RATIOS.DEFAULT_PROTEIN_PER_KG),
      fat: Math.round((totalCalories * CONSTANTS.NUTRITION_RATIOS.FAT_CALORIE_RATIO) / CONSTANTS.NUTRITION_RATIOS.FAT_CALORIES_PER_GRAM),
      carbs: Math.round((totalCalories * CONSTANTS.NUTRITION_RATIOS.CARB_CALORIE_RATIO) / CONSTANTS.NUTRITION_RATIOS.CARB_CALORIES_PER_GRAM)
    };
  }
};

module.exports = { CONSTANTS, ConstantsUtils };
