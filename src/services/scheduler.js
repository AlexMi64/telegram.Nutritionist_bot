const cron = require('node-cron');
const { User, Notification } = require('../database/models');
const { generateMotivation, generateMealSuggestion } = require('./openaiService');

// Store active cron jobs
const activeJobs = new Map();

// Schedule types with cron expressions
const SCHEDULE_TYPES = {
  morning: '0 7 * * *',      // 7:00 AM daily
  midday: '0 12 * * *',     // 12:00 PM daily
  evening: '0 19 * * *',    // 7:00 PM daily
  reminder: '0 */4 * * *'   // Every 4 hours
};

/**
 * Start scheduler for a user
 * @param {Object} user - User object
 */
async function startUserScheduler(user) {
  const userId = user.id;

  // Stop existing jobs for this user
  if (activeJobs.has(userId)) {
    stopUserScheduler(userId);
  }

  const jobs = [];
  const notifications = await getUserNotifications(user);

  notifications.forEach(notification => {
    const cronExpression = SCHEDULE_TYPES[notification.type];
    if (cronExpression) {
      const job = cron.schedule(cronExpression, () => {
        sendScheduledMessage(notification);
      }, {
        scheduled: false, // Don't start immediately
        timezone: user.timezone || 'Europe/Moscow'
      });

      job.start();
      jobs.push(job);
    }
  });

  activeJobs.set(userId, jobs);
  console.log(`🔄 Started ${jobs.length} scheduled jobs for user ${user.telegramId}`);
}

/**
 * Stop scheduler for a user
 * @param {number} userId - User ID
 */
function stopUserScheduler(userId) {
  const jobs = activeJobs.get(userId);
  if (jobs) {
    jobs.forEach(job => job.stop());
    activeJobs.delete(userId);
    console.log(`🚫 Stopped scheduled jobs for user ${userId}`);
  }
}

/**
 * Send scheduled message to user
 * @param {Object} notification - Notification object
 */
async function sendScheduledMessage(notification) {
  try {
    const user = await User.findByPk(notification.userId);
    if (!user || !user.notificationsEnabled) return;

    const bot = require('../bot/bot');
    const chatId = user.telegramId;

    let message;
    let success = false;

    switch (notification.type) {
      case 'morning':
        message = await generateMorningMessage(user);
        if (message) success = await sendMessage(bot, chatId, message);
        break;

      case 'midday':
        message = await generateMiddayMessage(user);
        if (message) success = await sendMessage(bot, chatId, message);
        break;

      case 'evening':
        message = await generateEveningMessage(user);
        if (message) success = await sendMessage(bot, chatId, message);
        break;

      case 'reminder':
        message = await generateReminderMessage(user);
        if (message) success = await sendMessage(bot, chatId, message);
        break;
    }

    // Mark notification as sent
    await notification.update({
      sentAt: new Date(),
      status: success ? 'sent' : 'failed'
    });

  } catch (error) {
    console.error('Scheduled message error:', error);
    if (notification) {
      await notification.update({ status: 'failed' });
    }
  }
}

/**
 * Generate morning message with NLP elements
 * @param {Object} user - User data
 * @returns {string} - Personalized morning message
 */
async function generateMorningMessage(user) {
  try {
    const motivationPrompt = `
Создай вдохновляющее утреннее сообщение для пользователя как личный коуч.

Профиль пользователя:
- Мотивация: ${user.motivationType}
- Цель: ${user.mainGoal}
- Уровень мотивации: ${user.currentMotivationLevel}

Используя НЛП-приемы:
- Визуализируй достижение цели
- Используй позитивные формулировки
- Учти тип мотивации
- Создай эмоциональную связь

Сообщение должно быть:
- Личным и мотивирующим
- Не более 300 символов
- Содержать призыв к действию
- Отношение как от личного коуча`;

    const aiResponse = await generateMotivation({
      // Mock current progress for morning message
      calories: user.targetCaloriesPerDay * 0.1,
      protein: user.targetProtein * 0.1,
      fat: user.targetFat * 0.1,
      carbs: user.targetCarbs * 0.1
    });

    return `🌅 Доброе утро, ${user.firstName || 'друг'}!\n\n${aiResponse || 'Новый день - новые возможности! Сегодня мы делаем очередной шаг к вашей цели.'}\n\nЧем начнете свое здоровое питание?`;

  } catch (error) {
    console.error('Morning message generation error:', error);
    return '🌅 Доброе утро! Начнем этот день с правильного питания. Что на завтрак подготовим вместе?';
  }
}

/**
 * Generate midday reminder message
 * @param {Object} user - User data
 * @returns {string} - Midday message
 */
async function generateMiddayMessage(user) {
  try {
    // Check current day's nutrition
    const todaysMeals = await getTodaysNutrition(user.id);
    const progress = calculateDayProgress(todaysMeals, user);

    let message = `🍽️ Как прошел обед?\n\n`;

    if (progress.relativeCalories < 50) {
      message += `Вы уже съели ${progress.currentCalories} из ${user.targetCaloriesPerDay} калорий.\n`;
      message += `Осталось: ${Math.max(0, user.targetCaloriesPerDay - progress.currentCalories)} калорий на остаток дня.\n\n`;
    } else {
      message += `Вы съели уже более половины дневной нормы! Продолжайте в том же духе.\n\n`;
    }

    message += `Напишите, что съели, или запросите идеи для ужина.`;

    return message;

  } catch (error) {
    console.error('Midday message error:', error);
    return '🍽️ Как обед? Расскажите о приемах пищи или запросите меню!';
  }
}

/**
 * Generate evening reflection message
 * @param {Object} user - User data
 * @returns {string} - Evening message
 */
async function generateEveningMessage(user) {
  try {
    const todaysMeals = await getTodaysNutrition(user.id);
    const progress = calculateDayProgress(todaysMeals, user);

    let message = `🌙 Вечернее подведение итогов\n\n`;

    message += `Сегодня вы съели:\n`;
    message += `• ${progress.currentCalories} калорий (${Math.round(progress.relativeCalories)}% нормы)\n`;
    message += `• ${progress.currentProtein}г белка (${Math.round(progress.relativeProtein)}% нормы)\n`;
    message += `• ${progress.currentFat}г жиров (${Math.round(progress.relativeFat)}% нормы)\n`;
    message += `• ${progress.currentCarbs}г углеводов (${Math.round(progress.relativeCarbs)}% нормы)\n\n`;

    if (progress.relativeCalories >= 80) {
      message += `Отличная работа за день! Вы молодец! 🏆\n\n`;
      message += `Не забудьте записать все приемы пищи завтра, и мы продолжим успех!`;
    } else if (progress.relativeCalories >= 50) {
      message += `Хороший прогресс! Еще осталось дней нормы.\nЗавтра наверстаем! 💪`;
    } else {
      message += `Начало положено! Завтра наберем темп.\nПомните: каждый малый шаг ведет к большой цели!`;
    }

    // Add motivation based on user type
    if (user.motivationType === 'achievement') {
      message += `\n\nТы на верном пути к успеху!`;
    } else if (user.motivationType === 'health') {
      message += `\n\nЗаботься о себе - ты стоишь этого!`;
    } else if (user.motivationType === 'appearance') {
      message += `\n\nТвои усилия непременно принесут видимые результаты!`;
    }

    return message;

  } catch (error) {
    console.error('Evening message error:', error);
    return '🌙 День подходит к концу. Расскажите о вечерних приемах пищи. Вы молодец! 💪';
  }
}

/**
 * Generate reminder message for inactive users
 * @param {Object} user - User data
 * @returns {string} - Reminder message
 */
async function generateReminderMessage(user) {
  try {
    const recentMeals = await getRecentMeals(user.id, 4); // Last 4 hours

    if (recentMeals.length === 0) {
      return `⏰ Эй, где вы? Уже долго не слышали о вашей еде!\n\nОтправьте что-нибудь скушали, чтобы продолжить трекинг. Мы вместе к цели!`;
    } else {
      return `⏰ Продолжаем трекинг? Что последней съели?\n\nВаш коуч всегда рядом для поддержки!`;
    }

  } catch (error) {
    console.error('Reminder message error:', error);
    return `⏰ Напоминалка: пора записать прием пищи! Расскажите о вашей еде.`;
  }
}

/**
 * Get user's notifications from database
 * @param {Object} user - User object
 * @returns {Array} - Array of notifications
 */
async function getUserNotifications(user) {
  // This would be enhanced with user preferences in future
  return [
    { type: 'morning', scheduledTime: new Date(), userId: user.id, id: 1 },
    { type: 'midday', scheduledTime: new Date(), userId: user.id, id: 2 },
    { type: 'evening', scheduledTime: new Date(), userId: user.id, id: 3 },
    { type: 'reminder', scheduledTime: new Date(), userId: user.id, id: 4 }
  ];
}

/**
 * Send message via bot (with error handling)
 * @param {TelegramBot} bot - Bot instance
 * @param {number} chatId - Chat ID
 * @param {string} message - Message text
 * @returns {boolean} - Success status
 */
async function sendMessage(bot, chatId, message) {
  try {
    await bot.sendMessage(chatId, message);
    return true;
  } catch (error) {
    console.error('Failed to send message:', error);
    return false;
  }
}

/**
 * Get today's nutrition data for user
 * @param {number} userId - User ID
 * @returns {Array} - Meals data
 */
async function getTodaysNutrition(userId) {
  const today = new Date().toISOString().split('T')[0];
  return await require('../database/models').Meal.findAll({
    where: { userId, date: today }
  });
}

/**
 * Calculate day progress statistics
 * @param {Array} meals - Meals data
 * @param {Object} user - User data
 * @returns {Object} - Progress stats
 */
function calculateDayProgress(meals, user) {
  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    fat: acc.fat + (meal.fat || 0),
    carbs: acc.carbs + (meal.carbs || 0),
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  return {
    currentCalories: Math.round(totals.calories),
    currentProtein: Math.round(totals.protein),
    currentFat: Math.round(totals.fat),
    currentCarbs: Math.round(totals.carbs),
    relativeCalories: (totals.calories / user.targetCaloriesPerDay) * 100,
    relativeProtein: (totals.protein / user.targetProtein) * 100,
    relativeFat: (totals.fat / user.targetFat) * 100,
    relativeCarbs: (totals.carbs / user.targetCarbs) * 100,
  };
}

/**
 * Get recent meals in time window
 * @param {number} userId - User ID
 * @param {number} hoursBack - Hours to look back
 * @returns {Array} - Recent meals
 */
async function getRecentMeals(userId, hoursBack) {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return await require('../database/models').Meal.findAll({
    where: {
      userId,
      createdAt: { [require('sequelize').Op.gt]: cutoffTime }
    }
  });
}

// Export functions
module.exports = {
  startUserScheduler,
  stopUserScheduler,
  generateMorningMessage,
  generateMiddayMessage,
  generateEveningMessage,
  generateReminderMessage
};
