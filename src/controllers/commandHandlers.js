// Обработчики команд бота
const { User, Meal } = require('../database/models');
const { CONSTANTS, ConstantsUtils } = require('../config/constants');
const { t } = require('../config/lang');

// Обработчик команды /start
async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Проверяем существует ли пользователь, создаем если нет
    let user = await User.findOne({ where: { telegramId: userId } });
    if (!user) {
      user = await User.create({
        telegramId: userId,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
      });
      console.log('👤 Новый пользователь создан:', userId);
    }

    // Если пользователь уже прошел онбординг - показываем меню с кнопками
    if (user.mainGoal) {
      const completedMessage =
        t('welcome.completed.title', {name: user.firstName || 'пользователь'}) + '\n\n' +
        t('welcome.completed.ask_food');

      // Сбрасываем состояние на нормальное, если было в ожидании или частичном онбординге
      await user.update({ state: null });

      // Клавиатура с кнопками команд
      const keyboard = {
        keyboard: [
          [
            { text: t('buttons.add_food') },
            { text: t('buttons.stats') }
          ],
          [
            { text: t('buttons.recipes') },
            { text: t('buttons.settings') }
          ],
          [
            { text: t('buttons.help') }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      };

      await bot.sendMessage(chatId, completedMessage, {
        reply_markup: keyboard
      });
      return;
    }

    // Начинаем онбординг для новых пользователей или тех кто начал но не закончил
    const welcomeMessage =
      '🍎 Добро пожаловать в Eat_bot!\n\n' +
      '🌟 Ваш персональный помощник по питанию и здоровью\n\n' +
      '💡 Что умеет бот:\n\n' +
      '🔍 Анализ продуктов\n' +
      'Отправьте фото, голосовое сообщение или текст - бот распознает продукты и точно рассчитает калории и питательные вещества\n\n' +
      '📊 Отслеживание питания\n' +
      'Создает ваш пищевой дневник, показывает прогресс по целям калорий и макронутриентов\n\n' +
      '🍳 Интеллектуальные рецепты\n' +
      'Предлагает рецепты из ваших продуктов, знакомит с новыми полезными ингредиентами\n\n' +
      '🎯 Персонализированные цели\n' +
      'Рассчитает суточные нормы калорий, белков, жиров и углеводов с учетом веса, роста, возраста и активности\n\n' +
      '🔔 Умные напоминания\n' +
      'Настраивает расписание уведомлений о приемах пищи и мотивационные сообщения\n\n' +
      '⚙️ Гибкие настройки\n' +
      'Можно настроить предпочтения в еде, уровень мотивации, часовой пояс\n\n' +
      '🚀 Начнем настройку профиля\n\n' +
      'Для начала укажите ваш пол (ответьте: мужчина/женщина)';

    await bot.sendMessage(chatId, welcomeMessage);

    // Устанавливаем состояние пользователя для расширенного онбординга
    await user.update({ state: CONSTANTS.ONBOARDING_STATES.GENDER });

  } catch (error) {
    console.error('Ошибка в /start:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
}

// Обработчик команды /help
async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;

  const features = t('help.features').map(f => '• ' + f).join('\n');
  const inputs = t('help.inputs').map(i => '• ' + i).join('\n');

  const helpMessage =
    t('help.title') + '\n\n' + features + '\n\n' +
    t('help.usage') + '\n' + inputs + '\n\n' +
    t('help.setup_complete');

  await bot.sendMessage(chatId, helpMessage);
}

// Обработчик команды /stats
async function handleStats(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Получить пользователя с обновленными данными
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    console.log('📊 Получение статистики для пользователя:', user.id, '(telegramId:', userId + ')');
    console.log('🎯 Цели пользователя:', {
      calories: user.targetCaloriesPerDay,
      protein: user.targetProtein,
      fat: user.targetFat,
      carbs: user.targetCarbs,
      goal: user.mainGoal
    });

    // Получить питание за сегодня для показа прогресса
    const { getTodaysNutrition } = require('./foodAnalysisController');
    const todaysNutrition = await getTodaysNutrition(user.id);

    console.log('🍽️ Питание сегодня:', todaysNutrition);

    let statsMessage = t('stats.current_goals.title') + '\n\n';

    // Показываем цели пользователя (должны быть всегда для завершивших онбординг)
    if (user.targetCaloriesPerDay && user.targetProtein) {
      statsMessage +=
        t('stats.current_goals.calories', {calories: user.targetCaloriesPerDay}) + '\n' +
        t('stats.current_goals.protein', {protein: user.targetProtein}) + '\n' +
        t('stats.current_goals.fat', {fat: user.targetFat}) + '\n' +
        t('stats.current_goals.carbs', {carbs: user.targetCarbs}) + '\n\n';

      if (user.mainGoal) {
        statsMessage += t('stats.current_goals.goal', {goal: ConstantsUtils.getGoalText(user.mainGoal)}) + '\n';
      }

      if (user.currentMotivationLevel) {
        statsMessage += t('stats.current_goals.motivation', {motivation: ConstantsUtils.getMotivationText(user.currentMotivationLevel)}) + '\n';
      }

      statsMessage += '\n';

      // Показываем питание за сегодня
      if (todaysNutrition.calories > 0) {
        statsMessage += '🍽️ **Питание сегодня:**\n' +
          `• Калории: ${todaysNutrition.calories.toFixed(0)} ккал\n` +
          `• Белки: ${todaysNutrition.protein.toFixed(1)} г\n` +
          `• Жиры: ${todaysNutrition.fat.toFixed(1)} г\n` +
          `• Углеводы: ${todaysNutrition.carbs.toFixed(1)} г\n\n`;
      }

      // Показываем оставшуюся калорийность дня
      const remainingCalories = user.targetCaloriesPerDay - todaysNutrition.calories;
      if (remainingCalories > 0) {
        statsMessage += `🎯 **Осталось сегодня:** ${remainingCalories.toFixed(0)} ккал\n\n`;
      } else if (remainingCalories < 0) {
        statsMessage += `⚠️ **Превышение:** ${Math.abs(remainingCalories).toFixed(0)} ккал\n\n`;
      }

    } else {
      // Фallback для пользователей без целей
      statsMessage += '❌ Цели питания не рассчитаны. Выполните /start заново.\n\n';
    }

    // Не показываем сообщение о подробной статистике, так как уже показана сегодняшняя статистика
    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('❌ Ошибка в /stats:', error);
    await bot.sendMessage(chatId, t('errors.stats_unavailable'));
  }
}

// Обработчик команды /settings
async function handleSettings(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const user = await User.findOne({ where: { telegramId: userId } });
    if (!user) {
      await bot.sendMessage(chatId, 'Сначала запустите бота командой /start');
      return;
    }

    const settingsMessage = '⚙️ **Настройки бота**\n\n' +
      'Выберите раздел для настройки:';

    // Inline клавиатура с категориями настроек
    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: '👤 Профиль',
          callback_data: 'settings_profile'
        }, {
          text: '🎯 Питание',
          callback_data: 'settings_nutrition'
        }],
        [{
          text: '🔔 Уведомления',
          callback_data: 'settings_notifications'
        }, {
          text: '⭐ Предпочтения',
          callback_data: 'settings_preferences'
        }]
      ]
    };

    await bot.sendMessage(chatId, settingsMessage, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

  } catch (error) {
    console.error('Ошибка в handleSettings:', error);
    await bot.sendMessage(chatId, 'Извините, произошла ошибка при загрузке настроек');
  }
}

// Обработчик команды /enable_notifications
async function handleEnableNotifications(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Импортируем здесь, чтобы избежать circular dependency
    const { startUserScheduler } = require('../services/scheduler');

    const user = await User.findOne({ where: { telegramId: userId } });
    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    await user.update({ notificationsEnabled: true });
    await startUserScheduler(user);

    const notificationMessage =
      t('notifications.enabled.title') + '\n\n' +
      t('notifications.enabled.schedule') + '\n' +
      t('notifications.enabled.morning') + '\n' +
      t('notifications.enabled.midday') + '\n' +
      t('notifications.enabled.evening') + '\n' +
      t('notifications.enabled.motivation') + '\n\n' +
      t('notifications.enabled.disable');

    await bot.sendMessage(chatId, notificationMessage);
  } catch (error) {
    console.error('Ошибка включения уведомлений:', error);
    await bot.sendMessage(chatId, t('notifications.errors.enable'));
  }
}

// Обработчик команды /disable_notifications
async function handleDisableNotifications(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Импортируем здесь, чтобы избежать circular dependency
    const { stopUserScheduler } = require('../services/scheduler');

    const user = await User.findOne({ where: { telegramId: userId } });
    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    await user.update({ notificationsEnabled: false });
    await stopUserScheduler(user.id);

    const notificationMessage =
      t('notifications.disabled.title') + '\n\n' +
      t('notifications.disabled.continue') + '\n' +
      t('notifications.disabled.continue_features') + '\n\n' +
      t('notifications.disabled.enable');

    await bot.sendMessage(chatId, notificationMessage);
  } catch (error) {
    console.error('Ошибка отключения уведомлений:', error);
    await bot.sendMessage(chatId, t('notifications.errors.disable'));
  }
}

// Обработчик кнопки/команды рецептов
async function handleRecipes(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const user = await User.findOne({ where: { telegramId: userId } });
    if (!user) {
      await bot.sendMessage(chatId, 'Сначала запустите бота командой /start');
      return;
    }

    console.log('🍳 Показываю меню рецептов для пользователя:', userId);

    const welcomeMessage = '🍳 **Выберите тип рецептов:**\n\n' +
      'Я могу предложить рецепты на основе ваших продуктов или познакомить с новыми полезными ингредиентами!';

    // Inline клавиатура для выбора типа рецептов
    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: '🎯 Из моих продуктов',
          callback_data: 'recipe_from_my_foods'
        }],
        [{
          text: '🆕 С новым ингредиентом',
          callback_data: 'recipe_with_new_ingredient'
        }],
        [{
          text: '⭐ Мои избранные',
          callback_data: 'recipe_favorites'
        }],
        [{
          text: '📊 Под оставшиеся калории',
          callback_data: 'recipe_under_calories'
        }]
      ]
    };

    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

  } catch (error) {
    console.error('Ошибка в handleRecipes:', error);
    await bot.sendMessage(chatId, 'Извините, произошла ошибка при загрузке рецептов');
  }
}

// Функции для работы с настройками (ConstantsUtils уже импортирован выше)

/**
 * Рассчитывает суточную норму калорий по улучшенной формуле с учетом всех параметров пользователя
 * @param {Object} userData - Данные пользователя со всеми полями
 * @returns {number} - Суточная норма калорий в день
 */
function calculateDailyCalories(userData) {
  const {
    age, gender, height, weight,
    activityLevel, workoutFrequency,
    mainGoal, currentMotivationLevel
  } = userData;

  if (!age || !gender || !height || !weight) {
    // Если нет базовых данных, возвращаем значение по умолчанию
    return 2000;
  }

  // 1. Основная формула Mifflin-St Jeor
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  console.log(`📊 BMR базовый: ${bmr.toFixed(0)} ккал`);

  // 2. Корректировка на уровень активности
  let activityMultiplier = 1.2; // Значение по умолчанию

  if (activityLevel === 'medium') {
    activityMultiplier = 1.55; // Базовая умеренная активность
  } else if (activityLevel === 'high') {
    activityMultiplier = 1.725; // Высокая активность
  }

  // 3. Дополнительная коррекция на частоту тренировок
  let workoutBonus = 0;

  if (workoutFrequency) {
    // Коэффициенты расхода калорий на тренировки:
    // Силовые тренировки ≈300-600 ккал/час
    // Средняя тренировка ≈1 час
    const avgWorkoutCalories = 400; // средний расход на тренировку

    if (workoutFrequency <= 2) {
      workoutBonus = (workoutFrequency * avgWorkoutCalories) / 7; // дней в неделю
    } else if (workoutFrequency <= 4) {
      workoutBonus = (workoutFrequency * avgWorkoutCalories * 0.8) / 7; // небольшой понижающий коэффициент при частых тренировках
    } else {
      workoutBonus = (workoutFrequency * avgWorkoutCalories * 0.6) / 7; // понижающий коэффициент при очень частых тренировках
    }
  }

  // 4. Корректировка TDEE с учетом тренировок
  let tdee = bmr * activityMultiplier + workoutBonus;

  console.log(`🏋️ Коэффициент активности: ${activityMultiplier}`);
  console.log(`💪 Бонус тренировок: ${workoutBonus.toFixed(0)} ккал/день`);
  console.log(`🔥 TDEE: ${tdee.toFixed(0)} ккал`);

  // 5. Корректировка на цель питания (предварительная, будет доработана в calculateTargets)
  let adjustedCalories = tdee;

  if (mainGoal === 'lose_weight') {
    // Для похудения используем дефицит 10-15% от TDEE, но не менее 500 ккал
    const deficitFactor = Math.max(500, tdee * 0.15);
    adjustedCalories = tdee - Math.min(750, deficitFactor); // Максимум 750 ккал дефицита
  } else if (mainGoal === 'gain_muscle') {
    // Для набора мышц используем профицит 10-15%
    adjustedCalories = tdee + (tdee * 0.12);
  }
  // Для maintain и health оставляем TDEE как есть

  // 6. Корректировка на уровень мотивации
  if (currentMotivationLevel === 'high') {
    // При высокой мотивации можно немного увеличить дефицит/профицит
    const motivationFactor = 0.1; // +10% дополнительных изменений для высокомотивированных
    if (mainGoal === 'lose_weight') {
      adjustedCalories -= tdee * motivationFactor * 0.5;
    } else if (mainGoal === 'gain_muscle') {
      adjustedCalories += tdee * motivationFactor * 0.5;
    }
  } else if (currentMotivationLevel === 'low') {
    // При низкой мотивации уменьшаем изменения, чтобы не демотивировать
    adjustedCalories = (adjustedCalories + tdee) / 2; // Усредняем с базовым уровнем
  }

  // 7. Безопасные границы
  const finalCalories = Math.round(adjustedCalories);
  console.log(`🎯 Финальная суточная норма: ${finalCalories} ккал\n`);

  // Значение не должно быть ниже 1200 ккал для поддержания базового метаболизма
  return Math.max(1200, finalCalories);
}

/**
 * Рассчитывает рекомендуемые цели питания
 * @param {number} calories - Суточная норма калорий (уже скорректированная под цель)
 * @param {string} goal - Цель (lose_weight/gain_muscle/maintain/health)
 * @param {Object} userData - Данные пользователя для персонализации
 * @returns {Object} - Цели по макронутриентам
 */
function calculateTargets(calories, goal, userData = {}) {
  const weight = userData.weight || 70; // Используем вес пользователя или средний
  const mainGoal = goal || userData.mainGoal || 'maintain';

  // NOTE: Калории уже скорректированы на цель в calculateDailyCalories,
  // поэтому здесь просто используем переданное значение
  let adjustedCalories = calories;

  // Расчет макронутриентов в граммах
  let protein, fat, carbs;

  switch (mainGoal) {
    case 'lose_weight':
      // Высокий белок, умеренные жиры и углеводы
      protein = Math.round(weight * 1.8); // 1.8г на кг веса
      fat = Math.round(adjustedCalories * 0.20 / 9); // 20% калорий из жиров
      carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4);
      break;

    case 'gain_muscle':
      // Максимальный белок, повышенные углеводы
      protein = Math.round(weight * 2.0); // 2г на кг веса
      fat = Math.round(adjustedCalories * 0.25 / 9); // 25% калорий из жиров
      carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4);
      break;

    case 'health':
      // Оптимальное соотношение для здоровья
      protein = Math.round(weight * 1.4); // 1.4г на кг веса
      fat = Math.round(adjustedCalories * 0.30 / 9); // 30% калорий из жиров
      carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4);
      break;

    default: // maintain
      // Сбалансированное соотношение
      protein = Math.round(weight * 1.6); // 1.6г на кг веса
      fat = Math.round(adjustedCalories * 0.25 / 9); // 25% калорий из жиров
      carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4);
  }

  // Гарантируем минимум калорийности - не менее 1200 ккал для поддержания метаболизма
  adjustedCalories = Math.max(1200, adjustedCalories);

  // Контроль максимумов для безопасности
  protein = Math.max(50, Math.min(protein, 400)); // не менее 50г, не более 400г
  fat = Math.max(35, Math.min(fat, 200)); // не менее 35г, не более 200г
  carbs = Math.max(100, Math.min(carbs, 800)); // не менее 100г, не более 800г

  // Финальная проверка - сумма калорийность не должна превышать исходную более чем на 10%
  const calculatedCalories = (protein * 4) + (fat * 9) + (carbs * 4);
  if (Math.abs(calculatedCalories - adjustedCalories) > adjustedCalories * 0.1) {
    // Перерасчет углеводов для точного соответствия калориям
    carbs = Math.max(100, Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4));
  }

  console.log(`🎯 Финальные цели: калории=${adjustedCalories}, белки=${protein}, жиры=${fat}, углеводы=${carbs}`);

  return {
    targetCaloriesPerDay: adjustedCalories,
    targetProtein: protein,
    targetFat: fat,
    targetCarbs: carbs
  };
}

module.exports = {
  handleStart,
  handleHelp,
  handleStats,
  handleSettings,
  handleEnableNotifications,
  handleDisableNotifications,
  handleRecipes,
  calculateDailyCalories,
  calculateTargets
};
