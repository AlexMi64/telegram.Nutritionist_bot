// Контроллер анализа еды - обработка приемов пищи
const { User, Meal } = require('../database/models');
const { CONSTANTS, ConstantsUtils } = require('../config/constants');
const { t } = require('../config/lang');

// Функции проверки необходимости уточнения деталей еды

// Список общих терминов продуктов, требующих уточнения типа
const genericFoods = [
  "мясо", "рыба", "сыр", "хлеб", "молоко", "масло", "салат",
  "макароны", "рис", "грибы", "овощи", "фрукты", "яйца",
  "картофель", "крупа", "мука", "сосиски", "колбаса", "пельмени"
];

// Проверка необходимости уточнения типа продукта
function needsTypeClarification(text) {
  const textLower = text.toLowerCase().trim();

  // Проверить, содержит ли текст общие термины продуктов
  const containsGenericFood = genericFoods.some(food =>
    textLower.includes(food) &&
    // Проверить, есть ли дополнительные детали после термина
    textLower.split(' ').length <= 2
  );

  return containsGenericFood;
}

// Проверка необходимости уточнения веса продукта
function needsWeightClarification(text) {
  const hasNumbers = /\d+/.test(text);
  return !hasNumbers;
}

// Устаревшая функция - оставлена для совместимости, но не используется
function needsFoodClarification(text, analysis) {
  console.warn('needsFoodClarification is deprecated, use needsTypeClarification + needsWeightClarification');
  return needsTypeClarification(text) || needsWeightClarification(text);
}

// Основной обработчик анализа еды
async function handleFoodAnalysis(bot, user, text, chatId) {
  try {
    // Шаг 1: Проверить необходимость уточнения типа
    if (needsTypeClarification(text)) {
      console.log(`🍽️ Требуется уточнение типа для: "${text}"`);
      return await sendFoodTypeClarification(bot, user, text, chatId);
    }

    // Шаг 2: Сначала поиск в локальной базе данных
    const localFoodSearch = require('../services/localFoodSearchService');
    console.log(`🍽️ Проверяем локальную БД для: "${text}"`);
    const localNutrition = await localFoodSearch.searchAndGetNutrition(text);

    if (localNutrition && localNutrition.per100g.calories.amount > 0) {
      console.log(`✅ Найден продукт в локальной БД: "${localNutrition.foodInfo.name}"`);

      // Шаг 3: Проверить необходимость уточнения веса
      if (needsWeightClarification(text)) {
        console.log(`🍽️ Требуется уточнение веса для локального продукта: "${text}"`);
        // Создаем анализ объект для локального продукта
        const analysis = {
          success: true,
          analysis: {
            description: localNutrition.foodInfo.name,
            total: {
              calories: localNutrition.per100g.calories.amount,
              protein: localNutrition.per100g.protein.amount,
              fat: localNutrition.per100g.fat.amount,
              carbs: localNutrition.per100g.carbs.amount
            }
          },
          source: `Local Database (${localNutrition.foodInfo.fdcId})`
        };
        return await sendFoodWeightClarification(bot, user, text, analysis, chatId);
      }

      // Шаг 4: Вес есть, показываем подтверждение локальных данных
      console.log(`🍽️ Показываем данные локального продукта: "${text}"`);
      const analysis = {
        success: true,
        analysis: {
          description: localNutrition.foodInfo.nameRu || localNutrition.foodInfo.name, // Prefer Russian name
          total: {
            calories: localNutrition.per100g.calories.amount,
            protein: localNutrition.per100g.protein.amount,
            fat: localNutrition.per100g.fat.amount,
            carbs: localNutrition.per100g.carbs.amount
          }
        },
        source: `Local Database (${localNutrition.foodInfo.fdcId})`
      };
      return await sendFoodConfirmationMessage(bot, user, analysis.analysis.description, analysis, chatId);
    }

    // Шаг 5: Нед найден в локальной БД, делаем анализ через AI
    console.log(`🍽️ В локальной БД не найден, отправляем в AI: "${text}"`);
    await bot.sendMessage(chatId, t('food.analyzing'));
    const { analyzeFoodText, generateMotivation, validateAnalysisResult } = require('../services/openaiService');

    // Добавим "100г" к запросу для AI
    const textWithWeight = needsWeightClarification(text) ? `${text} 100г` : text;
    console.log(`🍽️ Отправляем в AI: "${textWithWeight}"`);

    const analysis = await analyzeFoodText(textWithWeight);

    if (!analysis.success) {
      const errorText = analysis.error || 'Неизвестная ошибка анализа';
      const errorMsg = t('food.error.analysis', {error: errorText}) + '\n\n' +
        t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
        t('food.error.try_again');
      await bot.sendMessage(chatId, errorMsg);
      return;
    }

    // Проверить на корректность данных
    const { calories, protein, fat, carbs } = analysis.analysis.total;
    const hasInvalidData = !calories && !protein && !fat && !carbs;
    if (hasInvalidData) {
      const errorMsg = t('food.error.analysis', {error: 'Не удалось определить пищевую ценность. Попробуйте описать подробнее.'}) + '\n\n' +
        t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
        t('food.error.try_again');
      await bot.sendMessage(chatId, errorMsg);
      return;
    }

    // Валидация результата анализа
    if (!validateAnalysisResult(analysis, textWithWeight)) {
      console.error('Analysis result validation failed:', analysis);
      const errorMsg = t('food.error.analysis', {error: 'Результат анализа некорректен. Попробуйте переформулировать запрос.'}) + '\n\n' +
        t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
        t('food.error.try_again');
      await bot.sendMessage(chatId, errorMsg);
      return;
    }

    // Шаг 6: Проверить необходимость уточнения веса
    if (needsWeightClarification(text)) {
      console.log(`🍽️ Требуется уточнение веса для AI анализа: "${text}"`);
      return await sendFoodWeightClarification(bot, user, text, analysis, chatId);
    }

    // Шаг 7: Все данные есть - сохранить AI анализ в БД для будущих запросов
    console.log(`🍽️ Все данные готовы для AI анализа: "${text}"`);

    // Извлечь чистое название продукта (без веса)
    const cleanProductName = text.replace(/\d+\s*г[^\w]*$/gi, '').trim();

    // Сохранить результаты AI анализа в БД асинхронно (не блокирует ответ)
    saveAIAnalysisToDatabase(cleanProductName, analysis).catch(error =>
      console.error(`Ошибка при сохранении AI анализа продукта "${cleanProductName}" в БД:`, error)
    );

    await sendFoodConfirmationMessage(bot, user, text, analysis, chatId);

  } catch (error) {
    console.error('Ошибка анализа еды:', error);
    await bot.sendMessage(chatId, t('food.error.general'));
  }
}

// Сохранение приема пищи в базу данных
async function saveMeal(user, description, analysis) {
  try {
    const mealData = {
      userId: user.id,
      mealType: CONSTANTS.MEAL_TYPES.SNACK, // По умолчанию - перекус
      description: description,
      calories: isNaN(analysis.analysis.total.calories) ? 0 : analysis.analysis.total.calories,
      protein: isNaN(analysis.analysis.total.protein) ? 0 : analysis.analysis.total.protein,
      fat: isNaN(analysis.analysis.total.fat) ? 0 : analysis.analysis.total.fat,
      carbs: isNaN(analysis.analysis.total.carbs) ? 0 : analysis.analysis.total.carbs,
      aiAnalysis: JSON.stringify(analysis)
    };

    await Meal.create(mealData);
    console.log(`🍽️ Прием пищи сохранен для пользователя ${user.telegramId}`);

  } catch (error) {
    console.error('Ошибка сохранения приема пищи:', error);
    throw new Error(t('errors.db', {error: error.message}));
  }
}

// Функция saveMealLocally удалена, используем просто saveMeal

/**
 * Сохраняет результат AI анализа продукта в локальную БД для будущих запросов
 * @param {string} productName - Название продукта без веса
 * @param {object} analysis - Результат анализа от AI
 */
async function saveAIAnalysisToDatabase(productName, analysis) {
  try {
    const { FoodData: FoodDataModel, FoodNutrient: FoodNutrientModel, Nutrient: NutrientModel } = require('../database/models');

    // Проверить, есть ли уже такой продукт в БД
    const existingProduct = await FoodDataModel.findOne({
      where: {
        descriptionLower: productName.toLowerCase(),
        dataType: 'ai_analysis'
      }
    });

    if (existingProduct) {
      console.log(`📚 Продукт "${productName}" уже существует в БД, пропускаем сохранение`);
      return;
    }

    // Создать новый продукт
    const newProduct = await FoodDataModel.create({
      fdcId: Date.now() + Math.random(), // уникальный ID для AI данных
      dataType: 'ai_analysis',
      description: productName,
      descriptionEn: null, // AI не дает английских названий
      descriptionRu: productName, // Название на русском
      descriptionLower: productName.toLowerCase(),
      foodCategoryId: null, // Категория не определена
      publicationDate: new Date()
    });

    console.log(`💾 Сохранен продукт в БД: "${productName}" (ID: ${newProduct.id})`);

    // Получить или создать питательные вещества
    const nutrients = [
      { name: 'Калории', unitName: 'KCAL', nutrientNumber: 208 },
      { name: 'Белки', unitName: 'G', nutrientNumber: 203 },
      { name: 'Жиры', unitName: 'G', nutrientNumber: 204 },
      { name: 'Углеводы', unitName: 'G', nutrientNumber: 205 }
    ];

    // Данные из анализа (на 100г)
    const nutritionData = {
      calories: analysis.analysis.total.calories,
      protein: analysis.analysis.total.protein,
      fat: analysis.analysis.total.fat,
      carbs: analysis.analysis.total.carbs
    };

    // Сохранить питательные вещества для продукта
    for (const nutrientInfo of nutrients) {
      // Найти или создать питательное вещество
      let nutrient = await NutrientModel.findOne({
        where: { name: nutrientInfo.name }
      });

      if (!nutrient) {
        nutrient = await NutrientModel.create({
          fdcNutrientId: Date.now() + Math.random(),
          name: nutrientInfo.name,
          unitName: nutrientInfo.unitName,
          nutrientNumber: nutrientInfo.nutrientNumber,
          rank: null
        });
        console.log(`✅ Создано питательное вещество: ${nutrientInfo.name}`);
      }

      // Получить значение из анализа
      let amount = 0;
      switch (nutrientInfo.nutrientNumber) {
        case 203: amount = nutritionData.protein; break; // Белки
        case 204: amount = nutritionData.fat; break; // Жиры
        case 205: amount = nutritionData.carbs; break; // Углеводы
        case 208: amount = nutritionData.calories; break; // Калории
      }

      if (amount > 0) {
        await FoodNutrientModel.create({
          foodDataId: newProduct.id,
          nutrientId: nutrient.id,
          amount: amount,
          derivationId: null,
          min: null,
          max: null,
          units: nutrientInfo.unitName
        });
        console.log(`   + ${nutrientInfo.name}: ${amount} ${nutrientInfo.unitName}`);
      }
    }

    console.log(`🎉 Продукт "${productName}" сохранен в БД для будущих запросов`);
  } catch (error) {
    console.error('Ошибка сохранения AI анализа в БД:', error);
    // Не бросаем ошибку, сохранение в БД - опциональная функция
  }
}

// Отправка мотивационного сообщения
async function sendMotivationalMessage(bot, user, chatId) {
  try {
    // Импортируем здесь, чтобы избежать circular dependency
    const { generateMotivation } = require('../services/openaiService');

    // Получение сегодняшних приемов пищи для контекста мотивации
    const todaysNutrition = await getTodaysNutrition(user.id);

    // Генерация мотивационного сообщения
    const motivationMessage = await generateMotivation(user, todaysNutrition);

    if (motivationMessage) {
      await bot.sendMessage(chatId, `💪 ${motivationMessage}`);
      console.log(`💪 Мотивационное сообщение отправлено пользователю ${user.telegramId}`);
    }

  } catch (error) {
    console.error('Ошибка отправки мотивации:', error);
    // Не бросаем ошибку, мотивация - опциональная функция
  }
}

// Функция sendMotivationalMessageLocally удалена, используем sendMotivationalMessage

// Получение информации о сегодняшнем питании
async function getTodaysNutrition(userId) {
  console.log('🔍 Начало поиска питания для userId:', userId, 'типа:', typeof userId);

  try {
    // Используем прямой raw SQL запрос с фильтрацией по дате
    const { sequelize } = require('../database/connection');
    const query = `
      SELECT * FROM meals
      WHERE user_id = $userId
      AND date = date('now')
    `;

    const todaysMeals = await sequelize.query(query, {
      bind: { userId: parseInt(userId) }, // Убедимся что число
      type: sequelize.QueryTypes.SELECT
    });

    console.log('🍽️ Приемов пищи сегодня:', todaysMeals.length);
    todaysMeals.forEach(meal => {
      console.log(`   🥗 "${meal.description}": ${meal.calories} ккал`);
    });

    if (todaysMeals.length === 0) {
      console.log('📊 Проверяю все записи в meals для диагностики...');
      const allRecords = await sequelize.query('SELECT user_id, description, date FROM meals WHERE user_id = $userId ORDER BY date DESC LIMIT 10', {
        bind: { userId: parseInt(userId) },
        type: sequelize.QueryTypes.SELECT
      });
      console.log('Последние записи в meals для пользователя:', allRecords);
      console.log('Текущая дата сервера: date(\'now\') =', new Date().toISOString().split('T')[0]);
    }

    // Суммируем питательные вещества
    const totalNutrition = todaysMeals.reduce((acc, meal) => ({
      calories: acc.calories + (isNaN(Number(meal.calories)) ? 0 : Number(meal.calories || 0)),
      protein: acc.protein + (isNaN(Number(meal.protein)) ? 0 : Number(meal.protein || 0)),
      fat: acc.fat + (isNaN(Number(meal.fat)) ? 0 : Number(meal.fat || 0)),
      carbs: acc.carbs + (isNaN(Number(meal.carbs)) ? 0 : Number(meal.carbs || 0))
    }), {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    });

    console.log(`✅ Итоговое питание сегодня:`, totalNutrition);
    return totalNutrition;

  } catch (error) {
    console.error('Ошибка получения питания за сегодня:', error);
    console.error('Stack:', error.stack);
    return { calories: 0, protein: 0, fat: 0, carbs: 0 };
  }
}

// Отправка сообщения с подтверждением сохранения приема пищи
async function sendFoodConfirmationMessage(bot, user, description, analysis, chatId) {
  try {
    // Сохранить анализ для подтверждения
    const sequelize = require('../database/connection').sequelize;
    await sequelize.query(
      'UPDATE users SET pending_confirmation_analysis = ?, pending_confirmation_message_id = NULL WHERE telegram_id = ?',
      {
        replacements: [
          JSON.stringify(analysis),
          user.telegramId
        ]
      }
    );

    // Формирование текста анализа
    const analysisMessage = t('food.success.title') + '\n' +
      (analysis.analysis.description ? analysis.analysis.description + '\n' : '') +
      t('food.success.nutrition') + '\n' +
      '- ' + t('food.success.calories', {calories: analysis.analysis.total.calories}) + '\n' +
      '- ' + t('food.success.protein', {protein: analysis.analysis.total.protein}) + '\n' +
      '- ' + t('food.success.fat', {fat: analysis.analysis.total.fat}) + '\n' +
      '- ' + t('food.success.carbs', {carbs: analysis.analysis.total.carbs}) + '\n\n' +
      t('food.success.confirm');

    // Inline клавиатура с кнопками
    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: t('food.buttons.save_meal'),
          callback_data: 'save_meal'
        }],
        [{
          text: t('food.buttons.cancel_meal'),
          callback_data: 'cancel_meal'
        }]
      ]
    };

    // Отправить сообщение с клавиатурой
    const sentMessage = await bot.sendMessage(chatId, analysisMessage, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

    // Сохранить messageId для редактирования позже
    await sequelize.query(
      'UPDATE users SET pending_confirmation_message_id = ? WHERE telegram_id = ?',
      {
        replacements: [
          sentMessage.message_id,
          user.telegramId
        ]
      }
    );

    console.log(`📝 Сообщение с подтверждением отправлено пользователю ${user.telegramId}, messageId: ${sentMessage.message_id}`);

  } catch (error) {
    console.error('Ошибка отправки сообщения с подтверждением:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
}

// Функция отправки запроса уточнения типа продукта
async function sendFoodTypeClarification(bot, user, originalText, chatId) {
  try {
    // Устанавливаем состояние ожидания типа
    const sequelize = require('../database/connection').sequelize;
    await sequelize.query(
      'UPDATE users SET state = ?, pending_food_description = ?, food_details_timeout = ? WHERE telegram_id = ?',
      {
        replacements: [
          CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_TYPE,
          originalText,
          new Date(Date.now() + CONSTANTS.TIMEOUTS.FOOD_DETAILS_TIMEOUT * 60 * 1000),
          user.telegramId
        ]
      }
    );

    console.log(`🍽️ Установлено состояние awaiting_food_type для пользователя ${user.telegramId}: "${originalText}"`);

    // Формируем сообщение запроса типа
    const questionText = `Пожалуйста, уточните тип продукта "${originalText}":\n\n` +
      `• Какая конкретно ${originalText}? (например: говядина, курица, свинина для мяса)\n\n` +
      `Пример: "куриное мясо"`;

    // Inline клавиатура с кнопкой отмены
    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: '⭕ Отменить',
          callback_data: 'cancel_food_clarification'
        }]
      ]
    };

    await bot.sendMessage(chatId, questionText, { reply_markup: inlineKeyboard });
    console.log(`📝 Запрос типа для пользователя ${user.telegramId} по продукту: ${originalText}`);

  } catch (error) {
    console.error('Ошибка отправки запроса типа продукта:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
}

// Функция отправки запроса уточнения веса продукта
async function sendFoodWeightClarification(bot, user, description, analysis, chatId) {
  try {
    // Проверим текущее состояние пользователя перед установкой
    const sequelize = require('../database/connection').sequelize;
    const currentStateCheck = await sequelize.query(
      'SELECT state FROM users WHERE telegram_id = ?',
      {
        replacements: [user.telegramId],
        type: 'SELECT'
      }
    );

    const currentState = currentStateCheck[0]?.state;

    // Если пользователь уже в состоянии ожидания веса, не отправляем повторное сообщение
    if (currentState === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT) {
      console.log(`🍽️ Пользователь ${user.telegramId} уже ожидает вес - пропускаем повторный запрос`);
      return;
    }

    // Устанавливаем состояние ожидания веса и сохраняем анализ на 100г
    await sequelize.query(
      'UPDATE users SET state = ?, pending_food_description = ?, pending_analysis = ?, food_details_timeout = ? WHERE telegram_id = ?',
      {
        replacements: [
          CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT,
          description,
          JSON.stringify(analysis),
          new Date(Date.now() + CONSTANTS.TIMEOUTS.FOOD_DETAILS_TIMEOUT * 60 * 1000),
          user.telegramId
        ]
      }
    );

    console.log(`🍽️ Установлено состояние awaiting_food_weight для пользователя ${user.telegramId}: "${description}"`);

    // Формируем сообщение запроса веса
    const questionText = `Пожалуйста, укажите вес продукта "${description}" в граммах:`;

    // Inline клавиатура с кнопкой отмены
    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: '⭕ Отменить',
          callback_data: 'cancel_food_clarification'
        }]
      ]
    };

    await bot.sendMessage(chatId, questionText, { reply_markup: inlineKeyboard });
    console.log(`📝 Запрос веса для пользователя ${user.telegramId} по продукту: ${description}`);

  } catch (error) {
    console.error('Ошибка отправки запроса веса продукта:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
}

/**
 * Парсим вес из текста (цифры или слова)
 * @param {string} text - Текст для парсинга
 * @returns {number|null} - Вес в граммах или null если не разобрано
 */
function parseWeightText(text) {
  const trimmed = text.trim().toLowerCase();

  // Сначала пытаемся найти цифры с граммами или килограммами (в любом месте текста)
  const digitMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(г|кг|грамм?|килограмм?|kilogram|gram)/);
  if (digitMatch) {
    let weight = parseFloat(digitMatch[1]);
    const unit = digitMatch[2];

    // Конвертируем килограммы в граммы
    if (unit === 'кг' || unit === 'килограмм' || unit === 'килограмма' || unit === 'kilogram') {
      weight *= 1000;
    }

    return weight >= 1 && weight <= 10000 ? weight : null;
  }

  // Если единицы измерения не указаны, пробуем найти просто цифры
  const justDigits = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (justDigits) {
    const weight = parseFloat(justDigits[1]);
    return weight >= 1 && weight <= 10000 ? weight : null;
  }

  // Если цифр нет, пытаемся понять слова
  // Простые слова чисел
  const numberWords = {
    'один': 1, 'два': 2, 'три': 3, 'четыре': 4, 'пять': 5,
    'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
    'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15,
    'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20,
    'тридцать': 30, 'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60,
    'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
    'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400, 'пятьсот': 500,
    'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900
  };

  for (const [word, num] of Object.entries(numberWords)) {
    if ((trimmed.includes(word) && (trimmed.includes('г') || trimmed.includes('к') || trimmed === word || trimmed.includes('вес'))) ||
        trimmed === word) { // Allow words without units for backwards compatibility
      // Check if it's kilograms
      let weight = num;
      if (trimmed.includes('кг') || trimmed.includes('килограмм') || trimmed.includes('kilogram')) {
        weight *= 1000;
      }
      return weight >= 1 && weight <= 10000 ? weight : null;
    }
  }

  return null;
}

// Локальное умножение КБЖУ на вес пользователя
function scaleNutritionByWeight(analysis, userWeight) {
  if (!analysis || !analysis.analysis || !analysis.analysis.total) {
    throw new Error('Некорректный анализ для масштабирования');
  }

  const baseWeight = 100; // AI всегда возвращает на 100г
  const scaleFactor = userWeight / baseWeight;

  const scaled = {
    ...analysis,
    analysis: {
      ...analysis.analysis,
      description: analysis.analysis.description.replace(/(\d+)\s*г/gi, `${userWeight}г`),
      total: {
        calories: Math.round(analysis.analysis.total.calories * scaleFactor),
        protein: parseFloat((analysis.analysis.total.protein * scaleFactor).toFixed(1)),
        fat: parseFloat((analysis.analysis.total.fat * scaleFactor).toFixed(1)),
        carbs: parseFloat((analysis.analysis.total.carbs * scaleFactor).toFixed(1))
      }
    }
  };

  console.log(`⚖️ Масштабирование КБЖУ: ${baseWeight}г → ${userWeight}г (множитель: ${scaleFactor.toFixed(2)})`);
  console.log(`   Новое описание: "${scaled.analysis.description}"`);
  return scaled;
}

// Устаревшая функция - оставлена для совместимости
async function sendFoodClarificationQuestions(bot, user, originalText, analysis, chatId) {
  console.warn('sendFoodClarificationQuestions is deprecated, use sendFoodTypeClarification or sendFoodWeightClarification');
  return await sendFoodTypeClarification(bot, user, originalText, chatId);
}

// Функция обработки фото анализа еды
async function handlePhotoAnalysis(bot, user, msg, chatId) {
  try {
    await bot.sendMessage(chatId, t('food.photo.analyzing'));

    // Получить file_id из сообщения
    const photo = msg.photo;
    if (!photo || photo.length === 0) {
      await bot.sendMessage(chatId, t('food.photo.error.no_photo'));
      return;
    }

    // Брать последнее (наилучшее качество)
    const fileId = photo[photo.length - 1].file_id;
    console.log(`📸 Получено фото с file_id: ${fileId} от пользователя ${user.telegramId}`);

    // Импортируем ресурсы для анализа
    const { analyzeFoodImage } = require('../services/openaiService');

    try {
      // Получить URL файла через Telegram Bot API
      const fileLink = await bot.getFileLink(fileId);
      console.log(`📸 URL фото: ${fileLink}`);

      // Анализировать фото через AI
      const analysis = await analyzeFoodImage(fileLink, msg.caption || '');

      if (!analysis.success) {
        const errorText = analysis.error || t('food.photo.error.analysis_failed');
        await bot.sendMessage(chatId, `${t('food.photo.error.title')} ${errorText}\n\n${t('food.photo.error.try_text')}`);
        return;
      }

      // Проверить наличие описания
      if (!analysis.analysis || !analysis.analysis.description) {
        await bot.sendMessage(chatId, t('food.photo.error.no_description'));
        return;
      }

      // Если AI не вернул КБЖУ в структурированном виде, сделаем анализ на 100г текстового описания
      if (!analysis.analysis.total || !analysis.analysis.total.calories) {
        console.log(`⚠️ Фото не содержит КБЖУ, делаем анализ текста: "${analysis.analysis.description}"`);

        // Импортируем анализ текста
        const { analyzeFoodText, validateAnalysisResult } = require('../services/openaiService');

        // Добавляем 100г к описанию с фото
        const textAnalysis = await analyzeFoodText(`${analysis.analysis.description} 100г`);

        if (!textAnalysis.success) {
          const errorText = textAnalysis.error || t('food.photo.error.text_analysis_failed');
          await bot.sendMessage(chatId, `${t('food.photo.error.title')} ${errorText}\n\n${t('food.photo.error.try_text')}`);
          return;
        }

        // Проверить данные
        const { calories, protein, fat, carbs } = textAnalysis.analysis.total;
        const hasInvalidData = !calories && !protein && !fat && !carbs;
        if (hasInvalidData) {
          await bot.sendMessage(chatId, t('food.photo.error.invalid_data'));
          return;
        }

        if (!validateAnalysisResult(textAnalysis, `${analysis.analysis.description} 100г`)) {
          await bot.sendMessage(chatId, t('food.photo.error.invalid_analysis'));
          return;
        }

        // Теперь запросим вес у пользователя
        console.log(`📸 Фото разобрано, получен анализ на 100г: "${textAnalysis.analysis.description}"`);
        await sendFoodWeightClarification(bot, user, textAnalysis.analysis.description, textAnalysis, chatId);
      } else {
        // Фото анализ вернул полную КБЖУ структуру - сразу запрашиваем вес
        console.log(`📸 Фото проанализировано с КБЖУ: "${analysis.analysis.description}"`);
        await sendFoodWeightClarification(bot, user, analysis.analysis.description, analysis, chatId);
      }

    } catch (error) {
      console.error('Ошибка получения фото:', error);
      await bot.sendMessage(chatId, t('food.photo.error.download_failed'));
    }

  } catch (error) {
    console.error('Ошибка обработки фото анализа:', error);
    await bot.sendMessage(chatId, t('food.error.general'));
  }
}

// Функция обработки голосового анализа еды
async function handleVoiceAnalysis(bot, user, msg, chatId) {
  try {
    await bot.sendMessage(chatId, t('food.voice.analyzing'));

    // Получить voice объект из сообщения
    const voice = msg.voice;
    if (!voice || !voice.file_id) {
      await bot.sendMessage(chatId, t('food.voice.error.no_voice'));
      return;
    }

    console.log(`🎤 Получено голосовое сообщение с file_id: ${voice.file_id} от пользователя ${user.telegramId}`);
    console.log(`   Длительность: ${voice.duration} сек, размер: ${voice.file_size} байт`);

    // Импортируем voice service
    const { transcribeVoice, getVoiceFileUrl, validateVoiceMessage } = require('../services/voiceService');

    // Валидируем voice сообщение
    const validation = validateVoiceMessage(voice);
    if (!validation.valid) {
      await bot.sendMessage(chatId, `${t('food.voice.error.title')} ${validation.error}`);
      return;
    }

    try {
      // Получить URL файла через Telegram Bot API
      const fileUrl = await getVoiceFileUrl(bot, voice.file_id);
      console.log(`🎤 URL голосового файла: ${fileUrl}`);

      // Транскрибировать голос в текст
      const transcription = await transcribeVoice(fileUrl, voice.file_id);

      if (!transcription.success) {
        const errorText = transcription.error || t('food.voice.error.transcription_failed');
        await bot.sendMessage(chatId, `${t('food.voice.error.title')} ${errorText}\n\n${t('food.voice.error.try_text')}`);
        return;
      }

      const transcribedText = transcription.text;
      console.log(`� Голос транскрибирован в текст: "${transcribedText}"`);

      // Теперь обрабатываем транскрибированный текст как обычное текстовое сообщение
      console.log(`� Передаю транскрибированный текст в анализ еды: "${transcribedText}"`);

      // Обработка через стандартный анализ еды
      await handleFoodAnalysis(bot, user, transcribedText, chatId);

    } catch (error) {
      console.error('Ошибка получения голосового файла:', error);
      await bot.sendMessage(chatId, t('food.voice.error.download_failed'));
    }

  } catch (error) {
    console.error('Ошибка обработки голосового анализа:', error);
    await bot.sendMessage(chatId, t('food.error.general'));
  }
}

async function handleFoodDetailsResponse(bot, user, text, chatId) {
  try {
    // Перезагрузим пользователя из БД для получения актуального состояния
    const currentUser = await require('../database/models').User.findOne({ where: { telegramId: user.telegramId } });

    // Обработка отмены
    if (text === '⭕ Отменить') {
      await currentUser.update({
        pendingFoodDescription: null,
        pendingAnalysis: null,
        state: null,
        foodDetailsTimeout: null
      });
      await bot.sendMessage(chatId, 'Уточнение отменено. Просто отправьте описание еды.');
      console.log(`🍽️ Отмена уточнения для пользователя ${user.telegramId}`);
      return;
    }

    // Обработка разных состояний
    if (currentUser.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_TYPE) {
      // Пользователь уточняет тип продукта (например: "мясо" → "куриное мясо")
      console.log(`🍽️ Получен уточненный тип для пользователя ${user.telegramId}: "${text}"`);

      // Проверить новый текст на необходимость дальнейших уточнений
      if (needsTypeClarification(text)) {
        // Еще раз нужно уточнить тип
        await bot.sendMessage(chatId, `Тип "${text}" все еще слишком общий. Пожалуйста, уточните подробнее.`);
        return;
      }

      // Тип выглядит приемлемым, делаем анализ через AI
      await bot.sendMessage(chatId, t('food.analyzing'));
      const { analyzeFoodText, validateAnalysisResult } = require('../services/openaiService');

      // Добавляем 100г для анализа
      const textWithWeight = `${text} 100г`;
      console.log(`🍽️ Отправляем уточненный текст в AI: "${textWithWeight}"`);

      const analysis = await analyzeFoodText(textWithWeight);

      if (!analysis.success) {
        const errorText = analysis.error || 'Неизвестная ошибка анализа';
        const errorMsg = t('food.error.analysis', {error: errorText}) + '\n\n' +
          t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
          t('food.error.try_again');
        await bot.sendMessage(chatId, errorMsg);
        return;
      }

      // Проверить данные
      const { calories, protein, fat, carbs } = analysis.analysis.total;
      const hasInvalidData = !calories && !protein && !fat && !carbs;
      if (hasInvalidData) {
        const errorMsg = t('food.error.analysis', {error: 'Не удалось определить пищевую ценность. Попробуйте описать подробнее.'}) + '\n\n' +
          t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
          t('food.error.try_again');
        await bot.sendMessage(chatId, errorMsg);
        return;
      }

      if (!validateAnalysisResult(analysis, textWithWeight)) {
        console.error('Analysis result validation failed:', analysis);
        const errorMsg = t('food.error.analysis', {error: 'Результат анализа некорректен. Попробуйте переформулировать запрос.'}) + '\n\n' +
          t('food.error.examples').map(example => '• ' + example).join('\n') + '\n\n' +
          t('food.error.try_again');
        await bot.sendMessage(chatId, errorMsg);
        return;
      }

      // Анализ получен, теперь запросим вес
      await sendFoodWeightClarification(bot, currentUser, text, analysis, chatId);

    } else if (currentUser.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT) {
      // Пользователь указывает вес продукта
      console.log(`🍽️ Получен вес для пользователя ${user.telegramId}: "${text}"`);

      // Парсим вес (поддерживает цифры и слова)
      const userWeight = parseWeightText(text);
      if (!userWeight) {
        await bot.sendMessage(chatId, 'Пожалуйста, укажите вес цифрами или словами (например: 200, двести, сто пятьдесят)');
        return;
      }

      if (userWeight <= 0 || userWeight > 5000) {
        await bot.sendMessage(chatId, 'Пожалуйста, укажите корректный вес в граммах (от 1 до 5000г).');
        return;
      }

      // Получаем сохраненный анализ на 100г
      const baseAnalysis = JSON.parse(currentUser.pendingAnalysis);

      // Масштабируем КБЖУ на вес пользователя
      const scaledAnalysis = scaleNutritionByWeight(baseAnalysis, userWeight);

      // Сохранить результаты AI анализа в БД для будущих запросов (только для AI анализа)
      if (baseAnalysis.source !== 'Local Database' && baseAnalysis.source !== 'arhis_import') {
        // Используем описание из анализа AI вместо pendingFoodDescription
        const cleanProductName = baseAnalysis.analysis.description.replace(/\d+\s*г[^\w]*$/gi, '').trim();
        saveAIAnalysisToDatabase(cleanProductName, baseAnalysis).catch(error =>
          console.error(`Ошибка при сохранении AI анализа продукта "${cleanProductName}" в БД:`, error)
        );
      }

      // Очистить pending данные после сохранения AI анализа
      await currentUser.update({
        pendingFoodDescription: null,
        pendingAnalysis: null,
        state: null,
        foodDetailsTimeout: null
      });

      // Показать подтверждение с рассчитанными значениями
      console.log(`🍽️ Все данные собраны для пользователя ${user.telegramId}, показываем подтверждение`);
      await sendFoodConfirmationMessage(bot, currentUser, scaledAnalysis.analysis.description, scaledAnalysis, chatId);

    } else {
      // Неизвестное состояние - обработать как новый анализ
      console.warn(`🍽️ Неизвестное состояние для пользователя ${user.telegramId}: ${currentUser.state}`);
      return await handleFoodAnalysis(bot, currentUser, text, chatId);
    }

  } catch (error) {
    console.error('Ошибка обработки уточнения еды:', error);

    // Очистить состояние в случае ошибки
    try {
      await user.update({
        pendingFoodDescription: null,
        pendingAnalysis: null,
        state: null,
        foodDetailsTimeout: null
      });
    } catch (updateError) {
      console.error('Ошибка очистки состояния:', updateError);
    }

    await bot.sendMessage(chatId, t('errors.general'));
  }
}

// Функция обработки голосового уточнения веса
async function handleVoiceWeightClarification(bot, user, msg, chatId) {
  try {
    // Получить voice объект из сообщения
    const voice = msg.voice;
    if (!voice || !voice.file_id) {
      await bot.sendMessage(chatId, 'Не найдено голосовое сообщение');
      return;
    }

    console.log(`🎤 Получено голосовое уточнение веса с file_id: ${voice.file_id} от пользователя ${user.telegramId}`);

    // Импортируем voice service для транскрибации
    const { transcribeVoice, getVoiceFileUrl, validateVoiceMessage } = require('../services/voiceService');

    // Валидируем voice сообщение
    const validation = validateVoiceMessage(voice);
    if (!validation.valid) {
      await bot.sendMessage(chatId, `Ошибка голосового сообщения: ${validation.error}`);
      return;
    }

    try {
      // Получить URL файла через Telegram Bot API
      const fileUrl = await getVoiceFileUrl(bot, voice.file_id);

      // Транскрибировать голос в текст
      const transcription = await transcribeVoice(fileUrl, voice.file_id);

      if (!transcription.success) {
        const errorText = transcription.error || 'Не удалось транскрибировать голосовое сообщение';
        await bot.sendMessage(chatId, `Ошибка транскрибации: ${errorText}\nПопробуйте ввести вес текстом.`);
        return;
      }

      const transcribedText = transcription.text.trim();
      console.log(` Голосовое уточнение транскрибировано в текст: "${transcribedText}"`);

      // Теперь обрабатываем транскрибированный текст как ответ на уточнение веса
      await handleFoodDetailsResponse(bot, user, transcribedText, chatId);

    } catch (error) {
      console.error('Ошибка обработки голосового уточнения:', error);
      await bot.sendMessage(chatId, 'Ошибка обработки голосового уточнения. Попробуйте ввести вес текстом.');
    }

  } catch (error) {
    console.error('Ошибка обработки голосового уточнения веса:', error);
    await bot.sendMessage(chatId, 'Ошибка обработки голосового уточнения веса.');
  }
}

module.exports = {
  handleFoodAnalysis,
  handlePhotoAnalysis,
  handleVoiceAnalysis,
  handleVoiceWeightClarification,
  getTodaysNutrition,
  handleFoodDetailsResponse,
  saveMeal,
  sendMotivationalMessage
};
