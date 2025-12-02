const { FoodData, FoodNutrient, Nutrient } = require('../database/models');
const { Sequelize, Op } = require('sequelize');
const config = require('../config');

/**
 * Local Food Search Service - searches food data in SQLite database
 */
class LocalFoodSearchService {
  constructor() {
    // Models are already initialized in database/models/index.js
    this.FoodData = FoodData;
    this.FoodNutrient = FoodNutrient;
    this.Nutrient = Nutrient;
  }

  /**
   * Search for foods by query string across all description fields
   * @param {string} query - Search query in any language
   * @param {number} limit - Max results (default 10)
   * @returns {Array} - Array of found foods
   */
  async searchFoods(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchTerm = query.trim().toLowerCase();
      console.log(`🔍 Local search: "${query}"`);

      // Split search query into individual words for better matching
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 1);
      console.log(`🔍 Searching with words: [${searchWords.join(', ')}]`);

      // Build WHERE condition that requires ALL words to be present (order insensitive)
      let whereConditions = [];

      // Create conditions for descriptionLower field (most reliable)
      if (this.FoodData.rawAttributes.descriptionLower) {
        const wordConditions = searchWords.map(word => ({
          descriptionLower: {
            [Op.like]: `%${word}%`
          }
        }));

        whereConditions.push({
          [Op.and]: wordConditions
        });
      }

      // Also check other description fields if available
      if (this.FoodData.rawAttributes.descriptionRu) {
        const wordConditionsRu = searchWords.map(word => ({
          descriptionRu: {
            [Op.like]: `%${word}%`
          }
        }));

        whereConditions.push({
          [Op.and]: wordConditionsRu
        });
      }

      if (this.FoodData.rawAttributes.descriptionEn) {
        const wordConditionsEn = searchWords.map(word => ({
          descriptionEn: {
            [Op.like]: `%${word}%`
          }
        }));

        whereConditions.push({
          [Op.and]: wordConditionsEn
        });
      }

      // Fallback: simple contains search for description
      whereConditions.push({
        description: {
          [Op.like]: `%${searchTerm}%`
        }
      });

      // Execute search
      const foods = await this.FoodData.findAll({
        where: {
          [Op.or]: whereConditions
        },
        limit: limit,
        order: [['description', 'ASC']]
      });

      console.log(`📊 Found ${foods.length} local foods matching "${query}"`);
      console.log(`Query words: [${searchWords.join(', ')}]`);

      return foods.map(food => ({
        id: food.id,
        fdcId: food.fdcId,
        name: food.description,
        nameEn: food.descriptionEn,
        nameRu: food.descriptionRu,
        category: food.foodCategoryId,
        source: 'Local Database'
      }));

    } catch (error) {
      console.error('Local food search error:', error);
      return [];
    }
  }

  /**
   * Get nutrition data for a specific food by database ID
   * @param {number} foodId - Local food database ID
   * @returns {Object|null} - Nutrition data or null
   */
  async getNutritionById(foodId) {
    try {
      const food = await this.FoodData.findByPk(foodId);
      if (!food) return null;

      // Get all nutrients for this food
      const nutrients = await this.FoodNutrient.findAll({
        where: { foodDataId: foodId },
        include: [{
          model: this.Nutrient,
          as: 'nutrient',
          attributes: ['name', 'unitName', 'nutrientNumber']
        }]
      });

      if (nutrients.length === 0) {
        return null;
      }

      // Build nutrition profile
      const nutrition = {
        foodInfo: {
          name: food.description,
          nameEn: food.descriptionEn,
          nameRu: food.descriptionRu,
          foodId: food.id,
          fdcId: food.fdcId,
          source: 'Local Database'
        },
        per100g: {}
      };

      // Map nutrients to standard format
      nutrients.forEach(foodNutrient => {
        const nutrientData = foodNutrient.nutrient;
        if (!nutrientData) return;

        const nutrientNumber = nutrientData.nutrientNumber;
        const amount = parseFloat(foodNutrient.amount) || 0;

        if (amount <= 0) return;

        let key;
        switch (nutrientNumber) {
          case 203: key = 'protein'; break;
          case 204: key = 'fat'; break;
          case 205: key = 'carbs'; break;
          case 208: key = 'calories'; break;
          case 957: key = 'calories'; break; // Atwater calories
          default: return; // Skip unknown nutrients
        }

        nutrition.per100g[key] = {
          amount: amount,
          unit: nutrientData.unitName || 'G',
          nutrientName: nutrientData.name,
          nutrientNumber: nutrientNumber
        };
      });

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
      console.error(`Local nutrition lookup error for ID ${foodId}:`, error);
      return null;
    }
  }

  /**
   * Search and get nutrition data in one call
   * @param {string} query - Food name to search
   * @returns {Object|null} - Best match nutrition or null
   */
  async searchAndGetNutrition(query) {
    try {
      const results = await this.searchFoods(query, 5);

      if (results.length === 0) {
        return null;
      }

      console.log(`🔍 Trying ${results.length} local foods for "${query}"`);

      // Try results in order
      for (const result of results) {
        console.log(`🔍 Trying local: "${result.name}" (ID: ${result.id})`);
        const nutrition = await this.getNutritionById(result.id);

        if (nutrition && nutrition.per100g.calories && nutrition.per100g.calories.amount > 0) {
          console.log(`✅ Local nutrition found for "${result.name}"`);
          return nutrition;
        }
      }

      console.log('❌ No local foods with valid nutrition found');
      return null;

    } catch (error) {
      console.error('Local nutrition search error:', error);
      return null;
    }
  }

  /**
   * Check if query might find results in local database
   * @param {string} query - Food name query
   * @returns {boolean} - True if likely to find results
   */
  async hasPotentialMatches(query) {
    const results = await this.searchFoods(query, 1);
    return results.length > 0;
  }
}

module.exports = new LocalFoodSearchService();
