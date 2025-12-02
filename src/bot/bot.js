const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const config = require('../config');
const { connectDB } = require('../database/connection');
const { CONSTANTS, ConstantsUtils } = require('../config/constants');
const { t, langManager } = require('../config/lang');

const {
  handleStart,
  handleHelp,
  handleStats,
  handleSettings,
  handleEnableNotifications,
  handleDisableNotifications,
  handleRecipes
} = require('../controllers/commandHandlers');
const { handleOnboardingState } = require('../controllers/onboardingController');
const { handleFoodAnalysis, handleFoodDetailsResponse, handleVoiceWeightClarification } = require('../controllers/foodAnalysisController');

// Функция обработки callback'ов настроек
async function handleSettingsCallbacks(bot, query, user) {
  const chatId = query.message.chat.id;
  const callbackData = query.data;

  try {
    console.log(`⚙️ Обработка callback настроек: ${callbackData} для пользователя ${user.id}`);

    if (callbackData === 'settings_profile') {
      // Меню профиля
      const profileMessage = '👤 **Настройки профиля**\n\n' +
        'Текущие данные:\n' +
        `• Возраст: ${user.age || 'не указан'} лет\n` +
        `• Рост: ${user.height || 'не указан'} см\n` +
        `• Вес: ${user.weight || 'не указан'} кг\n` +
        `• Пол: ${user.gender === 'male' ? 'Мужской' : user.gender === 'female' ? 'Женский' : user.gender === 'other' ? 'Другое' : 'не выбран'}\n` +
        `• Активность: ${user.activityLevel || 'не указан'}\n\n` +
        'Выберите что изменить:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '⚖️ Изменить вес',
            callback_data: 'settings_weight'
          }, {
            text: '📏 Изменить рост',
            callback_data: 'settings_height'
          }],
          [{
            text: '🏃‍♂️ Сменить активность',
            callback_data: 'settings_activity'
          }, {
            text: '🎂 Изменить возраст',
            callback_data: 'settings_age'
          }],
          [{
            text: '♂️♀️ Сменить пол',
            callback_data: 'settings_gender'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_back'
          }]
        ]
      };

      await bot.editMessageText(profileMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

    } else if (callbackData === 'settings_nutrition') {
      // Меню питания
      const nutritionMessage = '🎯 **Настройки питания**\n\n' +
        'Текущие цели:\n' +
        `• Калории: ${user.targetCaloriesPerDay || 0} ккал\n` +
        `• Белки: ${user.targetProtein || 0}г\n` +
        `• Жиры: ${user.targetFat || 0}г\n` +
        `• Углеводы: ${user.targetCarbs || 0}г\n\n` +
        'Выберите что изменить:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '⚡ Калории',
            callback_data: 'settings_calories'
          }, {
            text: '🧬 Белки',
            callback_data: 'settings_protein'
          }],
          [{
            text: '🥑 Жиры',
            callback_data: 'settings_fat'
          }, {
            text: '🍞 Углеводы',
            callback_data: 'settings_carbs'
          }],
          [{
            text: '🎯 Главная цель',
            callback_data: 'settings_goal'
          }],
          [{
            text: '🔄 Пересчитать',
            callback_data: 'settings_recalc'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_back'
          }]
        ]
      };

      await bot.editMessageText(nutritionMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

    } else if (callbackData === 'settings_preferences') {
      // Меню предпочтений
      const preferencesMessage = '⭐ **Настройки предпочтений**\n\n' +
        'Текущие предпочтения:\n' +
        `• Мотивация: ${ConstantsUtils.getMotivationText(user.currentMotivationLevel) || 'не установлена'}\n` +
        `• Тип мотивации: ${ConstantsUtils.getMotivationTypeText(user.motivationType) || 'не установлен'}\n` +
        `• Любимая еда: ${(user.favoriteFoods && user.favoriteFoods.length > 0) ? user.favoriteFoods.join(', ') : 'не указана'}\n` +
        `• Нелюбимая еда: ${(user.dislikedFoods && user.dislikedFoods.length > 0) ? user.dislikedFoods.join(', ') : 'не указана'}\n\n` +
        'Выберите что изменить:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '🍳 Любимая еда',
            callback_data: 'settings_favorite_foods'
          }, {
            text: '👎 Нелюбимая еда',
            callback_data: 'settings_disliked_foods'
          }],
          [{
            text: '💪 Уровень мотивации',
            callback_data: 'settings_motivation_level'
          }, {
            text: '🎯 Тип мотивации',
            callback_data: 'settings_motivation_type'
          }],
          [{
            text: '🌍 Часовой пояс',
            callback_data: 'settings_timezone'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_back'
          }]
        ]
      };

      await bot.editMessageText(preferencesMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

    } else if (callbackData === 'settings_notifications') {
      // Меню уведомлений
      const notificationsMessage = '🔔 **Настройки уведомлений**\n\n' +
        `Статус: ${user.notificationsEnabled ? '✅ Включены' : '❌ Отключены'}\n\n` +
        'Выберите действие:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: user.notificationsEnabled ? '❌ Отключить' : '✅ Включить',
            callback_data: user.notificationsEnabled ? 'settings_notifications_disable' : 'settings_notifications_enable'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_back'
          }]
        ]
      };

      await bot.editMessageText(notificationsMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

    } else if (callbackData === 'settings_back') {
      // Возврат к главному меню настроек
      const settingsMessage = '⚙️ **Настройки бота**\n\n' +
        'Выберите раздел для настройки:';

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

      await bot.editMessageText(settingsMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

    } else if (callbackData.startsWith('settings_')) {
      // Обработка конкретных настроек
      await handleSettingsChanges(bot, query, user, callbackData);
    }

  } catch (error) {
    console.error('Ошибка обработки callback настроек:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
  }
}

// Функция обработки изменений настроек
async function handleSettingsChanges(bot, query, user, callbackData) {
  const chatId = query.message.chat.id;

  try {
    if (callbackData === 'settings_weight') {
      await user.update({ state: 'settings_waiting_weight' });
      await bot.sendMessage(chatId, '⚖️ **Изменение веса**\n\nВведите новый вес в килограммах (например: 75):');
    }

    else if (callbackData === 'settings_height') {
      await user.update({ state: 'settings_waiting_height' });
      await bot.sendMessage(chatId, '📏 **Изменение роста**\n\nВведите новый рост в сантиметрах (например: 180):');
    }

    else if (callbackData === 'settings_age') {
      await user.update({ state: 'settings_waiting_age' });
      await bot.sendMessage(chatId, '🎂 **Изменение возраста**\n\nВведите новый возраст в годах (от 10 до 120):');
    }

    else if (callbackData === 'settings_gender') {
      const genderMessage = '♀️♂️ **Выберите пол:**\n\nТекущий пол: ' +
        (user.gender === 'male' ? 'Мужской' :
         user.gender === 'female' ? 'Женский' :
         user.gender === 'other' ? 'Другое' : 'не выбран');

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '♂️ Мужской',
            callback_data: 'settings_gender_male'
          }, {
            text: '♀️ Женский',
            callback_data: 'settings_gender_female'
          }],
          [{
            text: '⚧️ Другое',
            callback_data: 'settings_gender_other'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_profile'
          }]
        ]
      };

      await bot.editMessageText(genderMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    }

    else if (callbackData === 'settings_activity') {
      const activityMessage = '🏃‍♂️ **Выберите уровень активности:**\n\n' +
        '• низкий - сидячий образ жизни, минимум движения\n' +
        '• средний - умеренная активность, спорт 1-3 раза в неделю\n' +
        '• высокий - активный спорт 4+ раза в неделю, тяжелая работа\n\n' +
        'Текущий уровень: ' + (user.activityLevel || 'не выбран');

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '📺 Низкий',
            callback_data: 'settings_activity_low'
          }],
          [{
            text: '🏃‍♂️ Средний',
            callback_data: 'settings_activity_medium'
          }],
          [{
            text: '💪 Высокий',
            callback_data: 'settings_activity_high'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_profile'
          }]
        ]
      };

      await bot.editMessageText(activityMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    }

    else if (callbackData.startsWith('settings_gender_')) {
      const gender = callbackData.replace('settings_gender_', '');
      await user.update({ gender: gender });

      // Пересчет целей после изменения пола
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      await user.update(targets);

      const genderText = gender === 'male' ? 'Мужской' : gender === 'female' ? 'Женский' : 'Другое';
      await bot.answerCallbackQuery(query.id, { text: `Пол изменен на: ${genderText}` });

      // Возврат к меню профиля
      await bot.sendMessage(chatId, `✅ **Пол обновлен: ${genderText}**\n\nКалории и цели питания пересчитаны автоматически.`);

    }

    else if (callbackData.startsWith('settings_activity_')) {
      const activity = callbackData.replace('settings_activity_', '');
      await user.update({ activityLevel: activity });

      // Пересчет целей после изменения активности
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      await user.update(targets);

      await bot.answerCallbackQuery(query.id, { text: `Активность изменена на: ${activity}` });

      // Возврат к меню профиля
      await bot.sendMessage(chatId, '✅ **Уровень активности обновлен**\n\nКалории и цели питания пересчитаны автоматически.');

    }

    else if (callbackData === 'settings_calories') {
      await user.update({ state: 'settings_waiting_calories' });
      await bot.sendMessage(chatId, '⚡ **Изменение нормы калорий**\n\nВведите новую суточную норму калорий (например: 2500):');
    }

    else if (callbackData === 'settings_protein') {
      await user.update({ state: 'settings_waiting_protein' });
      await bot.sendMessage(chatId, '🧬 **Изменение нормы белков**\n\nВведите дневную норму белков в граммах (например: 150):');
    }

    else if (callbackData === 'settings_fat') {
      await user.update({ state: 'settings_waiting_fat' });
      await bot.sendMessage(chatId, '🥑 **Изменение нормы жиров**\n\nВведите дневную норму жиров в граммах (например: 80):');
    }

    else if (callbackData === 'settings_carbs') {
      await user.update({ state: 'settings_waiting_carbs' });
      await bot.sendMessage(chatId, '🍞 **Изменение нормы углеводов**\n\nВведите дневную норму углеводов в граммах (например: 300):');
    }

    else if (callbackData === 'settings_goal') {
      const goalMessage = '🎯 **Изменение главной цели**\n\nТекущая цель: ' +
        (user.mainGoal === 'lose_weight' ? 'Похудеть' :
         user.mainGoal === 'gain_muscle' ? 'Набрать мышечную массу' :
         user.mainGoal === 'maintain' ? 'Поддерживать вес' :
         user.mainGoal === 'health' ? 'Здоровое питание' : 'не выбрана');

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '🏋️‍♂️ Набрать мышечную массу',
            callback_data: 'settings_goal_gain_muscle'
          }],
          [{
            text: '⚖️ Похудеть',
            callback_data: 'settings_goal_lose_weight'
          }],
          [{
            text: '🎯 Поддерживать вес',
            callback_data: 'settings_goal_maintain'
          }],
          [{
            text: '💚 Здоровое питание',
            callback_data: 'settings_goal_health'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_nutrition'
          }]
        ]
      };

      await bot.editMessageText(goalMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    }

    else if (callbackData === 'settings_recalc') {
      // Пересчет всех целей на основе текущих данных
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      await user.update(targets);

      await bot.answerCallbackQuery(query.id, { text: 'Цели питания пересчитаны!' });
      await bot.sendMessage(chatId, '🔄 **Цели питания пересчитаны**\n\nПосмотрите статистику командой /stats');
    }

    else if (callbackData === 'settings_notifications_enable') {
      await user.update({ notificationsEnabled: true });
      // Импортируем здесь, чтобы избежать circular dependency
      try {
        const { startUserScheduler } = require('../services/scheduler');
        await startUserScheduler(user);
      } catch (error) {
        console.error('Ошибка запуска планировщика уведомлений:', error);
      }

      await bot.answerCallbackQuery(query.id, { text: 'Уведомления включены!' });
      await bot.sendMessage(chatId, '✅ **Уведомления включены**\n\nТеперь бот будет напоминать о приемах пищи и мотивации.');
    }

    else if (callbackData.startsWith('settings_goal_')) {
      const goal = callbackData.replace('settings_goal_', '');
      console.log(`🎯 Изменение цели на: ${goal}`);
      console.log(`📊 Текущие данные: calories=${user.targetCaloriesPerDay}, protein=${user.targetProtein}, fat=${user.targetFat}, carbs=${user.targetCarbs}`);

      await user.update({ mainGoal: goal });

      // Пересчет целей после изменения главной цели
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      console.log(`🔄 Base calories: ${baseCalories} для цели ${goal}`);
      const targets = calculateTargets(baseCalories, goal);
      console.log(`🎯 Новые цели: ${JSON.stringify(targets)}`);

      await user.update(targets);

      const goalText = goal === 'lose_weight' ? 'Похудеть' :
                       goal === 'gain_muscle' ? 'Набрать мышечную массу' :
                       goal === 'maintain' ? 'Поддерживать вес' :
                       goal === 'health' ? 'Здоровое питание' : 'неизвестная цель';

      await bot.answerCallbackQuery(query.id, { text: `Цель изменена: ${goalText}` });

      // Возврат к меню питания
      await bot.sendMessage(chatId, `✅ **Главная цель изменена: ${goalText}**\n\nКалории и цели питания пересчитаны автоматически.`);

    }

    else if (callbackData === 'settings_favorite_foods') {
      await user.update({ state: 'settings_waiting_favorite_foods' });
      await bot.sendMessage(chatId,
        '🍳 **Любимая еда**\n\nТекущие предпочтения:\n' +
        `${(user.favoriteFoods && user.favoriteFoods.length > 0) ? user.favoriteFoods.join(', ') : 'не указана'}\n\n` +
        'Укажите любимые продукты через запятую:\n' +
        '• Овсянка, гречка, курица');
    }

    else if (callbackData === 'settings_disliked_foods') {
      await user.update({ state: 'settings_waiting_disliked_foods' });
      await bot.sendMessage(chatId,
        '👎 **Нелюбимая еда**\n\nТекущие предпочтения:\n' +
        `${(user.dislikedFoods && user.dislikedFoods.length > 0) ? user.dislikedFoods.join(', ') : 'не указана'}\n\n` +
        'Укажите нежелательные продукты через запятую:\n' +
        '• Рыба, брокколи, молоко');
    }

    else if (callbackData === 'settings_motivation_level') {
      const motivationMessage = '💪 **Уровень мотивации**\n\nТекущий уровень: ' +
        `${ConstantsUtils.getMotivationText(user.currentMotivationLevel) || 'не установлен'}\n\n` +
        'Выберите ваш уровень мотивации:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '🟡 Низкий',
            callback_data: 'settings_motivation_level_low'
          }],
          [{
            text: '🟠 Средний',
            callback_data: 'settings_motivation_level_medium'
          }],
          [{
            text: '🟢 Высокий',
            callback_data: 'settings_motivation_level_high'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_preferences'
          }]
        ]
      };

      await bot.editMessageText(motivationMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    }

    else if (callbackData === 'settings_motivation_type') {
      const typeMessage = '🎯 **Тип мотивации**\n\nТекущий тип: ' +
        `${ConstantsUtils.getMotivationTypeText(user.motivationType) || 'не установлен'}\n\n` +
        'Выберите что вас мотивирует:';

      const inlineKeyboard = {
        inline_keyboard: [
          [{
            text: '🏆 Достижения',
            callback_data: 'settings_motivation_type_achievement'
          }],
          [{
            text: '❤️ Здоровье',
            callback_data: 'settings_motivation_type_health'
          }],
          [{
            text: '👙 Внешность',
            callback_data: 'settings_motivation_type_appearance'
          }],
          [{
            text: '🛋️ Комфорт',
            callback_data: 'settings_motivation_type_comfort'
          }],
          [{
            text: '◀️ Назад',
            callback_data: 'settings_preferences'
          }]
        ]
      };

      await bot.editMessageText(typeMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });
    }

    else if (callbackData === 'settings_timezone') {
      await user.update({ state: 'settings_waiting_timezone' });
      await bot.sendMessage(chatId,
        '🌍 **Часовой пояс**\n\nТекущий: ' +
        `${user.timezone || 'Europe/Moscow'}\n\n` +
        'Введите часовой пояс в формате:\n' +
        '• Europe/Moscow\n' +
        '• Europe/London\n' +
        '• America/New_York\n' +
        '• Asia/Tokyo');
    }

    else if (callbackData.startsWith('settings_motivation_level_')) {
      const level = callbackData.replace('settings_motivation_level_', '');
      await user.update({ currentMotivationLevel: level });

      const levelText = ConstantsUtils.getMotivationText(level);
      await bot.answerCallbackQuery(query.id, { text: `Уровень мотивации: ${levelText}` });
      await bot.sendMessage(chatId, `✅ **Уровень мотивации изменен: ${levelText}**`);
    }

    else if (callbackData.startsWith('settings_motivation_type_')) {
      const type = callbackData.replace('settings_motivation_type_', '');
      await user.update({ motivationType: type });

      const typeText = ConstantsUtils.getMotivationTypeText(type);
      await bot.answerCallbackQuery(query.id, { text: `Тип мотивации: ${typeText}` });
      await bot.sendMessage(chatId, `✅ **Тип мотивации изменен: ${typeText}**`);
    }

    else if (callbackData === 'settings_notifications_disable') {
      await user.update({ notificationsEnabled: false });
      // Импортируем здесь, чтобы избежать circular dependency
      try {
        const { stopUserScheduler } = require('../services/scheduler');
        await stopUserScheduler(user.id);
      } catch (error) {
        console.error('Ошибка остановки планировщика уведомлений:', error);
      }

      await bot.answerCallbackQuery(query.id, { text: 'Уведомления отключены!' });
      await bot.sendMessage(chatId, '❌ **Уведомления отключены**\n\nБольше не будет напоминаний о питании.');
    }

    else {
      await bot.answerCallbackQuery(query.id, { text: 'Функция в разработке' });
    }

  } catch (error) {
    console.error('Ошибка изменения настроек:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
  }
}

// Функция обработки callback'ов рецептов
async function handleRecipeCallbacks(bot, query, user) {
  const chatId = query.message.chat.id;
  const callbackData = query.data;

  try {
    const recipeController = require('../controllers/recipeController');

    console.log(`🍳 Обработка callback рецепта: ${callbackData} для пользователя ${user.id}`);

    if (callbackData === 'recipe_from_my_foods') {
      // Генерируем рецепт из продуктов пользователя
      await bot.answerCallbackQuery(query.id, { text: 'Генерируем рецепт... 🍳' });

      const result = await recipeController.generateRecipeFromUserFoods(user.id);

      if (result.error) {
        await bot.sendMessage(chatId, `❌ ${result.error}`);
        return;
      }

      if (!result.success) {
        await bot.sendMessage(chatId, `❌ ${result.error || 'Не удалось сгенерировать рецепт'}`);
        return;
      }

      // Показываем рецепт
      await showRecipeCard(bot, chatId, result.db_recipe, user.id);

    } else if (callbackData === 'recipe_with_new_ingredient') {
      // Генерируем рецепт с новым ингредиентом
      await bot.answerCallbackQuery(query.id, { text: 'Знакомим с новым продуктом... 🆕' });

      const result = await recipeController.generateRecipeWithNewIngredient({
        age: user.age,
        goal: user.mainGoal
      });

      if (!result.success && result.error) {
        await bot.sendMessage(chatId, `❌ ${result.error}`);
        return;
      }

      if (!result.success) {
        await bot.sendMessage(chatId, `❌ ${result.error || 'Не удалось сгенерировать рецепт'}`);
        return;
      }

      // Показываем рецепт с информацией о новом ингредиенте
      await showRecipeCardWithNewIngredient(bot, chatId, result.db_recipe, result.new_ingredient, user.id);

    } else if (callbackData === 'recipe_favorites') {
      // Показываем избранные рецепты
      await bot.answerCallbackQuery(query.id, { text: 'Загружаем избранное... ⭐' });

      const favorites = await recipeController.getUserRecipes(user.id);

      if (favorites.length === 0) {
        await bot.sendMessage(chatId, 'У вас пока нет избранных рецептов. Попробуйте другие разделы!');
        return;
      }

      // Показываем список избранных рецептов
      await showRecipesList(bot, chatId, favorites, user.id, 'избранных');

    } else if (callbackData === 'recipe_under_calories') {
      // Подсчитываем оставшиеся калории
      const { getTodaysNutrition } = require('../controllers/foodAnalysisController');
      const todaysNutrition = await getTodaysNutrition(user.id);
      const remainingCalories = user.targetCaloriesPerDay - todaysNutrition.calories;

      if (remainingCalories <= 50) {
        await bot.sendMessage(chatId, 'У вас осталось мало калорий на сегодня. Завтра сможете приготовить что-то вкусное! 🌅');
        return;
      }

  await bot.answerCallbackQuery(query.id, { text: `Генерируем рецепт на ${remainingCalories.toFixed(0)} ккал... 📊` });

  // Генерируем сбалансированный рецепт под оставшиеся калории (независимо от продуктов пользователя)
  const result = await recipeController.generateBalancedRecipeForCalories(remainingCalories);

      if (result.error) {
        await bot.sendMessage(chatId, `❌ ${result.error}`);
        return;
      }

      if (!result.success) {
        await bot.sendMessage(chatId, `❌ ${result.error || 'Не удалось сгенерировать рецепт'}`);
        return;
      }

      await showRecipeCard(bot, chatId, result.db_recipe, user.id);

    } else if (callbackData.startsWith('recipe_show_')) {
      // Показать детали рецепта
      const recipeId = parseInt(callbackData.replace('recipe_show_', ''));
      const recipe = await recipeController.getRecipeById(recipeId);

      if (!recipe) {
        await bot.sendMessage(chatId, 'Рецепт не найден');
        return;
      }

      await bot.answerCallbackQuery(query.id);
      await showRecipeCard(bot, chatId, recipe, user.id);

    } else if (callbackData.startsWith('recipe_favorite_')) {
      // Добавить/убрать из избранного
      const recipeId = parseInt(callbackData.replace('recipe_favorite_', ''));
      const isFavorite = await recipeController.isFavorite(user.id, recipeId);

      let success = false;
      if (isFavorite) {
        success = await recipeController.removeFromFavorites(user.id, recipeId);
        await bot.answerCallbackQuery(query.id, { text: 'Удалено из избранного ❌' });
      } else {
        success = await recipeController.addToFavorites(user.id, recipeId);
        await bot.answerCallbackQuery(query.id, { text: 'Добавлено в избранное ❤️' });
      }

      if (!success) {
        await bot.sendMessage(chatId, 'Ошибка при обновлении избранного');
      }

    }

  } catch (error) {
    console.error('Ошибка обработки callback рецепта:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
  }
}

// Функция отображения карточки рецепта
async function showRecipeCard(bot, chatId, recipe, userId) {
  try {
    const isFavorite = await require('../controllers/recipeController').isFavorite(userId, recipe.id);
    const favoriteText = isFavorite ? '💔 Убрать из избранного' : '❤️ В избранное';

    const recipeText = `🍳 **${recipe.title}**

${recipe.description || ''}

⏱️ *Время приготовления:* ${recipe.cooking_time || 15} мин
👥 *Порции:* ${recipe.servings || 1}
⚡ *Сложность:* ${getDifficultyText(recipe.difficulty_level)}

📝 **Ингредиенты:**
${formatIngredients(recipe.ingredients)}

📋 **Инструкция:**
${formatInstructions(recipe.instructions)}

🍽️ **КБЖУ на порцию:**
• Калории: ${recipe.nutrition_per_serving.calories} ккал
• Белки: ${recipe.nutrition_per_serving.protein}г
• Жиры: ${recipe.nutrition_per_serving.fat}г
• Углеводы: ${recipe.nutrition_per_serving.carbs}г

🏷️ *Теги:* ${recipe.tags.join(', ') || 'отсутствуют'}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: favoriteText,
          callback_data: `recipe_favorite_${recipe.id}`
        }]
      ]
    };

    await bot.sendMessage(chatId, recipeText, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

  } catch (error) {
    console.error('Ошибка отображения карточки рецепта:', error);
    await bot.sendMessage(chatId, 'Ошибка при отображении рецепта');
  }
}

// Функция отображения рецепта с новым ингредиентом
async function showRecipeCardWithNewIngredient(bot, chatId, recipe, newIngredient, userId) {
  try {
    const isFavorite = await require('../controllers/recipeController').isFavorite(userId, recipe.id);
    const favoriteText = isFavorite ? '💔 Убрать из избранного' : '❤️ В избранное';

    const recipeText = `🆕 **Новый продукт: ${newIngredient.name}**

💡 *Почему полезно:* ${newIngredient.benefit}
🏷️ *Категория:* ${newIngredient.category}

🍳 **${recipe.title}**

${recipe.description || ''}

⏱️ *Время приготовления:* ${recipe.cooking_time || 15} мин
👥 *Порции:* ${recipe.servings || 1}
⚡ *Сложность:* ${getDifficultyText(recipe.difficulty_level)}

📝 **Ингредиенты:**
${formatIngredients(recipe.ingredients)}

📋 **Инструкция:**
${formatInstructions(recipe.instructions)}

🍽️ **КБЖУ на порцию:**
• Калории: ${recipe.nutrition_per_serving.calories} ккал
• Белки: ${recipe.nutrition_per_serving.protein}г
• Жиры: ${recipe.nutrition_per_serving.fat}г
• Углеводы: ${recipe.nutrition_per_serving.carbs}г

🏷️ *Теги:* ${recipe.tags.join(', ') || 'отсутствуют'}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [{
          text: favoriteText,
          callback_data: `recipe_favorite_${recipe.id}`
        }],
        [{
          text: 'Ещё рецепт',
          callback_data: 'recipe_with_new_ingredient'
        }]
      ]
    };

    await bot.sendMessage(chatId, recipeText, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

  } catch (error) {
    console.error('Ошибка отображения рецепта с новым ингредиентом:', error);
    await bot.sendMessage(chatId, 'Ошибка при отображении рецепта');
  }
}

// Функция отображения списка рецептов
async function showRecipesList(bot, chatId, recipes, userId, title) {
  try {
    if (recipes.length === 0) {
      await bot.sendMessage(chatId, `У вас пока нет ${title} рецептов 💭`);
      return;
    }

    let message = `⭐ **Ваши ${title} рецепты:**\n\n`;

    const inlineKeyboard = {
      inline_keyboard: []
    };

    recipes.slice(0, 5).forEach(recipe => { // Максимум 5 рецептов в списке
      message += `• ${recipe.title} (${recipe.cooking_time || 15} мин)\n`;

      inlineKeyboard.inline_keyboard.push([{
        text: `👀 ${recipe.title}`,
        callback_data: `recipe_show_${recipe.id}`
      }]);
    });

    if (recipes.length > 5) {
      message += `\nИ еще ${recipes.length - 5} рецептов...`;
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

  } catch (error) {
    console.error('Ошибка отображения списка рецептов:', error);
    await bot.sendMessage(chatId, 'Ошибка при загрузке списка рецептов');
  }
}

// Вспомогательные функции
function getDifficultyText(level) {
  const difficulties = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно'
  };
  return difficulties[level] || 'Средне';
}

function formatIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return 'Не указаны';

  return ingredients.map(ing =>
    `• ${ing.name}: ${ing.amount} ${ing.unit}`
  ).join('\n');
}

function formatInstructions(instructions) {
  if (!instructions) return 'Не указаны';

  // Разбиваем по нумерации или точкам
  const steps = instructions.split(/\d+\.|\•/).filter(step => step.trim());

  if (steps.length <= 1) {
    return instructions.split('\n').map((step, index) =>
      `${index + 1}. ${step.trim()}`
    ).join('\n');
  }

  return steps.map((step, index) =>
    `${index + 1}. ${step.trim()}`
  ).join('\n');
}

// Функция обработки ввода данных настроек
async function handleSettingsInput(bot, user, text, chatId) {
  try {
    console.log(`⚙️ Обработка ввода настроек: ${text} состояние: ${user.state}`);

    if (user.state === 'settings_waiting_weight') {
      const weight = parseFloat(text.trim());

      if (isNaN(weight) || weight < 30 || weight > 300) {
        await bot.sendMessage(chatId, '❌ **Неверный формат веса**\n\nВведите вес в килограммах (например: 75 или 75.5)');
        return;
      }

      await user.update({
        weight: weight,
        state: null
      });

      // Пересчет целей после изменения веса
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      await user.update(targets);

      await bot.sendMessage(chatId,
        `✅ **Вес обновлен: ${weight} кг**\n\nКалории и цели питания пересчитаны автоматически.\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_height') {
      const height = parseFloat(text.trim());

      if (isNaN(height) || height < 100 || height > 250) {
        await bot.sendMessage(chatId, '❌ **Неверный формат роста**\n\nВведите рост в сантиметрах (например: 180)');
        return;
      }

      console.log(`📏 Изменение роста: старый ${user.height} см -> новый ${height} см`);

      await user.update({
        height: height,
        state: null
      });

      // Пересчет целей после изменения роста
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      console.log(`🔄 Пересчет с данными: age=${user.age}, gender=${user.gender}, height=${user.height}, weight=${user.weight}`);
      const baseCalories = calculateDailyCalories(user);
      console.log(`⚡ Новый BMR: ${baseCalories} ккал`);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      console.log(`🎯 Новые цели: ${JSON.stringify(targets)}`);
      await user.update(targets);

      await bot.sendMessage(chatId,
        `✅ **Рост обновлен: ${height} см**\n\nКалории и цели питания пересчитаны автоматически (${baseCalories.toFixed(0)} ккал).\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_age') {
      const age = parseInt(text.trim());

      if (isNaN(age) || age < 10 || age > 120) {
        await bot.sendMessage(chatId, '❌ **Неверный формат возраста**\n\nВведите возраст в годах (от 10 до 120)');
        return;
      }

      await user.update({
        age: age,
        state: null
      });

      // Пересчет целей после изменения возраста
      const { calculateDailyCalories, calculateTargets } = require('../controllers/commandHandlers');
      const baseCalories = calculateDailyCalories(user);
      const targets = calculateTargets(baseCalories, user.mainGoal);
      await user.update(targets);

      await bot.sendMessage(chatId,
        `✅ **Возраст обновлен: ${age} лет**\n\nКалории и цели питания пересчитаны автоматически.\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_calories') {
      const calories = parseInt(text.trim());

      if (isNaN(calories) || calories < 1200 || calories > 5000) {
        await bot.sendMessage(chatId, '❌ **Неверный формат калорий**\n\nВведите норму калорий (от 1200 до 5000):');
        return;
      }

      await user.update({
        targetCaloriesPerDay: calories,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Калории обновлены: ${calories} ккал**\n\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_protein') {
      const protein = parseFloat(text.trim());

      if (isNaN(protein) || protein < 50 || protein > 400) {
        await bot.sendMessage(chatId, '❌ **Неверный формат белков**\n\nВведите норму белков в граммах (от 50 до 400):');
        return;
      }

      await user.update({
        targetProtein: protein,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Белки обновлены: ${protein} г**\n\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_fat') {
      const fat = parseFloat(text.trim());

      if (isNaN(fat) || fat < 35 || fat > 200) {
        await bot.sendMessage(chatId, '❌ **Неверный формат жиров**\n\nВведите норму жиров в граммах (от 35 до 200):');
        return;
      }

      await user.update({
        targetFat: fat,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Жиры обновлены: ${fat} г**\n\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_carbs') {
      const carbs = parseFloat(text.trim());

      if (isNaN(carbs) || carbs < 100 || carbs > 800) {
        await bot.sendMessage(chatId, '❌ **Неверный формат углеводов**\n\nВведите норму углеводов в граммах (от 100 до 800):');
        return;
      }

      await user.update({
        targetCarbs: carbs,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Углеводы обновлены: ${carbs} г**\n\nПосмотрите статистику командой /stats`
      );

    } else if (user.state === 'settings_waiting_favorite_foods') {
      if (!text.trim()) {
        await bot.sendMessage(chatId, '❌ **Ошибка**\n\nСписок любимых продуктов не может быть пустым.');
        return;
      }

      const favoriteFoods = text.split(',').map(item => item.trim()).filter(item => item.length > 0);
      if (favoriteFoods.length === 0) {
        await bot.sendMessage(chatId, '❌ **Ошибка**\n\nНе удалось распознать продукты. Укажите их через запятую.');
        return;
      }

      await user.update({
        favoriteFoods: favoriteFoods,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Любимые продукты обновлены:**\n• ${favoriteFoods.join('\n• ')}\n\nЭта информация поможет подбирать более подходящие рецепты.`);

    } else if (user.state === 'settings_waiting_disliked_foods') {
      if (!text.trim()) {
        await bot.sendMessage(chatId, '❌ **Ошибка**\n\nСписок нелюбимых продуктов не может быть пустым.');
        return;
      }

      const dislikedFoods = text.split(',').map(item => item.trim()).filter(item => item.length > 0);
      if (dislikedFoods.length === 0) {
        await bot.sendMessage(chatId, '❌ **Ошибка**\n\nНе удалось распознать продукты. Укажите их через запятую.');
        return;
      }

      await user.update({
        dislikedFoods: dislikedFoods,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Нелюбимые продукты обновлены:**\n• ${dislikedFoods.join('\n• ')}\n\nБот будет избегать эти продукты в рецептах.`);

    } else if (user.state === 'settings_waiting_timezone') {
      if (!text.trim()) {
        await bot.sendMessage(chatId, '❌ **Ошибка**\n\nЧасовой пояс не может быть пустым.');
        return;
      }

      const timezone = text.trim();
      // Простая проверка формата timezone
      const timezonePattern = /^[A-Za-z_\/]+$/;
      if (!timezonePattern.test(timezone)) {
        await bot.sendMessage(chatId,
          '❌ **Неверный формат часового пояса**\n\nИспользуйте формат:\n• Europe/Moscow\n• America/New_York');
        return;
      }

      await user.update({
        timezone: timezone,
        state: null
      });

      await bot.sendMessage(chatId,
        `✅ **Часовой пояс обновлен: ${timezone}**\n\nУведомления будут приходить по локальному времени.`);

    } else {
      // Неизвестное состояние настроек
      await user.update({ state: null });
      await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте еще раз.');
    }

  } catch (error) {
    console.error('Ошибка обработки ввода настроек:', error);
    await user.update({ state: null });
    await bot.sendMessage(chatId, '❌ Произошла ошибка при сохранении настроек');
  }
}

// Создание Express приложения для webhook
const app = express();
app.use(express.json());

// Инициализация бота - простая конфигурация
const bot = new TelegramBot(config.BOT_TOKEN, {
  polling: !config.WEBHOOK_URL
});

// Установка webhook если URL указан
if (config.WEBHOOK_URL) {
  bot.setWebHook(`${config.WEBHOOK_URL}/bot${config.BOT_TOKEN}`);
  console.log('🤖 Webhook установлен:', config.WEBHOOK_URL);
}

// Webhook endpoint
app.post(`/bot${config.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Обработчики основных команд
console.log('📝 Настройка обработчиков команд...');

bot.onText(CONSTANTS.COMMANDS.START, async (msg) => {
  console.log('🔄 Получена команда /start от', msg.from.username);
  try {
    await handleStart(bot, msg);
    console.log('✅ Команда /start обработана');
  } catch (error) {
    console.error('❌ Ошибка в /start:', error);
    await bot.sendMessage(msg.chat.id, t('errors.general'));
  }
});

bot.onText(CONSTANTS.COMMANDS.HELP, async (msg) => {
  console.log('🔄 Получена команда /help');
  try {
    await handleHelp(bot, msg);
    console.log('✅ Команда /help обработана');
  } catch (error) {
    console.error('❌ Ошибка в /help:', error);
  }
});

bot.onText(CONSTANTS.COMMANDS.STATS, async (msg) => {
  console.log('🔄 Получена команда /stats');
  try {
    await handleStats(bot, msg);
    console.log('✅ Команда /stats обработана');
  } catch (error) {
    console.error('❌ Ошибка в /stats:', error);
  }
});

bot.onText(CONSTANTS.COMMANDS.SETTINGS, async (msg) => {
  console.log('🔄 Получена команда /settings');
  try {
    await handleSettings(bot, msg);
    console.log('✅ Команда /settings обработана');
  } catch (error) {
    console.error('❌ Ошибка в /settings:', error);
  }
});

bot.onText(CONSTANTS.COMMANDS.ENABLE_NOTIFICATIONS, async (msg) => {
  console.log('🔄 Получена команда /enable_notifications');
  try {
    await handleEnableNotifications(bot, msg);
    console.log('✅ Команда /enable_notifications обработана');
  } catch (error) {
    console.error('❌ Ошибка в /enable_notifications:', error);
  }
});

bot.onText(CONSTANTS.COMMANDS.DISABLE_NOTIFICATIONS, async (msg) => {
  console.log('🔄 Получена команда /disable_notifications');
  try {
    await handleDisableNotifications(bot, msg);
    console.log('✅ Команда /disable_notifications обработана');
  } catch (error) {
    console.error('❌ Ошибка в /disable_notifications:', error);
  }
});

console.log('✅ Обработчики команд настроены');

// Добавим обработчик polling ошибок для диагностики
bot.on('polling_error', (error) => {
  console.error('🔴 Polling error:', {
    code: error.code,
    message: error.message,
    stack: error.stack?.split('\n')[0]
  });
  // Не завершаем процесс, продолжаем работать
});

console.log('✅ Обработчики ошибок настроены');

// Обработчик inline кнопок
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    const { User } = require('../database/models');
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      await bot.answerCallbackQuery(query.id, { text: 'Пользователь не найден. Запустите бота командой /start' });
      return;
    }

    // Обработка кнопок подтверждения приема пищи
    if (query.data === 'save_meal' || query.data === 'cancel_meal') {
      if (user.pendingConfirmationAnalysis && user.pendingConfirmationMessageId) {
        const analysis = JSON.parse(user.pendingConfirmationAnalysis);

        if (query.data === 'save_meal') {
          // Сохранить прием пищи (импорт внутри для избежания circular dependency)
          const { saveMeal } = require('../controllers/foodAnalysisController');
          const description = analysis.analysis.description;
          await saveMeal(user, description, analysis);

          // Получить обновленное питание и возможно отправить мотивацию
          const { getTodaysNutrition, sendMotivationalMessage } = require('../controllers/foodAnalysisController');
          const todaysNutrition = await getTodaysNutrition(user.id);
          console.log('Отредактировано питание сегодня после сохранения:', todaysNutrition);

          // Ответ пользователю
          await bot.answerCallbackQuery(query.id, { text: 'Прием пищи сохранен! 🍽️' });

          // Редактировать сообщение
          const currentText = query.message.text;
          const newText = currentText + '\n\n' + t('food.success.saved');
          await bot.editMessageText(newText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {} // убрать кнопки
          });
        } else {
          // Отменить сохранение
          await bot.answerCallbackQuery(query.id, { text: 'Сохранение отменено ❌' });

          // Редактировать сообщение
          const currentText = query.message.text;
          const newText = currentText + '\n\n' + t('food.success.not_saved');
          await bot.editMessageText(newText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {} // убрать кнопки
          });
        }

        // Очистить pending данные
        await user.update({
          pendingConfirmationAnalysis: null,
          pendingConfirmationMessageId: null
        });

        console.log(`✅ Подтверждение обработано для пользователя ${user.telegramId}: ${query.data}`);
      } else {
        await bot.answerCallbackQuery(query.id, { text: 'Нет ожидающего подтверждения' });
      }
    } else if (query.data === 'cancel_food_clarification') {
      // Обработка отмены уточнения продуктов
      if (user.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_TYPE ||
          user.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT) {

        await user.update({
          pendingFoodDescription: null,
          pendingAnalysis: null,
          state: null,
          foodDetailsTimeout: null
        });

        await bot.answerCallbackQuery(query.id, { text: 'Уточнение отменено' });

        // Редактировать сообщение
        const currentText = query.message.text;
        const newText = currentText + '\n\n❌ Уточнение отменено';
        await bot.editMessageText(newText, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {} // убрать кнопки
        });

        console.log(`✅ Уточнение отменено для пользователя ${user.telegramId}`);
      } else {
        await bot.answerCallbackQuery(query.id, { text: 'Нет активного уточнения' });
      }
    } else if (query.data.startsWith('recipe_')) {
      // Обработка кнопок рецептов
      await handleRecipeCallbacks(bot, query, user);
    } else if (query.data.startsWith('settings_')) {
      // Обработка кнопок настроек
      await handleSettingsCallbacks(bot, query, user);
    } else {
      await bot.answerCallbackQuery(query.id, { text: 'Неизвестное действие' });
    }

  } catch (error) {
    console.error('Ошибка обработки callback query:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
  }
});

// Обработчик фото сообщений
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { User } = require('../database/models');
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    console.log('Получено фото для анализа от пользователя', user.telegramId);

    // Импортируем обработчик фото
    const { handlePhotoAnalysis } = require('../controllers/foodAnalysisController');
    await handlePhotoAnalysis(bot, user, msg, chatId);

  } catch (error) {
    console.error('Ошибка обработки фото:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
});

// Обработчик голосовых сообщений
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { User } = require('../database/models');
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    console.log('Получено голосовое сообщение от пользователя', user.telegramId);

    // Проверяем, находится ли пользователь в состоянии уточнения веса
    if (user.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT) {
      // Транскрибируем голосовое и обрабатываем как ответ на уточнение веса
      console.log('Пользователь уточняет вес голосом');
      await handleVoiceWeightClarification(bot, user, msg, chatId);
    } else {
      // Обычная обработка голосового сообщения для анализа еды
      // Импортируем обработчик голоса
      const { handleVoiceAnalysis } = require('../controllers/foodAnalysisController');
      await handleVoiceAnalysis(bot, user, msg, chatId);
    }

  } catch (error) {
    console.error('Ошибка обработки голосового сообщения:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
});

// Обработка всех текстовых сообщений (команды и кнопки)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text) return;

  try {
    // Импортируем здесь, чтобы избежать circular dependency
    const { User } = require('../database/models');
    const user = await User.findOne({ where: { telegramId: userId } });

    console.log('Обработка сообщения text:', text.trim(), 'от пользователя', user?.telegramId, 'состояние:', user?.state);

    // Обработка кнопок (соответствуют командам)
    switch (text) {
      case t('buttons.add_food'):
        await bot.sendMessage(chatId, t('buttons.add_food_prompt'));
        return;

      case t('buttons.recipes'):
        return await handleRecipes(bot, msg);

      case t('buttons.stats'):
        return await handleStats(bot, msg);

      case t('buttons.settings'):
        return await handleSettings(bot, msg);

      case t('buttons.help'):
        return await handleHelp(bot, msg);
    }

    // Пропустить команды - они обрабатываются отдельно
    if (CONSTANTS.REGEX.COMMAND.test(text)) return;

    if (!user) {
      await bot.sendMessage(chatId, t('errors.start'));
      return;
    }

    // Обработка состояний онбординга и диалогов
    if (user.state) {
      if (user.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_TYPE ||
          user.state === CONSTANTS.ONBOARDING_STATES.AWAITING_FOOD_WEIGHT) {
        await handleFoodDetailsResponse(bot, user, text, chatId);
      } else if (user.state.startsWith('settings_waiting_')) {
        // Обработка состояний настроек
        await handleSettingsInput(bot, user, text, chatId);
      } else {
        await handleOnboardingState(bot, user, text, chatId);
      }
    }
    // Обработка ввода еды
    else {
      await handleFoodAnalysis(bot, user, text, chatId);
    }

  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, t('errors.general'));
  }
});

// Start server
async function startBot() {
  try {
    await connectDB();

    if (config.WEBHOOK_URL) {
      app.listen(config.WEBHOOK_PORT, () => {
        console.log(`🚀 Server running on port ${config.WEBHOOK_PORT}`);
        console.log(`🔗 Webhook URL: ${config.WEBHOOK_URL}`);
      });
    } else {
      console.log('🤖 Bot started with polling');
    }

    console.log('✅ Eat_bot successfully started!');

  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot...');
  if (bot) {
    await bot.close();
  }
  process.exit(0);
});

startBot();

module.exports = bot;
