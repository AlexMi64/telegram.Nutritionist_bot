// Контроллер онбординга - обработка многошагового процесса настройки пользователя
const { User } = require('../database/models');
const { CONSTANTS, ConstantsUtils } = require('../config/constants');
const { t } = require('../config/lang');

// Основной обработчик онбординга
async function handleOnboardingState(bot, user, text, chatId) {
  const normalizedText = text.toLowerCase().trim();

  try {
    switch (user.state) {
      case CONSTANTS.ONBOARDING_STATES.GENDER:
        return await handleGender(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.AGE:
        return await handleAge(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.HEIGHT:
        return await handleHeight(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.WEIGHT:
        return await handleWeight(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.MAIN_GOAL:
        return await handleMainGoal(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.CURRENT_MOTIVATION_LEVEL:
        return await handleMotivationLevel(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.MOTIVATION_TYPE:
        return await handleMotivationType(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.WORKOUT_FREQUENCY:
        return await handleWorkoutFrequency(bot, user, normalizedText, chatId);

      case CONSTANTS.ONBOARDING_STATES.CURRENT_DIET_METHOD:
        return await handleDietMethod(bot, user, text, chatId);

      case CONSTANTS.ONBOARDING_STATES.FAVORITE_FOODS:
        return await handleFavoriteFoods(bot, user, text, chatId);

      case CONSTANTS.ONBOARDING_STATES.DISLIKED_FOODS:
        return await handleDislikedFoods(bot, user, text, chatId);

      default:
        await handleUnknownState(bot, user, chatId);
    }
  } catch (error) {
    console.error('Ошибка в онбординге:', error);
    await bot.sendMessage(chatId, t('onboarding.errors.reset'));
    await user.update({ state: CONSTANTS.ONBOARDING_STATES.GENDER });
  }
}

// Обработка выбора пола
async function handleGender(bot, user, text, chatId) {
  const gender = ConstantsUtils.textToGender(text);

  if (!gender) {
    await bot.sendMessage(chatId, t('onboarding.gender.options'));
    return;
  }

  await user.update({
    gender: gender,
    state: CONSTANTS.ONBOARDING_STATES.AGE
  });

  await bot.sendMessage(chatId, t('onboarding.age.ask'));
}

// Обработка возраста
async function handleAge(bot, user, text, chatId) {
  const age = parseInt(text);

  if (isNaN(age) || age < CONSTANTS.VALIDATION.AGE.MIN || age > CONSTANTS.VALIDATION.AGE.MAX) {
    await bot.sendMessage(chatId, t('onboarding.age.invalid'));
    return;
  }

  await user.update({
    age: age,
    state: CONSTANTS.ONBOARDING_STATES.HEIGHT
  });

  await bot.sendMessage(chatId, t('onboarding.height.ask'));
}

// Обработка роста
async function handleHeight(bot, user, text, chatId) {
  const height = parseFloat(text.replace(',', '.'));

  if (isNaN(height) || height < CONSTANTS.VALIDATION.HEIGHT.MIN || height > CONSTANTS.VALIDATION.HEIGHT.MAX) {
    await bot.sendMessage(chatId, t('onboarding.height.invalid'));
    return;
  }

  await user.update({
    height: height,
    state: CONSTANTS.ONBOARDING_STATES.WEIGHT
  });

  // Только спрашиваем о весе - один вопрос за раз
  await bot.sendMessage(chatId, t('onboarding.weight.ask'));
}

// Обработка веса (комбинированный с целью)
async function handleWeight(bot, user, text, chatId) {
  const weight = parseFloat(text.replace(',', '.'));

  if (isNaN(weight) || weight < CONSTANTS.VALIDATION.WEIGHT.MIN || weight > CONSTANTS.VALIDATION.WEIGHT.MAX) {
    await bot.sendMessage(chatId, t('onboarding.weight.invalid'));
    return;
  }

  await user.update({
    weight: weight,
    state: CONSTANTS.ONBOARDING_STATES.MAIN_GOAL
  });

  const goalMessage = t('onboarding.weight.thanks') + '\n' +
    t('onboarding.weight.ask_goal') + '\n' +
    t('onboarding.weight.goal_options').map(goal => '• ' + goal).join('\n') + '\n' +
    t('onboarding.weight.any_goal');

  await bot.sendMessage(chatId, goalMessage);
}

// Обработка главной цели
async function handleMainGoal(bot, user, text, chatId) {
  const mainGoal = ConstantsUtils.textToGoal(text);

  if (!mainGoal) {
    await bot.sendMessage(chatId, t('onboarding.weight.any_goal'));
    return;
  }

  await user.update({
    mainGoal: mainGoal,
    state: CONSTANTS.ONBOARDING_STATES.CURRENT_MOTIVATION_LEVEL
  });

  const motivationMessage = t('onboarding.motivation.level.ask') + '\n' +
    t('onboarding.motivation.level.options');

  await bot.sendMessage(chatId, motivationMessage);
}

// Обработка уровня мотивации
async function handleMotivationLevel(bot, user, text, chatId) {
  const motivationLevel = ConstantsUtils.textToMotivationLevel(text);

  if (!motivationLevel) {
    await bot.sendMessage(chatId, t('onboarding.motivation.level.ask'));
    return;
  }

  await user.update({
    currentMotivationLevel: motivationLevel,
    state: CONSTANTS.ONBOARDING_STATES.MOTIVATION_TYPE
  });

  const motivationTypeMessage = t('onboarding.motivation.type.ask') + '\n' +
    t('onboarding.motivation.type.what') + '\n' +
    t('onboarding.motivation.type.options').map(option => '• ' + option).join('\n') + '\n' +
    t('onboarding.motivation.type.important');

  await bot.sendMessage(chatId, motivationTypeMessage);
}

// Обработка типа мотивации
async function handleMotivationType(bot, user, text, chatId) {
  const motivationType = ConstantsUtils.textToMotivationType(text);

  if (!motivationType) {
    await bot.sendMessage(chatId, t('onboarding.motivation.type.important'));
    return;
  }

  await user.update({
    motivationType: motivationType,
    state: CONSTANTS.ONBOARDING_STATES.WORKOUT_FREQUENCY
  });

  const workoutMessage = t('onboarding.workout.frequency.ask') + '\n' +
    t('onboarding.workout.frequency.options').map(option => '• ' + option).join('\n') + '\n' +
    t('onboarding.workout.frequency.count');

  await bot.sendMessage(chatId, workoutMessage);
}

// Обработка частоты тренировок
async function handleWorkoutFrequency(bot, user, text, chatId) {
  const frequency = parseInt(text);

  if (isNaN(frequency) || frequency < CONSTANTS.VALIDATION.WORKOUT_FREQUENCY.MIN || frequency > CONSTANTS.VALIDATION.WORKOUT_FREQUENCY.MAX) {
    await bot.sendMessage(chatId, t('onboarding.workout.frequency.invalid'));
    return;
  }

  await user.update({
    workoutFrequency: frequency,
    state: CONSTANTS.ONBOARDING_STATES.CURRENT_DIET_METHOD
  });

  const dietMessage = t('onboarding.workout.diet.ask') + '\n' +
    t('onboarding.workout.diet.methods').map(method => '• ' + method).join('\n') + '\n' +
    t('onboarding.workout.diet.describe');

  await bot.sendMessage(chatId, dietMessage);
}

// Обработка текущего подхода к питанию
async function handleDietMethod(bot, user, text, chatId) {
  if (!text || text.length < 2 || text.length > 100) {
    await bot.sendMessage(chatId, t('onboarding.workout.diet.describe'));
    return;
  }

  await user.update({
    currentDietMethod: text,
    state: CONSTANTS.ONBOARDING_STATES.FAVORITE_FOODS
  });

  const favoriteFoodsMessage = t('onboarding.foods.favorite.ask') + '\n' +
    t('onboarding.foods.favorite.example') + '\n' +
    t('onboarding.foods.favorite.format');

  await bot.sendMessage(chatId, favoriteFoodsMessage);
}

// Обработка любимой еды
async function handleFavoriteFoods(bot, user, text, chatId) {
  const favoriteFoods = text.split(',')
    .map(food => food.trim())
    .filter(food => food.length > 0)
    .slice(0, 10); // Максимум 10 элементов

  await user.update({
    favoriteFoods: favoriteFoods,
    state: CONSTANTS.ONBOARDING_STATES.DISLIKED_FOODS
  });

  const dislikedFoodsMessage = t('onboarding.foods.disliked.ask') + '\n' +
    t('onboarding.foods.disliked.example') + '\n' +
    t('onboarding.foods.disliked.format');

  await bot.sendMessage(chatId, dislikedFoodsMessage);
}

// Обработка нелюбимой еды и завершение онбординга
async function handleDislikedFoods(bot, user, text, chatId) {
  const dislikedFoods = text.split(',')
    .map(food => food.trim())
    .filter(food => food.length > 0)
    .slice(0, 10); // Максимум 10 элементов

  await user.update({
    dislikedFoods: dislikedFoods,
    state: null // Завершение онбординга
  });

  // Расчет индивидуальных норм питания
  await calculateUserTargets(user);

  // Перезагрузка данных пользователя после сохранения целей
  await user.reload();

  // Импортируем здесь, чтобы избежать circular dependency
  const { startUserScheduler } = require('../services/scheduler');

  // Формирование финального сообщения с сохраненными целями
  const finalMessage = t('onboarding.completion.title') + '\n\n' +
    t('onboarding.completion.based') + '\n' +
    t('onboarding.completion.recommendations', {calories: user.targetCaloriesPerDay}) + '\n' +
    t('onboarding.completion.protein', {protein: Math.round(user.targetProtein)}) + '\n' +
    t('onboarding.completion.fat', {fat: Math.round(user.targetFat)}) + '\n' +
    t('onboarding.completion.carbs', {carbs: Math.round(user.targetCarbs)}) + '\n\n' +
    t('onboarding.completion.coach') + '\n' +
    t('onboarding.completion.services').map(service => '• ' + service).join('\n') + '\n\n' +
    t('onboarding.completion.notifications_active') + '\n' +
    t('onboarding.completion.support') + '\n' +
    t('onboarding.completion.start');

  await bot.sendMessage(chatId, finalMessage);

  // Запуск планировщика уведомлений
  await startUserScheduler(await User.findByPk(user.id));
}

// Расчет индивидуальных целей питания
async function calculateUserTargets(user) {
  // Расчет базового метаболизма
  const bmr = ConstantsUtils.calculateBMR(user.age, user.gender, user.height, user.weight);

  // Расчет ежедневных норм с учетом активности
  const targets = ConstantsUtils.calculateDailyTargets(bmr, user.weight, user.workoutFrequency);

  // Сохранение целей в базу данных
  await user.update({
    targetCaloriesPerDay: targets.caloriesPerDay,
    targetProtein: targets.protein,
    targetFat: targets.fat,
    targetCarbs: targets.carbs
  });

  console.log(`🎯 Цели рассчитаны для пользователя ${user.telegramId}: ${targets.caloriesPerDay} ккал`);
}

// Обработка неизвестного состояния
async function handleUnknownState(bot, user, chatId) {
  console.error('Неизвестное состояние онбординга:', user.state);
  await user.update({ state: CONSTANTS.ONBOARDING_STATES.GENDER });
  await bot.sendMessage(chatId, t('onboarding.errors.reset'));
}

module.exports = {
  handleOnboardingState
};
