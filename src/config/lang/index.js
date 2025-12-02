// Система интернационализации (i18n) для Eat_bot
const fs = require('fs');
const path = require('path');

class LangManager {
  constructor() {
    this.languages = {};
    this.currentLanguage = 'ru';
    this.defaultLanguage = 'ru';
    this.fallbackKeys = {};
  }

  // Загрузка всех языковых файлов
  loadLanguages() {
    const langDir = path.join(__dirname);

    try {
      // Ищем все .json файлы в папке lang
      const langFiles = fs.readdirSync(langDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      // Загружаем каждый язык
      langFiles.forEach(lang => {
        try {
          const langPath = path.join(langDir, `${lang}.json`);
          const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
          this.languages[lang] = langData;
          console.log(`🌐 Загружен язык: ${langData.meta.name} (${lang})`);
        } catch (error) {
          console.error(`❌ Ошибка загрузки языка ${lang}:`, error.message);
        }
      });

      // Проверяем наличие дефолтного языка
      if (!this.languages[this.defaultLanguage]) {
        throw new Error(`Дефолтный язык ${this.defaultLanguage} не найден`);
      }

      console.log(`✅ Загружено ${Object.keys(this.languages).length} языков`);

    } catch (error) {
      console.error('❌ Ошибка загрузки языков:', error.message);
      throw error;
    }
  }

  // Установка текущего языка
  setLanguage(lang) {
    if (!this.languages[lang]) {
      console.warn(`⚠️ Язык ${lang} не найден, используем дефолтный ${this.defaultLanguage}`);
      this.currentLanguage = this.defaultLanguage;
      return false;
    }

    this.currentLanguage = lang;
    console.log(`🌐 Текущий язык установлен: ${this.languages[lang].meta.name}`);
    return true;
  }

  // Получение текущего языка
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Получение текста по ключу с поддержкой параметров и fallback
  t(key, params = {}, fallback = null) {
    try {
      const keys = key.split('.');
      let value = this.languages[this.currentLanguage];

      // Навигация по ключам
      for (const k of keys) {
        if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }

      // Fallback к дефолтному языку
      if (value === undefined && this.currentLanguage !== this.defaultLanguage) {
        value = this.languages[this.defaultLanguage];
        for (const k of keys) {
          if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
            value = value[k];
          } else {
            value = undefined;
            break;
          }
        }
      }

      // Если не найдено и есть fallback
      if (value === undefined) {
        if (fallback !== null) {
          return fallback;
        }
        console.warn(`⚠️ Перевод не найден для ключа: ${key}`);
        return key; // Возвращаем ключ как есть
      }

      // Обработка строк с параметрами
      if (typeof value === 'string') {
        return this.interpolate(value, params);
      }

      // Обработка массивов
      if (Array.isArray(value)) {
        if (params.index !== undefined && typeof params.index === 'number') {
          const item = value[params.index];
          return item !== undefined ? item : value.join(', ');
        }
        // Возвращаем массив как есть, если не указан индекс
        return value;
      }

      // Для объектов возвращаем как есть
      if (typeof value === 'object' && value !== null) {
        return value;
      }

      return value;

    } catch (error) {
      console.error(`❌ Ошибка получения перевода для ключа ${key}:`, error.message);
      return fallback !== null ? fallback : key;
    }
  }

  // Интерполяция параметров в строке (%param%)
  interpolate(text, params) {
    if (typeof text !== 'string') return text;

    return text.replace(/%(\w+)%/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // Получение списка доступных языков
  getAvailableLanguages() {
    return Object.keys(this.languages).map(lang => ({
      code: lang,
      name: this.languages[lang].meta.name,
      direction: this.languages[lang].meta.direction
    }));
  }

  // Проверка существования ключа
  hasKey(key) {
    const keys = key.split('.');
    let value = this.languages[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
        value = value[k];
      } else {
        return false;
      }
    }

    return value !== undefined;
  }

  // Получение всех ключей для отладки
  getAllKeys(lang = null) {
    const targetLang = lang || this.currentLanguage;
    const flatten = (obj, prefix = '') => {
      let keys = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
            Object.assign(keys, flatten(obj[key], fullKey));
          } else {
            keys[fullKey] = obj[key];
          }
        }
      }
      return keys;
    };

    return flatten(this.languages[targetLang] || {});
  }

  // Валidação языкового файла
  validateLanguage(lang) {
    if (!this.languages[lang]) {
      return { valid: false, error: `Язык ${lang} не загружен` };
    }

    const requiredKeys = [
      'welcome.title',
      'errors.general',
      'onboarding.gender.ask'
    ];

    const missingKeys = requiredKeys.filter(key => !this.hasKey(key));

    if (missingKeys.length > 0) {
      return {
        valid: false,
        error: `Отсутствуют обязательные ключи: ${missingKeys.join(', ')}`
      };
    }

    // Дополнительные проверки можно добавить здесь

    return { valid: true };
  }

  // Создание пустого шаблона для нового языка
  createTemplate(sourceLang = 'ru') {
    const source = this.languages[sourceLang];
    if (!source) {
      throw new Error(`Исходный язык ${sourceLang} не найден`);
    }

    const template = JSON.parse(JSON.stringify(source));

    // Рекурсивная очистка значений
    const clearValues = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string') {
            obj[key] = '';
          } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map(() => '');
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            clearValues(obj[key]);
          }
        }
      }
    };

    clearValues(template.content || template);
    return template;
  }
}

// Создание глобального экземпляра
const langManager = new LangManager();

// Инициализация языков
langManager.loadLanguages();

// Функция t() для удобства
const t = (key, params, fallback) => langManager.t(key, params, fallback);

// Экспорт
module.exports = { t, langManager };
