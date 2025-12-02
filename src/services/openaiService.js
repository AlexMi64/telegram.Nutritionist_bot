const OpenAI = require('openai');
const config = require('../config');
const foodDatabaseService = require('./foodDatabaseService');
config.OPENAI_MODEL = 'anthropic/claude-3-5-sonnet';
config.OPENAI_VISION_MODEL = 'openai/gpt-4o';

// Initialize OpenAI with OpenRouter
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
});

/**
 * Analyze food text description and extract nutritional info
 * @param {string} text - Food description
 * @returns {Promise<Object>} - Nutritional analysis
 */
async function analyzeFoodText(text) {
  try {
    // Parse product and weight from input
    const match = text.match(/^(.+?)\s+(\d+)\s*$/);
    let product = text;
    let weight = 100; // default

    if (match) {
      product = match[1].trim();
      weight = parseInt(match[2]);
    }

    // Log the analysis request
    console.log('\n=== FOOD ANALYSIS REQUEST ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`User Input: "${text}"`);
    console.log(`Parsed Product: "${product}"`);
    console.log(`Parsed Weight: ${weight}g`);

    // First, try to find the food in our local USDA database
    console.log('🔍 Checking local USDA database...');
    const usdaNutrition = await foodDatabaseService.getNutritionForFood(product);

    if (usdaNutrition && usdaNutrition.per100g.calories.amount > 0) {
      console.log('✅ Found in USDA database! Formatting response...');
      const formattedResult = foodDatabaseService.formatUSDAData(usdaNutrition, weight);

      if (formattedResult) {
        console.log(`USDA Result: ${JSON.stringify(formattedResult, null, 2)}`);
        console.log('=====================================\n');
        return formattedResult;
      }
    } else {
      console.log('❌ Not found in USDA database, falling back to AI analysis...');
    }

    // Fallback to AI analysis
    console.log(`🤖 Using AI: ${config.OPENAI_MODEL}`);

    const prompt = `Привет, ты нутрициолог. Рассчитай КБЖУ продукта/блюда "${product}" ${weight}г используя интернет для актуальных данных. Напиши полное КБЖУ в формате JSON.

Формат ответа (ТОЛЬКО JSON):
{
  "success": true,
  "analysis": {
    "description": "Название продукта с весом (на русском)",
    "total": {
      "calories": integer,
      "protein": integer,
      "fat": integer,
      "carbs": integer
    }
  }
}`;

    console.log(`AI Prompt: ${prompt}`);

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
      {
        role: 'system',
        content: 'Ты нутриционист. Автоматически исправляй распространённые ошибки распознавания речи перед анализом: "шаренная" исправь на "жареная", "шареная" на "жареная", "шарений" на "жареный", "шары" на "жары", "шэк" на "шеф", "чиз" на "чиз", "солянка" на "солянка", "фарри" на "фри", "чикены" на "курица", "картоско" на "картофель". Используй свежую информацию из интернета. Ищи актуальные данные питания на USDA.gov или аналогичных ресурсах. Верни СТРОГО только JSON без лишнего текста. Ищи точные питательные ценности и рассчитывай для указанного веса.'
      },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    let content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'Нет ответа от AI' };
    }

    // Clean markdown formatting from response
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    // Parse JSON response
    try {
      const result = JSON.parse(content);

      // Log the analysis response
      console.log('\n=== AI ANALYSIS RESPONSE ===');
      console.log(`Raw AI Response: ${content}`);
      console.log(`Parsed Result: ${JSON.stringify(result, null, 2)}`);
      console.log('=====================================\n');

      return result;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, content);
      // Try to extract error message if AI returned text instead of JSON
      if (content.includes('сожалению') || content.includes('извинения') ||
          content.includes('не удалось') || content.includes('Не удалось') ||
          content.includes('не могу') || content.includes('Не могу') ||
          content.includes('не разбер') || content.includes('Не разбер') ||
          content.includes('неверный') || content.includes('Неверный') ||
          content.includes('формат') || content.includes('ввода')) {
        return {
          success: false,
          error: 'AI не смог проанализировать продукт. Попробуйте описать подробнее.'
        };
      }
      // If it contains food-related words, treat as user-friendly error
      if (content.length < 200 && (content.includes('food') || content.includes('no ') ||
          content.includes('cannot'))) {
        return {
          success: false,
          error: `AI ошибка анализа: ${content}`,
        };
      }
      return {
        success: false,
        error: 'Не удалось обработать ответ AI. Повторите запрос.',
        rawResponse: content
      };
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: `Ошибка API: ${error.message}`
    };
  }
}

/**
 * Analyze food photo using vision model
 * @param {string} imageUrl - Image URL or base64
 * @param {string} caption - Optional caption
 * @returns {Promise<Object>} - Nutritional analysis
 */
async function analyzeFoodImage(imageUrl, caption = '') {
  try {
    console.log('\n=== VISION ANALYSIS REQUEST ===');
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Caption: ${caption}`);

    const prompt = `Ты эксперт-нутрициолог. Проанализируй фото и ВСЕГДА рассчитай КБЖУ ТОЛЬКО на 100 грамм продукта, независимо от того, сколько продукта на фото.

СТРОГИЕ ПРАВИЛА:
1. ВСЕГДА рассчитывай на 100г, даже если на фото видно 300г или другой вес
2. Не используй вес с фото для расчета - игнорируй видимый объем
3. Используй только справочные данные питания на 100г
4. Опиши что видишь, но рассчитай КБЖУ только на 100г

Что на фото? Опиши продукты и рассчитай их nutrition на 100г:

Ответь ТОЛЬКО в формате JSON:
{
  "success": true,
  "analysis": {
    "description": "Описание продуктов на фото (игнорируя вес)",
    "products_per_100g": [
      {
        "name": "курица",
        "nutrition_per_100g": {
          "calories": 165,
          "protein": 31,
          "fat": 3.6,
          "carbs": 0
        }
      }
    ],
    "total_per_100g": {
      "calories": 200,
      "protein": 25,
      "fat": 8,
      "carbs": 15
    }
  }
}`;

    // Correct format for GPT-4 Vision
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt + (caption ? `\n\nДополнительная информация: ${caption}` : '')
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high' // For better accuracy
            }
          }
        ]
      }
    ];

    const response = await openai.chat.completions.create({
      model: config.OPENAI_VISION_MODEL,
      messages: messages,
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'Нет ответа от Vision AI' };
    }

    // Clean response
    let cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    console.log('\n=== VISION ANALYSIS RESPONSE ===');
    console.log(`Raw AI Response: ${content}`);
    console.log(`Cleaned: ${cleanContent}`);

    // Parse JSON response
    try {
      const result = JSON.parse(cleanContent);

      // Log successful parse
      console.log('Parsed Vision Result:', JSON.stringify(result, null, 2));
      console.log('=====================================\n');

      // Convert to the expected format by foodAnalysisController
      if (result.success && result.analysis) {
        // Transform the vision format to match text analysis format
        return {
          success: true,
          analysis: {
            description: result.analysis.description || 'Продукты с фото',
            total: result.analysis.total || {
              calories: result.analysis.products?.reduce((sum, p) =>
                sum + (p.nutrition_per_100g?.calories * p.weight_grams / 100 || 0), 0) || 0,
              protein: result.analysis.products?.reduce((sum, p) =>
                sum + (p.nutrition_per_100g?.protein * p.weight_grams / 100 || 0), 0) || 0,
              fat: result.analysis.products?.reduce((sum, p) =>
                sum + (p.nutrition_per_100g?.fat * p.weight_grams / 100 || 0), 0) || 0,
              carbs: result.analysis.products?.reduce((sum, p) =>
                sum + (p.nutrition_per_100g?.carbs * p.weight_grams / 100 || 0), 0) || 0,
            }
          }
        };
      } else {
        throw new Error('Некорректный формат ответа от Vision AI');
      }

    } catch (parseError) {
      console.error('JSON parse error in vision analysis:', parseError, cleanContent);
      // If parsing failed, try to extract product description for text analysis
      return { success: false, error: 'Не удалось обработать ответ Vision AI' };
    }

  } catch (visionError) {
    console.warn('Vision API failed:', visionError.message);
    console.warn('Full vision error:', visionError);

    // Fallback to text-only analysis if caption provided
    if (caption) {
      console.log('🔄 Fallback to text analysis with caption:', caption);
      return analyzeFoodText(caption);
    } else {
      return { success: false, error: 'Vision API недоступен и нет описания' };
    }
  }
}

/**
 * Generate motivational message based on user progress
 * @param {Object} user - User object
 * @param {Object} progressData - Progress data
 * @returns {Promise<string>} - Motivational message
 */
async function generateMotivation(user, progressData) {
  try {
    const prompt = `
Создай персонализированное мотивационное сообщение для пользователя.

Профиль пользователя:
- Возраст: ${user.age}
- Пол: ${user.gender === 'male' ? 'мужской' : 'женский'}
- Рост: ${user.height} см
- Вес: ${user.weight} кг
- Цель: похудеть/набрать вес (если есть)

Прогресс за последний день:
- Калории: ${progressData.calories || 0}
- Белок: ${progressData.protein || 0}г
- Жиры: ${progressData.fat || 0}г
- Углеводы: ${progressData.carbs || 0}г

Сообщение должно быть:
- Позитивным и поддерживающим
- Конкретным с цифрами
- Мотивирующим к продолжению
- Не более 200 символов

Примеры:
"Отлично! За день вы съели 1850 калорий, что на 15% ближе к цели! Продолжайте!"
"Замечательно! Ваша норма белка на 85% выполнена. Вы молодец!"`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Ты мотивирующий коуч по здоровому питанию. Создавай вдохновляющие сообщения.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0]?.message?.content || 'Отличная работа! Продолжайте следовать принципам здорового питания!';

  } catch (error) {
    console.error('Motivation generation error:', error);
    return 'Вы делаете отличную работу! Продолжайте заботиться о своем здоровье! 💪';
  }
}

/**
 * Generate meal recommendations
 * @param {Object} user - User profile
 * @param {string} mealType - Type of meal (breakfast, lunch, etc.)
 * @returns {Promise<Object>} - Meal suggestions
 */
async function generateMealSuggestion(user, mealType) {
  try {
    const caloriesTarget = calculateDailyCalories(user);

    const mealCalories = {
      breakfast: caloriesTarget * 0.25,
      lunch: caloriesTarget * 0.35,
      dinner: caloriesTarget * 0.3,
      snack: caloriesTarget * 0.1
    };

    const prompt = `
Предложи рецепт или идеи для приема пищи.

Тип приема пищи: ${mealType} (${Math.round(mealCalories[mealType])} калорий)

Профиль пользователя:
- Возраст: ${user.age}
- Пол: ${user.gender === 'male' ? 'мужской' : 'женский'}
- Предпочтения: активный образ жизни, белковая пища

Ответь в формате JSON:
{
  "ideas": ["идея 1", "идея 2", "идея 3"],
  "recipe": {
    "name": "название рецепта",
    "ingredients": ["ингредиент 1", "ингредиент 2"],
    "instructions": "инструкция по приготовлению",
    "nutrition": {
      "calories": number,
      "protein": number,
      "fat": number,
      "carbs": number
    }
  }
}`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Ты шеф-повар и диетолог. Предлагай полезные рецепты.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        return JSON.parse(content);
      } catch (e) {
        console.error('JSON parse error in meal suggestion:', e);
        return { success: false, error: 'Не удалось обработать ответ AI' };
      }
    }

    return { success: false, error: 'Нет ответа от AI' };

  } catch (error) {
    console.error('Meal suggestion error:', error);
    return null;
  }
}

/**
 * Calculate daily calorie needs (simplified formula)
 * @param {Object} user - User data
 * @returns {number} - Daily calories
 */
function calculateDailyCalories(user) {
  const { age, gender, height, weight, activityLevel } = user;

  // Mifflin-St Jeor formula (simplified)
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    low: 1.2,
    medium: 1.55,
    high: 1.725
  };

  return Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));
}

/**
 * Validate analysis result before sending to user
 * @param {Object} result - AI analysis result
 * @param {string} text - Original input text
 * @returns {boolean} - True if result is valid
 */
function validateAnalysisResult(result, text) {
  try {
    // Check basic structure
    if (!result.success || !result.analysis) {
      return false;
    }

    const { description, total } = result.analysis;

    // Check description is meaningful
    if (!description || typeof description !== 'string' || description.length < 2) {
      return false;
    }

    // Check numeric values are valid
    const { calories, protein, fat, carbs } = total;
    const isValid = (value) => typeof value === 'number' && !isNaN(value) && isFinite(value);

    if (!isValid(calories) || !isValid(protein) || !isValid(fat) || !isValid(carbs)) {
      return false;
    }

    // Reasonable value ranges (calories should be positive, others non-negative)
    if (calories <= 0 || calories > 50000 || protein < 0 || fat < 0 || carbs < 0) {
      return false;
    }

    // Check product name consistency (description must include the input product)
    const inputLower = text.toLowerCase();
    const descLower = description.toLowerCase();

    // Check if either Russian or English name matches
    const containsBanana = descLower.includes('банан') || descLower.includes('banana');
    const containsBroccoli = descLower.includes('брокколи') || descLower.includes('broccoli');
    const containsApple = descLower.includes('яблоко') || descLower.includes('apple');
    const containsMilk = descLower.includes('молоко') || descLower.includes('milk');

    if (inputLower.includes('банан') && !containsBanana) return false;
    if (inputLower.includes('брокколи') && !containsBroccoli) return false;
    if (inputLower.includes('яблоко') && !containsApple) return false;
    if (inputLower.includes('молоко') && !containsMilk) return false;
    if (inputLower.includes('курица') && !descLower.includes('курица') && !descLower.includes('chicken')) return false;
    if (inputLower.includes('рыба') && !descLower.includes('рыба') && !descLower.includes('fish') && !descLower.includes('salmon')) return false;

    return true;
  } catch (error) {
    console.error('Error validating analysis result:', error);
    return false;
  }
}

/**
 * Generate recipe from user's available ingredients
 * @param {string[]} userIngredients - Array of ingredients user has
 * @param {Object} userProfile - User profile data
 * @param {number} targetCalories - Target calories for the recipe
 * @returns {Promise<Object>} - Generated recipe
 */
async function generateRecipeFromIngredients(userIngredients, userProfile, targetCalories = null) {
  try {
    console.log('\n=== GENERATING RECIPE FROM INGREDIENTS ===');
    console.log('User ingredients:', userIngredients);
    console.log('Target calories:', targetCalories);

    const prompt = `Создай оригинальный и вкусный рецепт из доступных ингредиентов пользователя.

Доступные ингредиенты: ${userIngredients.join(', ')}

Создай рецепт на ${targetCalories || 'стандартную порцию'} калорий, который будет вкусным и полезным.

Требования к рецепту:
- Используй ТОЛЬКО доступные ингредиенты (или их логические замены)
- Инструкции должны быть четкими и простыми
- Укажи время приготовления
- Рассчитай КБЖУ на порцию

Ответь ТОЛЬКО в формате JSON:
{
  "success": true,
  "recipe": {
    "title": "Название блюда",
    "description": "Краткое описание вкуса и пользы",
    "difficulty": "easy|medium|hard",
    "cooking_time": 30,
    "servings": 2,
    "ingredients": [
      {"name": "название ингредиента", "amount": "количество", "unit": "единица"}
    ],
    "instructions": "Шаг за шагом инструкции приготовления",
    "nutrition_per_serving": {
      "calories": 300,
      "protein": 25,
      "fat": 12,
      "carbs": 20
    },
    "tags": ["завтрак", "быстрое", "полезное"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{
        role: 'system',
        content: 'Ты профессиональный шеф-повар и нутрициолог. Создавай вкусные и полезные рецепты из доступных ингредиентов. Всегда указывай точное КБЖУ на порцию.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.8,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'Нет ответа от AI' };
    }

    const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(cleanContent);

    console.log('\n=== RECIPE GENERATED FROM INGREDIENTS ===');
    if (result.success && result.recipe) {
      console.log('Title:', result.recipe.title);
      console.log('Nutrition:', result.recipe.nutrition_per_serving);
      console.log('=====================================\n');
      return result;
    } else {
      console.log('❌ Invalid AI response format:', result);
      return { success: false, error: 'Некорректный формат ответа от AI' };
    }

  } catch (error) {
    console.error('Recipe generation error:', error);
    return { success: false, error: `Ошибка генерации рецепта: ${error.message}` };
  }
}

/**
 * Generate recipe introducing new healthy ingredients to user
 * @param {Object} userProfile - User profile data
 * @returns {Promise<Object>} - Generated recipe with new ingredient
 */
async function generateRecipeWithNewIngredient(userProfile) {
  try {
    console.log('\n=== GENERATING RECIPE WITH NEW INGREDIENT ===');

    // Определяем подходящие новые продукты для пользователя
    const newIngredients = [
      { name: 'квиноа', category: 'крупы', benefit: 'богата белком и клетчаткой' },
      { name: 'фуа-гра', category: 'зелень', benefit: 'суперфуд с антиоксидантами' },
      { name: 'chia seeds', category: 'семена', benefit: 'омега-3 и клетчатка' },
      { name: 'голубика', category: 'ягода', benefit: 'антиоксиданты для иммунитета' },
      { name: 'гречка', category: 'крупы', benefit: 'безглютеновый источник железа' },
      { name: 'манго', category: 'фрукты', benefit: 'витамин C и каротин' },
      { name: 'куркума', category: 'специи', benefit: 'противовоспалительное действие' },
      { name: 'кокосовое масло', category: 'масла', benefit: 'среднецепочечные жирные кислоты' },
      { name: 'брокколи', category: 'овощи', benefit: 'витамины B и K, сульфорафан' },
      { name: 'имбирь', category: 'специи', benefit: 'уменьшает воспаления' }
    ];

    // Выбираем случайный новый ингредиент (в будущем можно персонализировать)
    const newIngredient = newIngredients[Math.floor(Math.random() * newIngredients.length)];

    const prompt = `Создай вкусный рецепт с новым полезным ингредиентом: "${newIngredient.name}".

Почему этот продукт полезен: ${newIngredient.benefit}

Создай простой рецепт для начала (завтрак, салат или закуска), который познакомит с этим продуктом.

Требования:
- Рецепт должен быть простым для новичка
- Объясни пользу нового ингредиента
- Рассчитай точное КБЖУ

Ответь ТОЛЬКО в формате JSON:
{
  "success": true,
  "recipe": {
    "title": "Название блюда с новым продуктом",
    "description": "Почему блюдо вкусное и полезное",
    "new_ingredient": {
      "name": "${newIngredient.name}",
      "benefit": "${newIngredient.benefit}",
      "category": "${newIngredient.category}"
    },
    "difficulty": "easy",
    "cooking_time": 15,
    "servings": 1,
    "ingredients": [
      {"name": "${newIngredient.name}", "amount": "примерное количество", "unit": "г"},
      {"name": "другие простые продукты", "amount": "количество", "unit": "г"}
    ],
    "instructions": "Простые шаги для приготовления",
    "nutrition_per_serving": {
      "calories": 250,
      "protein": 12,
      "fat": 8,
      "carbs": 30
    },
    "tags": ["новинка", "${newIngredient.category}", "здоровое питание"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{
        role: 'system',
        content: 'Ты дружелюбный нутрициолог и шеф-повар. Знакомишь людей со здоровыми продуктами через вкусные рецепты. Объясняй пользу новых ингредиентов просто и мотивирующе.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 1200
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'Нет ответа от AI' };
    }

    const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(cleanContent);

    console.log('\n=== RECIPE GENERATED WITH NEW INGREDIENT ===');
    console.log('Title:', result.recipe.title);
    console.log('New ingredient:', result.recipe.new_ingredient.name);
    console.log('=====================================\n');

    return result;

  } catch (error) {
    console.error('New ingredient recipe generation error:', error);
    return { success: false, error: `Ошибка генерации рецепта: ${error.message}` };
  }
}

/**
 * Generate balanced recipe for exact calorie amount (independent of user foods)
 * @param {number} targetCalories - Target calories for the recipe
 * @returns {Promise<Object>} - Generated recipe
 */
async function generateBalancedRecipeForCalories(targetCalories = null) {
  try {
    console.log(`📊 Generating balanced recipe for ${targetCalories} calories`);

    const prompt = `Создай вкусный и сбалансированный рецепт на точное количество калорий: ${targetCalories}.

Создай полноценный рецепт с указанными калориями. Рецепт должен быть:
- Сбалансированным по питательным веществам
- Вкусным и привлекательным
- Практичным для приготовления
- С четкими инструкциями

Требования к рецепту:
- Общее количество калорий: ${targetCalories} (ровно или максимально близко)
- Пропорции: ~30% белки, ~30% жиры, ~40% углеводы (приблизительно)
- Несложные ингредиенты
- Подробные инструкции по приготовлению

Ответь ТОЛЬКО в формате JSON:
{
  "success": true,
  "recipe": {
    "title": "Название блюда (привлекательное и аппетитное)",
    "description": "Почему блюдо полезное и вкусное, кратко",
    "difficulty": "easy|medium|hard",
    "cooking_time": 25,
    "servings": 1,
    "ingredients": [
      {"name": "ингредиент 1", "amount": "количество", "unit": "г или шт"},
      {"name": "ингредиент 2", "amount": "количество", "unit": "г или шт"}
    ],
    "instructions": "Подробные шаги приготовления по порядку",
    "nutrition_per_serving": {
      "calories": ${targetCalories},
      "protein": number,
      "fat": number,
      "carbs": number
    },
    "tags": ["здоровое питание", "сбалансированное", "полезное"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{
        role: 'system',
        content: 'Ты шеф-повар и нутрициолог. Создавай точные по калориям, сбалансированные рецепты для здорового питания.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'Нет ответа от AI' };
    }

    const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(cleanContent);

    console.log(`📊 Balanced recipe generated: "${result.recipe?.title}" for ${targetCalories} calories`);

    return result;

  } catch (error) {
    console.error('Balanced recipe generation error:', error);
    return { success: false, error: `Ошибка генерации рецепта: ${error.message}` };
  }
}

module.exports = {
  analyzeFoodText,
  analyzeFoodImage,
  generateMotivation,
  generateMealSuggestion,
  generateRecipeFromIngredients,
  generateRecipeWithNewIngredient,
  generateBalancedRecipeForCalories,
  calculateDailyCalories,
  validateAnalysisResult
};
