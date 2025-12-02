require('dotenv').config();

module.exports = {
  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  WEBHOOK_PORT: process.env.WEBHOOK_PORT || 3000,

  // OpenAI/OpenRouter
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || 'openai/gpt-4o',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:///./eat_bot.db',

  // App settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Bot settings
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Europe/Moscow',
  MAX_PHOTO_SIZE: parseInt(process.env.MAX_PHOTO_SIZE) || 10485760, // 10MB
  MAX_AUDIO_DURATION: parseInt(process.env.MAX_AUDIO_DURATION) || 30, // seconds

  // Redis (optional for session storage)
  REDIS_URL: process.env.REDIS_URL,

  // Limits
  MAX_DAILY_REQUESTS: parseInt(process.env.MAX_DAILY_REQUESTS) || 100,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 86400000, // 24 hours
};
