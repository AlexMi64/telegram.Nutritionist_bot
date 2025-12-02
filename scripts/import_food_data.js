#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Sequelize } = require('sequelize');
const translate = require('@vitalets/google-translate-api');
const config = require('../config/config.json');

// Initialize sequelize
const sequelize = new Sequelize(config.development);

const { FoodData: FoodDataModel, FoodNutrient: FoodNutrientModel, Nutrient: NutrientModel } = require('../src/database/models/index');

const FoodData = FoodDataModel(sequelize, Sequelize);
const FoodNutrient = FoodNutrientModel(sequelize, Sequelize);
const Nutrient = NutrientModel(sequelize, Sequelize);

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
      console.log(`🌐 Translating: "${text}" (${from} -> ${to})`);

      // Try Google Translate first
      const result = await translate(text, { from, to });
      const translated = result.text;

      console.log(`✅ "${text}" -> "${translated}"`);

      // Cache the result
      this.translatedCache.set(cacheKey, translated);

      // Respectful delay to avoid rate limits
      await this.delay(100);

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

// Helper function to parse CSV
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function importNutrients() {
  console.log('📥 Importing nutrients...');
  const nutrientsData = await parseCSV('FoodData_Central_foundation_food_csv_2025-04-24 3/nutrient.csv');

  let imported = 0;
  for (const nutrient of nutrientsData) {
    const nutrientNumber = nutrient.nutrient_nbr && nutrient.nutrient_nbr.trim() ? parseInt(nutrient.nutrient_nbr) : null;

    let existing;
    if (nutrientNumber !== null) {
      existing = await Nutrient.findOne({
        where: { nutrientNumber: nutrientNumber }
      });
    } else {
      // If no nutrientNumber, check by fdcNutrientId
      existing = await Nutrient.findOne({
        where: { fdcNutrientId: parseInt(nutrient.id) }
      });
    }

    if (!existing) {
      await Nutrient.create({
        fdcNutrientId: parseInt(nutrient.id),
        name: nutrient.name,
        unitName: nutrient.unit_name,
        nutrientNumber: nutrientNumber,
        rank: nutrient.rank && nutrient.rank.trim() ? parseFloat(nutrient.rank) : null
      });
      imported++;
    }
  }

  console.log(`✅ Imported ${imported} nutrients`);
  return imported;
}

async function importFoundationFoods(translator) {
  console.log('📥 Importing foundation foods (batch processing to save memory)...');

  let imported = 0;
  let processed = 0;

  // Use streaming CSV parser to avoid loading all data into memory
  const fs = require('fs');
  const csv = require('csv-parser');

  return new Promise((resolve, reject) => {
    fs.createReadStream('FoodData_Central_foundation_food_csv_2025-04-24 3/food.csv')
      .pipe(csv())
      .on('data', async (food) => {
        processed++;

        // Skip non-foundation foods
        if (food.data_type !== 'foundation_food') return;

        // TEMP: Limit to first 100 foundation foods for testing
        if (imported >= 100) return;

        try {
          // Translate description to Russian
          const englishName = food.description;
          const russianName = await translator.translateText(englishName, 'en', 'ru');

          const foodRecord = await FoodData.create({
            fdcId: parseInt(food.fdc_id),
            dataType: food.data_type,
            description: englishName, // Original for compatibility
            descriptionEn: englishName, // English name
            descriptionRu: russianName, // Russian translation
            descriptionLower: englishName.toLowerCase(),
            foodCategoryId: food.food_category_id && food.food_category_id.trim() ?
              parseInt(food.food_category_id) : null,
            publicationDate: new Date(food.published_date)
          });

          // Import nutrients for this food (also streaming)
          await importNutrientsForFood(foodRecord.id, food.fdc_id);

          imported++;
          if (imported % 50 === 0) {
            console.log(`Imported ${imported} foods so far...`);
          }
        } catch (error) {
          console.error(`Error importing food ${food.fdc_id}:`, error.message);
        }
      })
      .on('end', () => {
        console.log(`✅ Imported ${imported} foundation foods with nutrients (total processed: ${processed})`);
        resolve();
      })
      .on('error', reject);
  });
}

async function importNutrientsForFood(foodDataId, fdcId) {
  // Stream through food_nutrient.csv and only process records for this fdcId
  const fs = require('fs');
  const csv = require('csv-parser');

  return new Promise((resolve, reject) => {
    let nutrientsAdded = 0;

    fs.createReadStream('FoodData_Central_foundation_food_csv_2025-04-24 3/food_nutrient.csv')
      .pipe(csv())
      .on('data', async (nutrient) => {
        // Only process nutrients for this specific food
        if (parseInt(nutrient.fdc_id) !== fdcId) return;

        try {
          const nutrientRecord = await Nutrient.findOne({
            where: { fdcNutrientId: parseInt(nutrient.nutrient_id) }
          });

          if (nutrientRecord && nutrient.amount && parseFloat(nutrient.amount) > 0) {
            await FoodNutrient.create({
              foodDataId,
              nutrientId: nutrientRecord.id,
              amount: parseFloat(nutrient.amount),
              derivationId: nutrient.derivation_id && nutrient.derivation_id.trim() ?
                parseInt(nutrient.derivation_id) : null,
              min: nutrient.min && nutrient.min.trim() ? parseFloat(nutrient.min) : null,
              max: nutrient.max && nutrient.max.trim() ? parseFloat(nutrient.max) : null,
              units: nutrient.unit_name || 'G'
            });
            nutrientsAdded++;
          }
        } catch (error) {
          console.error(`Error importing nutrient for food ${fdcId}:`, error.message);
        }
      })
      .on('end', () => {
        if (nutrientsAdded > 0) {
          console.log(`Added ${nutrientsAdded} nutrients for food ${fdcId}`);
        }
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  try {
    console.log('🚀 Starting food data import...');

    const translator = new TranslationService();

    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync();
    console.log('✅ Tables synchronized');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await FoodNutrient.destroy({ where: {} });
    await FoodData.destroy({ where: {} });
    await Nutrient.destroy({ where: {} });

    await importNutrients();
    await importFoundationFoods(translator);

    console.log('🎉 Import completed successfully!');
  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    await sequelize.close();
  }
}

main();
