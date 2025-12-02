#!/usr/bin/env node

const XLSX = require('xlsx');
const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

// Initialize sequelize with production config for consistency with bot
const environment = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[environment]);

const { FoodData: FoodDataModel, FoodNutrient: FoodNutrientModel, Nutrient: NutrientModel } = require('../src/database/models/index');

const FoodData = FoodDataModel(sequelize, Sequelize);
const FoodNutrient = FoodNutrientModel(sequelize, Sequelize);
const Nutrient = NutrientModel(sequelize, Sequelize);

/**
 * Чтение Excel файла и получение данных
 */
function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Преобразуем в JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // вернуть как массив массивов
    defval: '', // значение по умолчанию для пустых ячеек
    blankrows: false // пропустить пустые строки
  });

  return { jsonData, sheetName };
}

/**
 * Создание питательных веществ для импорта
 */
async function createNutrients() {
  const nutrientsMap = new Map();

  // Основные питательные вещества из arahis.xls
  const nutrientsList = [
    { name: 'Белки', nameEn: 'Proteins', unitName: 'G', nutrientNumber: 203 },
    { name: 'Жиры', nameEn: 'Fats', unitName: 'G', nutrientNumber: 204 },
    { name: 'Углеводы', nameEn: 'Carbohydrates', unitName: 'G', nutrientNumber: 205 },
    { name: 'Калории', nameEn: 'Energy', unitName: 'KCAL', nutrientNumber: 208 },
  ];

  for (const nutrientInfo of nutrientsList) {
    const existing = await Nutrient.findOne({
      where: { name: nutrientInfo.name }
    });

    if (!existing) {
      const nutrient = await Nutrient.create({
        fdcNutrientId: Date.now() + Math.random(), // уникальный ID для локальных данных
        name: nutrientInfo.name,
        unitName: nutrientInfo.unitName,
        nutrientNumber: nutrientInfo.nutrientNumber,
        rank: null
      });
      nutrientsMap.set(nutrientInfo.name, nutrient.id);
      console.log(`✅ Создан питательный элемент: ${nutrientInfo.name}`);
    } else {
      nutrientsMap.set(nutrientInfo.name, existing.id);
    }
  }

  return nutrientsMap;
}

/**
 * Парсинг и импорт данных из Excel
 */
async function importArahisData(nutrientsMap) {
  console.log('📥 Импортируем данные из arahis.xls...');

  const { jsonData } = readExcelFile('arahis.xls');

  console.log(`Найдено строк: ${jsonData.length}`);
  console.log('Заголовки:', jsonData[0]);

  // Предполагаемая структура:
  // [название продукта, белки, жиры, углеводы, калории, клетчатка, сахар, ...]

  let imported = 0;
  const processedHeaders = jsonData[0].map(h => h.trim().toLowerCase());

  // Перебираем строки с данными (пропускаем заголовок)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row.length === 0 || !row[0]) continue; // пропустить пустые строки

    const productName = row[0].trim();
    if (!productName) continue;

    console.log(`📦 Обработка продукта: ${productName}`);

    // Создаем запись продукта
    const foodRecord = await FoodData.create({
      fdcId: Date.now() + Math.random(), // уникальный ID для локальных данных
      dataType: 'arahis_import',
      description: productName,
      descriptionEn: null, // поскольку названия уже на русском
      descriptionRu: productName, // названия на русском
      descriptionLower: productName.toLowerCase(),
      foodCategoryId: null, // можно добавить категорию позже
      publicationDate: new Date()
    });

    console.log(`💾 Создан продукт ID: ${foodRecord.id}`);

    // Импортируем питательные вещества согласно структуре файла
    // Структура: ['Продукт', 'Жиры, г', 'Белки, г', 'Углеводы, г', 'Калорийность, Ккал', '', '', '']
    const nutrientMappings = [
      { name: 'Жиры', idx: 1, units: 'G' },
      { name: 'Белки', idx: 2, units: 'G' },
      { name: 'Углеводы', idx: 3, units: 'G' },
      { name: 'Калории', idx: 4, units: 'KCAL' },
    ];

    for (const nutrient of nutrientMappings) {
      const value = parseFloat(row[nutrient.idx]);
      if (!isNaN(value) && value > 0 && nutrientsMap.has(nutrient.name)) {
        const nutrientId = nutrientsMap.get(nutrient.name);

        await FoodNutrient.create({
          foodDataId: foodRecord.id,
          nutrientId: nutrientId,
          amount: value,
          derivationId: null,
          min: null,
          max: null,
          units: nutrient.units
        });

        console.log(`   + ${nutrient.name}: ${value} ${nutrient.units}`);
      }
    }

    imported++;
  }

  return imported;
}

async function main() {
  try {
    console.log('🚀 Начинаем импорт данных из arahis.xls...');

    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');

    await sequelize.sync();
    console.log('✅ Таблицы синхронизированы');

    // Создание питательных веществ
    const nutrientsMap = await createNutrients();

    // Импорт данных
    const importedCount = await importArahisData(nutrientsMap);

    console.log(`🎉 Импорт завершен! Импортировано ${importedCount} продуктов`);

  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
