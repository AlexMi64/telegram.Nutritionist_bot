#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const config = require('../config/config.json');
const translate = require('@vitalets/google-translate-api');

// Initialize sequelize
const sequelize = new Sequelize(config.development);

const { FoodData: FoodDataModel } = require('../src/database/models/index');
const FoodData = FoodDataModel(sequelize, Sequelize);

/**
 * Translation service using Google Translate with fallback
 */
class TranslationService {
  constructor() {
    this.translatedCache = new Map();
  }

  async translateText(text, from = 'en', to = 'ru') {
    if (!text || text.trim().length === 0) return text;

    // Check cache
    const cacheKey = `${text}:${from}:${to}`;
    if (this.translatedCache.has(cacheKey)) {
      return this.translatedCache.get(cacheKey);
    }

    try {
      console.log(`🌐 Translating: "${text}"`);

      // Try Google Translate first
      const result = await translate(text, { from, to });
      const translated = result.text;

      console.log(`✅ "${text}" → "${translated}"`);

      // Cache the result
      this.translatedCache.set(cacheKey, translated);

      // Respectful delay
      await this.delay(500);

      return translated;
    } catch (error) {
      console.error(`❌ Google Translate error for "${text}":`, error.message);

      // Return original text - let user see English names for now
      // Later we can integrate a working translation service
      console.log(`⚠️  Keeping original: "${text}"`);
      return text;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function translateExistingFoods() {
  const translator = new TranslationService();

  console.log('🚀 Starting translation of existing foods...');

  await sequelize.authenticate();
  console.log('✅ Database connected');

  // Find foods without Russian translation
  const foodsToTranslate = await FoodData.findAll({
    where: {
      descriptionRu: {
        [sequelize.Sequelize.Op.or]: [
          null,
          '',
          sequelize.Sequelize.literal(`description = descriptionRu`) // Same as original
        ]
      }
    },
    limit: 50 // Translate in batches
  });

  console.log(`📊 Found ${foodsToTranslate.length} foods to translate`);

  let translated = 0;
  let errors = 0;

  for (const food of foodsToTranslate) {
    try {
      const translatedText = await translator.translateText(food.description);

      // Only update if translation is different from original
      if (translatedText !== food.description) {
        await food.update({ descriptionRu: translatedText });
        console.log(`💾 Updated: ${food.id} - "${food.description}" → "${translatedText}"`);
        translated++;
      } else {
        console.log(`⏭️  No change needed: ${food.id} - "${food.description}"`);
      }

    } catch (error) {
      console.error(`❌ Error translating food ${food.id}:`, error.message);
      errors++;

      // Still update with fallback translation
      try {
        const fallbackTranslation = await translator.translateText(food.description);
        if (fallbackTranslation !== food.description) {
          await food.update({ descriptionRu: fallbackTranslation });
          console.log(`🔄 Fallback: ${food.id} - "${food.description}" → "${fallbackTranslation}"`);
          translated++;
        }
      } catch (fallbackError) {
        console.error(`❌ Fallback error for food ${food.id}:`, fallbackError.message);
      }
    }
  }

  console.log('\n🎉 Translation completed!');
  console.log(`Translated: ${translated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${foodsToTranslate.length}`);
}

async function main() {
  try {
    await translateExistingFoods();
    console.log('🎉 Translation script completed successfully!');
  } catch (error) {
    console.error('❌ Translation error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { translateExistingFoods };
