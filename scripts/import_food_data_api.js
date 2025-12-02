#!/usr/bin/env node

const axios = require('axios');
const { Sequelize } = require('sequelize');
const config = require('../config/config.json');
const { createObjectCsvWriter } = require('csv-writer'); // For progress logging
const translate = require('@vitalets/google-translate-api');

// Initialize sequelize
const sequelize = new Sequelize(config.development);

const { FoodData: FoodDataModel, FoodNutrient: FoodNutrientModel, Nutrient: NutrientModel } = require('../src/database/models/index');

const FoodData = FoodDataModel(sequelize, Sequelize);
const FoodNutrient = FoodNutrientModel(sequelize, Sequelize);
const Nutrient = NutrientModel(sequelize, Sequelize);

/**
 * Translation service using Google Translate
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
      const result = await translate(text, { from: 'en', to: 'ru' });
      const translated = result.text;

      console.log(`✅ "${text}" → "${translated}"`);

      // Cache the result
      this.translatedCache.set(cacheKey, translated);

      // Respectful delay
      await this.delay(500);

      return translated;
    } catch (error) {
      console.error(`❌ Translation error for "${text}":`, error.message);
      return text; // Return original English text
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * USDA API client
 */
class USDAClient {
  constructor() {
    this.baseURL = 'https://api.nal.usda.gov/fdc/v1';
    this.apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
    this.rateLimitDelay = 1200; // 50 requests/minute = 1200ms per request
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchFoods(params = {}) {
    try {
      const defaultParams = {
        api_key: this.apiKey,
        sortBy: 'score',
        sortOrder: 'desc',
        pageSize: 50
      };

      const response = await axios.get(`${this.baseURL}/foods/search`, {
        params: { ...defaultParams, ...params }
      });

      await this.delay(this.rateLimitDelay); // Rate limiting
      return response.data;

    } catch (error) {
      console.error('USDA Search API error:', error.message);
      if (error.response?.status === 429) {
        console.log('Rate limit exceeded, waiting longer...');
        await this.delay(60000); // Wait 1 minute on rate limit
        return this.searchFoods(params); // Retry
      }
      throw error;
    }
  }

  async getFoodDetails(fdcId) {
    try {
      const response = await axios.get(`${this.baseURL}/food/${fdcId}`, {
        params: { api_key: this.apiKey }
      });

      await this.delay(this.rateLimitDelay); // Rate limiting
      return response.data;

    } catch (error) {
      console.error(`USDA Food Details API error for ID ${fdcId}:`, error.message);
      if (error.response?.status === 429) {
        console.log('Rate limit exceeded, waiting longer...');
        await this.delay(60000); // Wait 1 minute on rate limit
        return this.getFoodDetails(fdcId); // Retry
      }
      throw error;
    }
  }

  /**
   * Get all foundation foods by performing paginated searches
   */
  async getAllFoundationFoods() {
    const allFoods = [];
    let pageNumber = 1;
    const pageSize = 50;

    console.log('📊 Starting to collect all foundation foods...');

    while (true) {
      const searchResult = await this.searchFoods({
        dataType: 'Foundation',
        pageNumber: pageNumber,
        pageSize: pageSize
      });

      if (!searchResult.foods || searchResult.foods.length === 0) {
        break;
      }

      const foundationFoods = searchResult.foods.filter(food => food.dataType === 'Foundation');
      allFoods.push(...foundationFoods);

      console.log(`📄 Page ${pageNumber}: Found ${foundationFoods.length} foundation foods`);

      if (searchResult.totalPages && pageNumber >= searchResult.totalPages) {
        break;
      }

      pageNumber++;

      // Additional delay between pages to be safe
      await this.delay(1000);
    }

    console.log(`✅ Total foundation foods found: ${allFoods.length}`);
    return allFoods;
  }
}

/**
 * Progress logger to CSV
 */
class ProgressLogger {
  constructor(filename = 'import_progress.csv') {
    this.writer = createObjectCsvWriter({
      path: filename,
      header: [
        { id: 'fdcId', title: 'FDC_ID' },
        { id: 'status', title: 'STATUS' },
        { id: 'description', title: 'DESCRIPTION' },
        { id: 'translated', title: 'TRANSLATED' },
        { id: 'error', title: 'ERROR' },
        { id: 'timestamp', title: 'TIMESTAMP' }
      ],
      append: true // Append to existing file
    });
  }

  async log(food) {
    await this.writer.writeRecords([{
      fdcId: food.fdcId,
      status: food.status || 'processing',
      description: food.description || '',
      translated: food.translated || '',
      error: food.error || '',
      timestamp: new Date().toISOString()
    }]);
  }
}

/**
 * Import nutrients from API response
 */
async function importNutrients() {
  console.log('📥 Importing nutrients...');

  const sampleResponse = await new USDAClient().getFoodDetails(167512); // Sample food to get nutrients
  if (sampleResponse?.foodNutrients) {
    for (const nutrient of sampleResponse.foodNutrients) {
      const nutrientData = nutrient.nutrient;
      if (!nutrientData) continue;

      const existing = await Nutrient.findOne({
        where: { fdcNutrientId: parseInt(nutrientData.id) }
      });

  if (!existing) {
    // Skip nutrients with invalid data
    if (!nutrientData.unitName || !nutrientData.name) {
      console.log(`Skipping nutrient ${nutrientData.id} - missing name or unitName`);
      return;
    }

    await Nutrient.create({
      fdcNutrientId: parseInt(nutrientData.id),
      name: nutrientData.name,
      unitName: nutrientData.unitName,
      nutrientNumber: nutrientData.number ? parseInt(nutrientData.number) : null,
      rank: null // Not available in new API format
    });
    console.log(`Added nutrient: ${nutrientData.name}`);
  }
    }
  }

  console.log('✅ Nutrients imported');
}

/**
 * Import food data with translations
 */
async function importFoodsWithTranslations(limit = null) {
  const client = new USDAClient();
  const translator = new TranslationService();
  const progressLogger = new ProgressLogger();

  console.log('🚀 Starting API-based food data import with translations...');

  // Get all foundation foods
  const allFoundationFoods = await client.getAllFoundationFoods();
  const foundationFoods = limit ? allFoundationFoods.slice(0, limit) : allFoundationFoods;

  console.log(`📊 Found ${allFoundationFoods.length} foundation foods total`);
  console.log(`📊 Will import ${foundationFoods.length} foundation foods${limit ? ` (limited to ${limit})` : ''}`);

  const batchSize = 10; // Process in small batches
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < foundationFoods.length; i += batchSize) {
    const batch = foundationFoods.slice(i, i + batchSize);
    console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(foundationFoods.length / batchSize)} (${batch.length} foods)`);

    // Process foods in parallel within batch, but translations sequentially
    for (const food of batch) {
      try {
        processed++;

        // Check if already exists
        const existing = await FoodData.findOne({ where: { fdcId: food.fdcId } });
        if (existing) {
          console.log(`⏭️  Skipping ${food.fdcId} - already exists`);
          continue;
        }

        console.log(`📥 Processing ${food.fdcId}: ${food.description}`);

        // Get detailed food data
        const foodDetails = await client.getFoodDetails(food.fdcId);

        // Prepare data
        const foodData = {
          fdcId: foodDetails.fdcId,
          dataType: foodDetails.dataType,
          description: foodDetails.description,
          descriptionEn: foodDetails.description, // English is the original
          foodCategoryId: foodDetails.foodCategoryId || null,
          publicationDate: foodDetails.publishedDate ? new Date(foodDetails.publishedDate) : new Date()
        };

        // Translate to Russian
        console.log(`🌐 Translating "${foodDetails.description}"`);
        foodData.descriptionRu = await translator.translateText(foodDetails.description, 'en', 'ru');
        foodData.descriptionLower = foodDetails.description.toLowerCase();

        console.log(`✅ Translated: "${foodData.descriptionRu}"`);

        // Save food data
        const foodRecord = await FoodData.create(foodData);
        console.log(`💾 Saved food: ${foodRecord.id} (${foodRecord.fdcId})`);

        // Import nutrients for this food
        await importNutrientsForFood(foodRecord.id, foodDetails);

        // Log progress
        await progressLogger.log({
          fdcId: food.fdcId,
          status: 'success',
          description: food.description,
          translated: foodData.descriptionRu
        });

        console.log(`📊 Progress: ${processed}/${foundationFoods.length} (${errors} errors)`);

      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${food.fdcId}:${food.description}:`, error.message);

        await progressLogger.log({
          fdcId: food.fdcId,
          status: 'error',
          description: food.description,
          error: error.message
        });
      }
    }

    // Longer pause between batches
    if (i + batchSize < foundationFoods.length) {
      console.log(`⏳ Pausing 60 seconds before next batch...`);
      await client.delay(60000); // 1 minute pause
    }
  }

  console.log('\n🎉 Import completed!');
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Success rate: ${((processed - errors) / processed * 100).toFixed(1)}%`);
}

/**
 * Import nutrients for a specific food
 */
async function importNutrientsForFood(foodDataId, foodDetails) {
  if (!foodDetails.foodNutrients) return;

  const nutrientsAdded = 0;
  for (const nutrient of foodDetails.foodNutrients) {
    try {
      const nutrientData = nutrient.nutrient;
      const nutrientRecord = await Nutrient.findOne({
        where: { fdcNutrientId: parseInt(nutrientData.id) }
      });

      if (nutrientRecord && nutrient.amount && parseFloat(nutrient.amount) > 0) {
        await FoodNutrient.create({
          foodDataId,
          nutrientId: nutrientRecord.id,
          amount: parseFloat(nutrient.amount),
          derivationId: null,
          min: nutrient.nutrient.min ? parseFloat(nutrient.nutrient.min) : null,
          max: nutrient.nutrient.max ? parseFloat(nutrient.nutrient.max) : null,
          units: nutrientData.unitName || 'G'
        });
      }
    } catch (error) {
      // Silently continue on nutrient errors
    }
  }

  if (nutrientsAdded > 0) {
    console.log(`   Added ${nutrientsAdded} nutrients for food ${foodDataId}`);
  }
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args.includes('--limit') ?
      parseInt(args[args.indexOf('--limit') + 1]) :
      args.includes('--test') ? 3 :
      null;

    console.log('🚀 Starting food data import via USDA API...');
    if (limit) {
      console.log(`📊 Limited to ${limit} foods (use --test for 3 foods, --limit <number> for custom limit)`);
    }

    await sequelize.authenticate();
    console.log('✅ Database connected');

    if (!limit) {
      console.log('🧹 Clearing existing data...');
      await FoodNutrient.destroy({ where: {} });
      await FoodData.destroy({ where: {} });
      await Nutrient.destroy({ where: {} });
    }

    await sequelize.sync();
    console.log('✅ Tables synchronized');

    await importNutrients();
    await importFoodsWithTranslations(limit);

    console.log('🎉 API import completed successfully!');

  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { USDAClient, TranslationService, importFoodsWithTranslations };
