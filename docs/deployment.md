# Руководство по развертыванию Eat_bot

## Обзор
Полное руководство по развертыванию Eat_bot в различных окружениях.

## 🚀 Quick Start

### Предварительные требования
```bash
# Node.js 18+
node --version

# npm
npm --version

# Telegram Bot Token (от @BotFather)
# OpenRouter API Key
```

### 1. Локальная установка
```bash
# Клонирование
git clone <repo>
cd eat_bot

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
# Отредактировать .env с реальными ключами

# Запуск
npm run dev
```

### 2. Telegram настройка
```bash
# Создание бота у @BotFather
/newbot
# Получить BOT_TOKEN и добавить в .env
```

## 🐧 Production Deployment

### Heroku Deployment

#### Шаг 1: Создание приложения
```bash
# Установка Heroku CLI
brew install heroku/brew/heroku

# Авторизация
heroku login

# Создание приложения
heroku create your-eat-bot-app
```

#### Шаг 2: Конфигурация
```bash
# Переменные окружения
heroku config:set BOT_TOKEN=your_bot_token_here
heroku config:set OPENAI_API_KEY=sk-or-v1-...
heroku config:set NODE_ENV=production
heroku config:set WEBHOOK_URL=https://your-eat-bot-app.herokuapp.com

# Git remote
heroku git:remote -a your-eat-bot-app
```

#### Шаг 3: Deploy
```bash
# Коммит изменений
git add .
git commit -m "Production deploy"

# Deploy to Heroku
git push heroku main
```

#### Шаг 4: Настройка webhook
```bash
# Установка webhook URL
heroku run node -e "require('./src/bot/bot.js')"
```

### DigitalOcean Droplet

#### Шаг 1: Создание сервера
```bash
# Создать Droplet с Ubuntu 22.04
# Рекомендуемая конфигурация: 1GB RAM, 1CPU
```

#### Шаг 2: Начальная настройка
```bash
# Подключение по SSH
ssh root@your_droplet_ip

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 (process manager)
sudo npm install -g pm2

# Установка Git
sudo apt install git -y
```

#### Шаг 3: Деплой проекта
```bash
# Клонирование проекта
cd /var/www
git clone https://github.com/yourusername/eat_bot.git
cd eat_bot

# Установка зависимостей
npm install --production

# Создание .env файла
nano .env
# Добавить переменные окружения
```

#### Шаг 4: Настройка Nginx
```bash
# Установка Nginx
sudo apt install nginx -y

# Создание конфигурации
sudo nano /etc/nginx/sites-available/eat_bot

# Добавить конфигурацию:
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Активация сайта
sudo ln -s /etc/nginx/sites-available/eat_bot /etc/nginx/sites-enabled/

# Тест и перезапуск
sudo nginx -t
sudo systemctl restart nginx
```

#### Шаг 5: PM2 управление
```bash
# Запуск приложения
pm2 start src/bot/bot.js --name "eat_bot"

# Сохранение конфигурации PM2
pm2 save
pm2 startup

# Просмотр логов
pm2 logs eat_bot
```

### Railway Deployment

#### Шаг 1: Создание проекта
```bash
# Создать новый проект на railway.app
# Подключить GitHub репозиторий
```

#### Шаг 2: Переменные окружения
В Railway dashboard добавить:
```
BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
NODE_ENV=production
WEBHOOK_URL=https://your-project.railway.app
```

#### Шаг 3: Deploy
```bash
# Автоматический deploy при push
git push origin main
```

## 🐳 Docker Deployment

### Локальный Docker
```bash
# Сборка образа
docker build -t eat_bot .

# Запуск контейнера
docker run -d \
  --name eat_bot \
  -p 3000:3000 \
  --env-file .env \
  eat_bot
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  eat_bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

```bash
# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

## ⚙️ Конфигурационные файлы

### package.json Scripts
```json
{
  "scripts": {
    "start": "NODE_ENV=production node src/bot/bot.js",
    "dev": "nodemon src/bot/bot.js",
    "build": "echo 'No build step required'",
    "deploy": "npm run build && pm2 restart eat_bot",
    "logs": "pm2 logs eat_bot",
    "status": "pm2 status"
  }
}
```

### nginx.conf для production
```
upstream eat_bot {
    server localhost:3000;
}

server {
    listen 80;
    server_name your_domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://eat_bot;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if added)
    location /static/ {
        alias /var/www/eat_bot/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security

### Environment Variables
```bash
# Никогда не коммитить ключи в Git
echo ".env" >> .gitignore

# Использовать strong secrets
BOT_TOKEN=secure_bot_token
OPENAI_API_KEY=secure_openai_key
```

### Firewall Configuration
```bash
# UFW для Ubuntu
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### SSL/HTTPS (Let's Encrypt)
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your_domain.com

# Автопродление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Мониторинг

### PM2 Monitoring
```bash
# Просмотр статусов
pm2 status
pm2 monit

# Рестарт
pm2 restart eat_bot

# Автореstart
pm2 startup
pm2 save
```

### Системные ресурсы
```bash
# Мониторинг использования
htop
df -h  # Disk usage
free -h  # Memory usage

# PM2 логи
pm2 logs eat_bot --lines 100
```

### Health Checks
```javascript
// src/config/index.js
module.exports = {
  // ... other config
  HEALTH_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RESTARTS: 10,
  MAX_MEMORY: '500M'
};
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Bot Token Invalid
```bash
# Проверить токен у @BotFather
curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getMe"
```

#### 2. Database Connection
```bash
# Проверить SQLite
sqlite3 eat_bot.db "SELECT COUNT(*) FROM users;"

# Пересоздать базу
rm eat_bot.db && npm run migrate
```

#### 3. Port Already in Use
```bash
# Найти процесс
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Или использовать другой порт
WEBHOOK_PORT=3001 npm start
```

#### 4. Webhook Issues
```bash
# Проверить webhook
curl "https://api.telegram.org/bot{YOUR_TOKEN}/getWebhookInfo"

# Удалить старый webhook
curl "https://api.telegram.org/bot{YOUR_TOKEN}/deleteWebhook"
```

### Logs and Debugging
```bash
# PM2 logs
pm2 logs eat_bot --err
pm2 logs eat_bot --out

# Node.js debug
NODE_DEBUG=http,net npm run dev

# Профилирование памяти
node --inspect src/bot/bot.js
```

## 📈 Scaling

### Horizontal Scaling
- **Load Balancer**: Nginx для распределения нагрузки
- **Docker Swarm**: Для multi-container deployments
- **Redis**: Для session storage across instances

### Vertical Scaling
- **Upgrade Server**: Больше RAM/CPU при росте пользователей
- **Database Indexing**: Дополнительные индексы для performance
- **Caching**: Redis для frequently accessed data

### Monitoring Setup
- **PM2 Monitoring**: Built-in process monitoring
- **Grafana + Prometheus**: Для detailed metrics
- **Log Aggregation**: ELK stack для centralized logging

## 🔄 Rolling Updates

### Zero-downtime Deployment
```bash
# PM2 cluster mode
pm2 start src/bot/bot.js -i 2 --name "eat_bot"

# Reload without downtime
pm2 reload eat_bot

# Graceful shutdown
pm2 gracefulReload eat_bot
```

## 📞 Support

### Emergency Contacts
- **Developer**: developer@example.com
- **Infrastructure**: infra@example.com

### Backup Strategy
```bash
# Database backup
sqlite3 eat_bot.db ".backup 'backup_$(date +%Y%m%d_%H%M%S).db'"

# Automated backups
crontab -e
# 0 2 * * * cd /var/www/eat_bot && sqlite3 eat_bot.db ".backup 'backup_daily.db'"
```

## ✅ Checklist перед deploy

- [ ] Environment variables настроены
- [ ] Bot token valid
- [ ] Database migrations выполнены
- [ ] Webhook URL configured
- [ ] SSL certificate active
- [ ] Monitoring tools configured
- [ ] Backup strategy in place
- [ ] Rollback plan prepared
