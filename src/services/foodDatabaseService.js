const axios = require('axios');
const config = require('../config');

/**
 * Food Database Service using USDA FoodData Central API
 * https://api.nal.usda.gov/fdc/v1/
 */
class FoodDatabaseService {
  constructor() {
    this.baseURL = 'https://api.nal.usda.gov/fdc/v1';
    // Use DEMO_KEY for development, switch to real key for production
    this.apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  }

  /**
   * Search for foods using USDA API
   * @param {string} query - Search query in Russian/English
   * @param {number} limit - Max results (1-50)
   * @returns {Array} - Array of matching foods with basic info
   */
  async searchFoods(query, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/foods/search`, {
        params: {
          api_key: this.apiKey,
          query: query,
          pageSize: Math.min(limit, 50),
          sortBy: 'score',
          sortOrder: 'desc'
        }
      });

      if (!response.data?.foods) return [];

      return response.data.foods.map(food => ({
        fdcId: food.fdcId,
        name: food.description,
        dataType: food.dataType,
        category: food.foodCategory || 'Unknown'
      }));

    } catch (error) {
      console.error('USDA Search API error:', error.message);
      return [];
    }
  }

  /**
   * Get detailed nutrition data for a specific food by FDC ID
   * @param {number} fdcId - USDA Food Data Central ID
   * @returns {Object} - Complete nutritional profile per 100g
   */
  async getNutritionById(fdcId) {
    try {
      const response = await axios.get(`${this.baseURL}/food/${fdcId}`, {
        params: {
          api_key: this.apiKey
        }
      });

      const food = response.data;
      if (!food) return null;

      const nutrition = {
        foodInfo: {
          name: food.description,
          fdcId: food.fdcId,
          dataType: food.dataType,
          source: 'USDA FoodData Central API'
        },
        per100g: {}
      };

      // Map nutrients to our standard format by nutrientNumber (more reliable than names)
      const nutrientNumberMapping = {
        203: 'protein',   // Protein
        204: 'fat',       // Total fat
        205: 'carbs',     // Carbohydrates by difference
        957: 'calories'   // Energy (Atwater General Factors) in KCAL
      };

      // Also map by name as fallback
      const nutrientNameMapping = {
        'Energy (Atwater General Factors)': 'calories',
        'Protein': 'protein',
        'Total lipid (fat)': 'fat',
        'Carbohydrate, by difference': 'carbs'
      };

      // Process food nutrients (API structure: item.nutrient.name, .number, .unitName and item.amount)
      if (food.foodNutrients && Array.isArray(food.foodNutrients)) {
        food.foodNutrients.forEach(item => {
          const nutrientData = item.nutrient; // nested nutrient object
          const nutrientName = nutrientData?.name;
          const amount = parseFloat(item.amount) || 0;
          const unit = nutrientData?.unitName || 'G';
          const nutrientNumber = nutrientData?.number;

          // Try to match by nutrient number first, then by name
          let key = nutrientNumberMapping[parseInt(nutrientNumber)]; // Convert to int

          if (!key) {
            // Fallback to name matching
            for (const [mapKey, mapValue] of Object.entries(nutrientNameMapping)) {
              if (!nutrientName) continue; // Skip if no name
              if (nutrientName === mapKey || nutrientName.includes(mapKey)) {
                key = mapValue;
                break;
              }
            }
          }

          // Special handling for energy/calories (numbers 208 or 957)
          if (nutrientNumber === '208' || nutrientNumber === '957' || (nutrientName && nutrientName.includes('Energy')) || unit.toUpperCase() === 'KCAL') {
            key = 'calories';
          }

          if (key && amount > 0) { // Only save if amount > 0
            nutrition.per100g[key] = {
              amount: amount,
              unit: unit,
              nutrientName: nutrientName,
              nutrientNumber: nutrientNumber
            };
          }
        });
      }

      // Ensure we have all required nutrients (even if zero)
      ['calories', 'protein', 'fat', 'carbs'].forEach(key => {
        if (!nutrition.per100g[key]) {
          nutrition.per100g[key] = {
            amount: 0,
            unit: key === 'calories' ? 'KCAL' : 'G',
            nutrientName: key
          };
        }
      });

      return nutrition;

    } catch (error) {
      console.error(`USDA Food Details API error for ID ${fdcId}:`, error.message);
      return null;
    }
  }

  /**
   * Search and get nutrition data in one call
   * @param {string} query - Food name to search (Russian/English)
   * @returns {Object|null} - Best match nutrition or null
   */
  async getNutritionForFood(query) {
    try {
      // Try search as-is first
      console.log(`USDA: Searching for "${query}"`);
      const results = await this.searchFoods(query, 3);

      // If no results and query looks Russian, try to translate common foods
      if (results.length === 0 && this.isRussian(query)) {
        console.log(`USDA: No results, trying English translation...`);
        const englishQuery = this.translateRussianFood(query);
        if (englishQuery !== query) {
          console.log(`USDA: Searching English version: "${englishQuery}"`);
          const englishResults = await this.searchFoods(englishQuery, 3);
          if (englishResults.length > 0) {
            results.push(...englishResults.slice(0, 2)); // Add top 2 English results
          }
        }
      }

      if (results.length === 0) {
        console.log(`USDA: No foods found for "${query}"`);
        return null;
      }

      console.log(`USDA: Trying ${results.length} results for "${query}"`);

      // Try results in order
      for (const result of results) {
        console.log(`USDA: Trying "${result.name}" (ID: ${result.fdcId})`);
        const nutrition = await this.getNutritionById(result.fdcId);

        if (nutrition && nutrition.per100g.calories.amount > 0) {
          console.log(`USDA: ✅ Got nutrition for "${result.name}"`);
          return nutrition;
        }
      }

      console.log('USDA: ❌ No foods with valid calories found');
      return null;

    } catch (error) {
      // Handle rate limiting gracefully
      if (error.response?.status === 429) {
        console.log('USDA: Rate limit exceeded, falling back to AI');
        return null;
      }
      console.error('USDA nutrition search error:', error.message);
      return null;
    }
  }

  /**
   * Check if query contains Russian words
   * @param {string} query - Search query
   * @returns {boolean} - True if likely Russian
   */
  isRussian(query) {
    // Common Russian food words with Cyrillic characters
    const russianWords = ['яблоко', 'картофель', 'курица', 'банан', 'яйцо', 'хлеб', 'молоко', 'сыр', 'мясо', 'рыба', 'салат', 'огурец', 'помидор', 'лук'];
    const lower = query.toLowerCase();
    return russianWords.some(word => lower.includes(word)) ||
           lower.match(/[а-яё]/i); // Any Cyrillic characters
  }

  /**
   * Translate common Russian food names to English
   * @param {string} query - Russian food name
   * @returns {string} - English equivalent
   */
  translateRussianFood(query) {
    const translations = {
      'яблоко': 'apple',
      'яблоки': 'apples',
      'банан': 'banana',
      'бананы': 'bananas',
      'картофель': 'potato',
      'картошка': 'potato',
      'курица': 'chicken',
      'хлеб': 'bread',
      'молоко': 'milk',
      'сыр': 'cheese',
      'яйцо': 'egg',
      'яйца': 'eggs',
      'куриные яйца': 'chicken eggs',
      'мясо': 'meat',
      'рыба': 'fish',
      'салат': 'salad',
      'огурец': 'cucumber',
      'огурцы': 'cucumbers',
      'помидор': 'tomato',
      'помидоры': 'tomatoes',
      'лук': 'onion',
      'морковь': 'carrot',
      'моркови': 'carrots'
    };

    let result = query.toLowerCase();
    let replaced = false;

    // Replace Russian words with English
    for (const [ru, en] of Object.entries(translations)) {
      if (result.includes(ru)) {
        result = result.replace(new RegExp(ru, 'g'), en);
        replaced = true;
      }
    }

    // Remove common Russian prefixes/suffixes
    result = result.replace(/\s+г$/, ''); // Remove trailing grams
    result = result.replace(/\s+мл$/, '');
    result = result.replace(/\s+шт$/, '');

    return replaced ? result : query; // Return original if no translation found
  }

  /**
   * Format USDA API data to our standard AI response format
   * @param {Object} usdaData - USDA nutrition data from API
   * @param {number} weight - Target weight in grams
   * @returns {Object} - Formatted response like AI would return
   */
  formatUSDAData(usdaData, weight = 100) {
    if (!usdaData || !usdaData.per100g) return null;

    const factor = weight / 100;

    return {
      success: true,
      analysis: {
        description: `${usdaData.foodInfo.name} ${weight}г`,
        total: {
          calories: Math.round(usdaData.per100g.calories.amount * factor),
          protein: Math.round((usdaData.per100g.protein.amount * factor) * 10) / 10,
          fat: Math.round((usdaData.per100g.fat.amount * factor) * 10) / 10,
          carbs: Math.round((usdaData.per100g.carbs.amount * factor) * 10) / 10
        }
      },
      source: `USDA FoodData Central API (${usdaData.foodInfo.fdcId})`
    };
  }

  /**
   * Check if a food has nutritional data via API
   * @param {string} query - Food name
   * @returns {boolean} - True if found with calories > 0
   */
  async hasNutritionData(query) {
    const results = await this.searchFoods(query, 1);
    return results.length > 0;
  }
}

module.exports = new FoodDatabaseService();
