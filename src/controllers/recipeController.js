const { Recipe, UserRecipe } = require('../database/models');
const db = require('../database/models');
const Meal = db.Meal;
const { OPENAI_API_KEY } = require('../config');
const { t } = require('../config/lang');

// Получить список рецептов для пользователя
async function getUserRecipes(userId) {
  try {
    const favorites = await UserRecipe.findAll({
      where: { user_id: userId, is_favorite: true },
      include: [{
        model: Recipe,
        as: 'recipe',
        attributes: ['id', 'title', 'cooking_time', 'difficulty_level', 'nutrition_per_serving', 'tags']
      }],
      order: [['createdAt', 'DESC']]
    });

    return favorites.map(ur => ur.recipe).filter(Boolean);
  } catch (error) {
    console.error('Ошибка получения рецептов пользователя:', error);
    return [];
  }
}

// Получить популярные рецепты
async function getPopularRecipes(limit = 10) {
  try {
    const recipes = await Recipe.findAll({
      where: { is_popular: true },
      order: [['createdAt', 'DESC']],
      limit: limit
    });
    return recipes;
  } catch (error) {
    console.error('Ошибка получения популярных рецептов:', error);
    return [];
  }
}

// Сохранить/обновить рецепт
async function saveRecipe(recipeData) {
  try {
    const recipe = await Recipe.create(recipeData);
    console.log(`🍳 Сохранен рецепт: "${recipe.title}"`);
    return recipe;
  } catch (error) {
    console.error('Ошибка сохранения рецепта:', error);
    throw error;
  }
}

// Добавить рецепт в избранное
async function addToFavorites(userId, recipeId) {
  try {
    const existing = await UserRecipe.findOne({
      where: { user_id: userId, recipe_id: recipeId }
    });

    if (existing) {
      await existing.update({ is_favorite: true, rating: existing.rating || null });
    } else {
      await UserRecipe.create({
        user_id: userId,
        recipe_id: recipeId,
        is_favorite: true
      });
    }

    console.log(`⭐ Рецепт ${recipeId} добавлен в избранное пользователем ${userId}`);
    return true;
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    return false;
  }
}

// Убрать из избранного
async function removeFromFavorites(userId, recipeId) {
  try {
    const result = await UserRecipe.update(
      { is_favorite: false },
      { where: { user_id: userId, recipe_id: recipeId } }
    );

    if (result[0] > 0) {
      console.log(`⭐ Рецепт ${recipeId} удален из избранного пользователем ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    return false;
  }
}

// Проверить, в избранном ли рецепт
async function isFavorite(userId, recipeId) {
  try {
    const userRecipe = await UserRecipe.findOne({
      where: { user_id: userId, recipe_id: recipeId, is_favorite: true }
    });
    return !!userRecipe;
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
    return false;
  }
}

// Получить рецепт по ID
async function getRecipeById(recipeId) {
  try {
    const recipe = await Recipe.findByPk(recipeId);
    return recipe;
  } catch (error) {
    console.error('Ошибка получения рецепта:', error);
    return null;
  }
}

// Генерировать рецепты из ингредиентов пользователя
async function generateRecipeFromUserFoods(userId, targetCalories = null) {
  try {
    // Получить продукты пользователя из последних приемов пищи
    const recentMeals = await Meal.findAll({
      where: { userId },
      order: [['date', 'DESC']],
      limit: 50
    });

    if (recentMeals.length === 0) {
      return { error: 'Недостаточно данных о приемах пищи. Добавьте несколько приемов пищи, чтобы получить рецепты.' };
    }

    // Извлечь уникальные продукты из описаний
    const userIngredients = [];
    const productsSet = new Set();

    recentMeals.forEach(meal => {
      if (meal.description) {
        // Простой парсинг продуктов из описания
        const words = meal.description.toLowerCase().split(/[,.\s]+/);
        words.forEach(word => {
          const cleanWord = word.trim();
          if (cleanWord.length > 2 && !['грамм', 'г', 'ккал', 'приема', 'прием'].includes(cleanWord)) {
            productsSet.add(cleanWord);
          }
        });
      }
    });

    const ingredients = Array.from(productsSet);
    if (ingredients.length < 3) {
      return { error: 'Мало продуктов в рационе. Добавьте больше разнообразных приемов пищи.' };
    }

    console.log(`🍳 Генерация рецепта для пользователя ${userId} из ингредиентов:`, ingredients);

    // Генерируем рецепт
    const { generateRecipeFromIngredients } = require('../services/openaiService');
    const result = await generateRecipeFromIngredients(ingredients, null, targetCalories);

    if (result.success) {
      // Сохраняем рецепт в БД
      const recipeData = {
        title: result.recipe.title,
        description: result.recipe.description,
        ingredients: result.recipe.ingredients,
        instructions: result.recipe.instructions,
        nutrition_per_serving: result.recipe.nutrition_per_serving,
        difficulty_level: result.recipe.difficulty,
        cooking_time: result.recipe.cooking_time,
        servings: result.recipe.servings,
        tags: result.recipe.tags,
        user_id: null // Глобальный рецепт
      };

      const savedRecipe = await saveRecipe(recipeData);
      return {
        ...result,
        db_recipe: savedRecipe
      };
    }

    return result;

  } catch (error) {
    console.error('Ошибка генерации рецепта из продуктов пользователя:', error);
    return { error: 'Не удалось сгенерировать рецепт. Попробуйте позже.' };
  }
}

// Генерировать рецепт с новым продуктом
async function generateRecipeWithNewIngredient(userProfile) {
  try {
    console.log(`🆕 Генерация рецепта с новым ингредиентом для пользователя`);

    const { generateRecipeWithNewIngredient } = require('../services/openaiService');
    const result = await generateRecipeWithNewIngredient(userProfile);

    if (result.success) {
      // Сохраняем рецепт в БД
      const recipeData = {
        title: result.recipe.title,
        description: result.recipe.description,
        ingredients: result.recipe.ingredients,
        instructions: result.recipe.instructions,
        nutrition_per_serving: result.recipe.nutrition_per_serving,
        difficulty_level: result.recipe.difficulty,
        cooking_time: result.recipe.cooking_time,
        servings: result.recipe.servings,
        tags: result.recipe.tags,
        user_id: null // Глобальный рецепт
      };

      const savedRecipe = await saveRecipe(recipeData);
      return {
        ...result,
        db_recipe: savedRecipe,
        new_ingredient: result.recipe.new_ingredient
      };
    }

    return result;

  } catch (error) {
    console.error('Ошибка генерации рецепта с новым ингредиентом:', error);
    return { error: 'Не удалось сгенерировать рецепт с новым продуктом. Попробуйте позже.' };
  }
}

// Генерировать сбалансированный рецепт на заданное количество калорий
async function generateBalancedRecipeForCalories(targetCalories = null) {
  try {
    console.log(`📊 Генерация сбалансированного рецепта на ${targetCalories} калорий`);

    const { generateBalancedRecipeForCalories: generateBalancedRecipe } = require('../services/openaiService');
    const result = await generateBalancedRecipe(targetCalories);

    if (result.success) {
      // Сохраняем рецепт в БД
      const recipeData = {
        title: result.recipe.title,
        description: result.recipe.description,
        ingredients: result.recipe.ingredients,
        instructions: result.recipe.instructions,
        nutrition_per_serving: result.recipe.nutrition_per_serving,
        difficulty_level: result.recipe.difficulty,
        cooking_time: result.recipe.cooking_time,
        servings: result.recipe.servings,
        tags: result.recipe.tags || ['сбалансированное питание', 'здоровое питание'],
        user_id: null // Глобальный рецепт
      };

      const savedRecipe = await saveRecipe(recipeData);
      return {
        ...result,
        db_recipe: savedRecipe
      };
    }

    return result;

  } catch (error) {
    console.error('Ошибка генерации сбалансированного рецепта:', error);
    return { error: 'Не удалось сгенерировать сбалансированный рецепт. Попробуйте позже.' };
  }
}

module.exports = {
  getUserRecipes,
  getPopularRecipes,
  saveRecipe,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getRecipeById,
  generateRecipeFromUserFoods,
  generateRecipeWithNewIngredient,
  generateBalancedRecipeForCalories
};
