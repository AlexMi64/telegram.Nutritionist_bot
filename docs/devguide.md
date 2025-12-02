# Руководство разработчика Eat_bot

## Обзор
Комплексное руководство по развитию и поддержке Eat_bot проекта.

## 🚀 Быстрый старт

### Предварительные требования
```bash
# Система
macOS/Linux/Windows
Node.js 18+
npm 8+
Git

# Рекомендуемые инструменты
Visual Studio Code
GitHub Desktop (опционально)
PostgreSQL (для продакшена)
```

### Установка для разработки
```bash
# Клонирование
git clone https://github.com/username/eat_bot.git
cd eat_bot

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполнить переменные окружения

# Запуск в dev режиме
npm run dev

# Проверка работоспособности
curl http://localhost:3000/health
```

### Структура проекта
```
eat_bot/
├── 🎯 src/                    # Source code
│   ├── bot/
│   │   └── bot.js            # Main bot logic
│   ├── config/
│   │   └── index.js          # Configuration
│   ├── database/
│   │   ├── connection.js     # DB connection
│   │   └── models/           # Data models
│   └── services/
│       ├── openaiService.js  # AI integration
│       └── scheduler.js      # Notifications
│
├── 📊 docs/                   # Documentation
│   ├── architecture.md       # System architecture
│   ├── deployment.md         # Deployment guide
│   └── devguide.md          # This file
│
├── 🔧 config/                 # Server configs
├── 🔄 migrations/             # DB migrations
├── 🧪 tests/                 # Test suite
├── 📊 memory-bank/           # Project history
└── 🐳 docker/                # Docker files
```

## 🔧 Development Workflow

### Git Flow
```
main (production)
├── develop (integration)
│   ├── feature/new-feature
│   ├── bugfix/critical-bug
│   └── hotfix/emergency-fix
```

### Branching Strategy
```bash
# Создание feature branch
git checkout -b feature/new-ai-model

# Работа над задачей
git add .
git commit -m "feat: add new AI model support"

# Push и создание PR
git push origin feature/new-ai-model

# После review слияние
git checkout develop
git merge feature/new-ai-model
```

### Коммиты
```bash
# Конвенция: type(scope): description
feat(new-ai): add GPT-4 Turbo support
fix(schedule): correct timezone handling
docs(readme): update installation steps
refactor(bot): simplify state management
test(services): add AI mock tests
```

## 📝 Coding Standards

### JavaScript/Node.js
```javascript
// ✅ Good: Clean, readable, async/await
async function getNutritionAnalysis(foodDescription) {
  try {
    const analysis = await openaiService.analyzeText(foodDescription);
    return validation.successResponse(analysis);
  } catch (error) {
    logger.error('Analysis failed:', error);
    return validation.errorResponse('Analysis unavailable');
  }
}

// ❌ Bad: Callbacks, no error handling
function getNutritionAnalysis(foodDescription, callback) {
  openaiService.analyzeText(foodDescription)
    .then(result => callback(null, result))
    .catch(err => callback(err));
}
```

### Naming Conventions
```javascript
// Constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_MODEL = 'gpt-3.5-turbo';

// Functions (camelCase)
async function getNutritionAnalysis(text) {
  // async operations
}

// Classes (PascalCase)
class NutritionAnalyzer {
  constructor(config) {
    this.config = config;
  }

  async analyze(text) {
    // implementation
  }
}

// Files (kebab-case)
src/services/
├── nutrition-analyzer.js
├── cache-manager.js
└── api-client.js
```

### Error Handling
```javascript
// ✅ Centralized error handling
async function safeApiCall(apiFunction, fallback) {
  try {
    return await apiFunction();
  } catch (error) {
    logger.warn('API call failed:', error);

    if (fallback) {
      return fallback();
    }

    throw new Error(`Service unavailable: ${error.message}`);
  }
}

// ✅ Custom error classes
class NutritionAnalysisError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NutritionAnalysisError';
    this.originalError = originalError;
  }
}
```

## 🧪 Testing Strategy

### Test Structure
```
tests/
├── unit/              # Unit tests
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/       # Integration tests
│   ├── telegram/
│   └── database/
├── e2e/              # End-to-end tests
└── __mocks__/       # Mock services
```

### Unit Tests (Jest)
```javascript
// nutrition-analyzer.test.js
const { NutritionAnalyzer } = require('../src/services');
const { OpenAIMock } = require('../__mocks__');

describe('NutritionAnalyzer', () => {
  let analyzer;
  let mockAI;

  beforeEach(() => {
    mockAI = new OpenAIMock();
    analyzer = new NutritionAnalyzer({ ai: mockAI });
  });

  describe('analyzeFood()', () => {
    it('should return nutrition data for valid food', async () => {
      mockAI.setResponse({ success: true, data: mockNutritionData });

      const result = await analyzer.analyzeFood('курица 200г');

      expect(result.success).toBe(true);
      expect(result.data.calories).toBeGreaterThan(0);
    });

    it('should handle AI service failure', async () => {
      mockAI.setError(new Error('API timeout'));

      await expect(analyzer.analyzeFood('invalid food'))
        .rejects.toThrow('API timeout');
    });
  });
});
```

### Integration Tests
```javascript
// telegram-bot.integration.test.js
describe('Telegram Bot Integration', () => {
  let bot;
  let mockTelegram;

  beforeAll(async () => {
    mockTelegram = new TelegramMock();
    bot = new EatBot({
      token: 'test_token',
      telegramApi: mockTelegram
    });
    await bot.start();
  });

  afterAll(async () => {
    await bot.stop();
  });

  it('should handle /start command', async () => {
    mockTelegram.simulateMessage('/start', { userId: 123 });

    const response = await mockTelegram.waitForResponse();

    expect(response).toContain('Добро пожаловать');
    expect(response).toContain('/start');
  });
});
```

### E2E Tests (Playwright)
```javascript
// bot-conversation.e2e.test.js
test('complete user onboarding flow', async ({ page, bot }) => {
  // Start with /start
  await bot.sendMessage('/start');

  const welcomeMsg = await bot.waitForMessage();
  expect(welcomeMsg).toContain('Какой у вас пол?');

  // Complete onboarding
  await bot.sendMessage('мужчина');
  await bot.sendMessage('30');
  await bot.sendMessage('180');
  await bot.sendMessage('80');
  // ... продолжить полный flow

  // Verify completion
  const finalMsg = await bot.waitForMessage();
  expect(finalMsg).toContain('настройка завершена');
});
```

### Test Coverage
```bash
# Запуск всех тестов
npm test

# С coverage
npm run test:coverage

# Watch mode для разработки
npm run test:watch

# Цели coverage: >80% statements, >70% branches, >80% functions
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    # Deploy to staging

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    # Deploy to production
```

### Pre-commit Hooks (Husky)
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "git add"],
    "*.md": ["markdownlint --fix", "git add"]
  }
}
```

## 📊 Monitoring & Observability

### Logs
```javascript
// Winston structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'eat-bot' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Metrics
```javascript
// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();

const messageCount = new promClient.Counter({
  name: 'eatbot_messages_total',
  help: 'Total messages processed',
  labelNames: ['type', 'status']
});

const responseTime = new promClient.Histogram({
  name: 'eatbot_response_time_seconds',
  help: 'Response time in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// In code:
responseTime.observe(responsetime);
messageCount.inc({ type: 'user', status: 'success' });
```

### Health Checks
```javascript
// Health endpoint
app.get('/health', (req, res) => {
  Promise.all([
    database.healthCheck(),
    openaiService.ping(),
    telegramBot.getStatus()
  ]).then(results => {
    const [dbOk, aiOk, botOk] = results;
    res.json({
      status: dbOk && aiOk && botOk ? 'healthy' : 'unhealthy',
      checks: { database: dbOk, ai: aiOk, bot: botOk },
      timestamp: new Date().toISOString()
    });
  }).catch(err => {
    res.status(503).json({
      status: 'error',
      error: err.message
    });
  });
});
```

## 🔒 Security

### Input Validation
```javascript
// Use Joi or custom validators
const validateFoodInput = (input) => {
  if (!input || input.length < 2 || input.length > 500) {
    throw new Error('Invalid food description length');
  }

  // Check for malicious patterns
  const forbidden = ['<script>', 'javascript:', 'eval(', 'function('];
  if (forbidden.some(f => input.toLowerCase().includes(f))) {
    throw new Error('Potential XSS detected');
  }

  return input;
};
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// Global rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per window
}));

// Stricter for AI calls
app.use('/api/analyze', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // requests per minute
}));
```

### Secrets Management
```javascript
// Never commit secrets
require('dotenv').config();

// Validate required env vars
const required = ['BOT_TOKEN', 'OPENAI_API_KEY', 'DATABASE_URL'];
required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```

## 📚 API Documentation

### Endpoints (Internal)
```javascript
// Telegram Bot Commands
POST /telegram/webhook
- Payload: Telegram message JSON
- Response: Empty 200

// Health Check
GET /health
- Response: Service health status

// Metrics (future)
GET /metrics
- Response: Prometheus metrics
```

### External APIs
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **OpenRouter API**: https://openrouter.ai/docs
- **Nutrition APIs**: Custom AI-powered nutritional analysis

## 🔄 Database Migrations

### Best Practices
```bash
# Создание миграции
npx sequelize-cli migration:generate --name add_user_timezone

# Применение
npx sequelize-cli db:migrate

# Rollback
npx sequelize-cli db:migrate:undo

# Статус
npx sequelize-cli db:migrate:status
```

### Migration File Structure
```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'timezone', {
      type: Sequelize.STRING,
      defaultValue: 'Europe/Moscow',
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'timezone');
  }
};
```

## 🚀 Performance Optimization

### Database Optimization
```javascript
// Add indexes for frequently queried columns
queryInterface.addIndex('meals', ['user_id']);
queryInterface.addIndex('meals', ['date']);
queryInterface.addIndex('users', ['telegram_id']);

// Use composite indexes for complex queries
queryInterface.addIndex('progress',
  ['user_id', 'date'],
  { unique: true }
);
```

### Memory Management
```javascript
// Use appropriate data types
const smallString = Sequelize.STRING(50);  // vs TEXT
const mediumInt = Sequelize.INTEGER;        // vs BIGINT

// Clean up resources
class NutritionAnalyzer {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  getCachedResult(key) {
    const result = this.cache.get(key);
    if (result && this.cache.size > this.maxCacheSize) {
      this.cache.clear(); // Simple cleanup
    }
    return result;
  }
}
```

### API Call Optimization
```javascript
// Implement caching
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function cachedAICall(prompt) {
  const key = crypto.createHash('md5').update(prompt).digest('hex');
  let result = cache.get(key);

  if (!result) {
    result = await openaiService.call(prompt);
    cache.set(key, result);
  }

  return result;
}

// Batch requests when possible
async function batchAnalyzeFoods(foods) {
  const results = [];

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < foods.length; i += 5) {
    const batch = foods.slice(i, i + 5);

    const batchResults = await Promise.all(
      batch.map(food => analyzeFood(food))
    );

    results.push(...batchResults);
  }

  return results;
}
```

## 👥 Contributing

### Pull Request Process
1. **Fork and Clone**: Fork repo and clone locally
2. **Branch**: Create feature/bugfix branch
3. **Develop**: Write code and tests
4. **Test**: Run full test suite + manual testing
5. **Commit**: Follow conventional commit format
6. **Push**: Push to your fork
7. **PR**: Create pull request with description
8. **Review**: Address feedback and iterate
9. **Merge**: Squash merge to main

### Code Review Checklist
- [ ] Tests pass (unit/integration/e2e)
- [ ] Code follows style guide
- [ ] Security issues addressed
- [ ] Performance impact considered
- [ ] Documentation updated
- [ ] No breaking changes without migration

### Release Process
1. **Feature Complete**: All features tested and approved
2. **Version Bump**: Update version in package.json
3. **Changelog**: Update CHANGELOG.md
4. **Tag**: git tag v1.2.3
5. **Deploy**: Automated deployment to production
6. **Announce**: Release notes in Telegram channel

## 🆘 Troubleshooting

### Common Issues

#### 1. "SQLite file locked" Error
```bash
# Check if another process is using it
lsof eat_bot.db

# Restart Node.js process
pm2 restart eat_bot

# Backup and recreate DB if needed
sqlite3 eat_bot.db ".backup 'backup.db'"
rm eat_bot.db
# Run migrations to recreate
```

#### 2. "OpenAI API rate limit exceeded"
```javascript
// Implement exponential backoff
class RetryWithBackoff {
  async execute(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.code === 'rate_limit_exceeded') {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
  }
}
```

#### 3. Memory Leaks
```javascript
// Monitor memory usage
const memUsage = process.memoryUsage();
console.log(`RSS: ${memUsage.rss / 1024 / 1024} MB`);

// Use --inspect flag for debugging
node --inspect --expose-gc src/bot/bot.js

// Force garbage collection (development only)
global.gc();
```

#### 4. Telegram Webhook Errors
```bash
# Check webhook status
curl "https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"

# Delete and reset webhook
curl "https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"

# Set new webhook
curl "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url=https://yourdomain.com/webhook"
```

## 📞 Support

### Communication Channels
- **Issues**: GitHub Issues for bugs/feature requests
- **Discussions**: GitHub Discussions for questions
- **Telegram**: @eatbot_dev for urgent issues

### Response Times
- **Critical bugs**: < 4 hours
- **Regular issues**: < 24 hours
- **Feature requests**: Within 1 week
- **General questions**: Within 48 hours

### Emergency Contacts
- **Production issues**: +7 (999) 123-45-67
- **Security issues**: security@example.com
- **Infrastructure**: infra@example.com
