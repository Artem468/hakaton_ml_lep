# LAP ML

Проект состоит из бэкенд-сервера на Django, работающих с общей базой данных PostgreSQL с участием специально обученной модели компютерного зрения. Проект развертывается с использованием Docker.

## Технологический стек

### Бэкенд
- Python 3.13
- Django 5.2.8
- Django REST Framework 3.16.1
- PostgreSQL 15
- Gunicorn 23.0.0
- JWT Authentication
- Django CORS Headers
- DRF Spectacular (для API документации)
- ultralytics (библиотека для обученя)
- YOLO (модель)

### Фронтенд
- Next.js
- TypeScript
- Tailwind

### Инфраструктура
- Docker & Docker Compose
- Nginx 1.27
- PostgreSQL 15

## Требования для установки
- Docker
- Docker Compose
- Git

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Artem468/hakaton_ml_lep.git
cd hakaton_ml_lep
```

2. Создайте файл `.env` в корневой директории проекта (см. env.example)

3. Запустите проект с помощью Docker Compose:
```bash
docker compose up --build -d
```

После запуска:
- Бэкенд будет доступен по адресу: `http://127.0.0.1:80/`
- API документация: `http://127.0.0.1:80/swagger/`
- Админка: `http://127.0.0.1:80/admin/`
- Фронтенд: `http://127.0.0.1:80/`
- База данных PostgreSQL будет работать на порту 5432 (доступна только внутри Docker network)
- Nginx будет обрабатывать входящие запросы на порту 80

## Структура проекта

- `hakaton_ml_lep/` - Django бэкенд приложение
  - `ml_backend/` - Корневой каталог с конфигурациями
  - `vision/` - Приложение для управление и работы с моделью
  - `users/` - Приложение для управления пользователями
  - `static/` - Статические файлы
  
- `lep_frontend/` - Веб приложение
  - `assets/` - статичные изображения
  - `api/` - повторяющиеся связи с API
  - `batch/` - сборник картинок по Id
  - `component/` - отдельные компоненты
  - `hoc/` - это чистая функция без побочных эффектов, которая преобразует один компонент в другой в нашем случае делает обязательную авторизацию
  - `loadimage/` - страница загрузки картинок
  - `profile/` - страница профиля
  - `stats/` - страница статистики
  - `layout.tsx` - корневой layout
  - `page.tsx` - страница входа

- `nginx/` - Конфигурация Nginx
- `docker-compose.yml` - Конфигурация Docker Compose
- `requirements.txt` - Зависимости Python

## Разработка

Для локальной разработки без Docker:

1. Создайте виртуальное окружение:
```bash
python -m venv venv
source venv/bin/activate  # Для Linux/MacOS
venv\Scripts\activate     # Для Windows
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Запустите проект с помощью Docker Compose:
```bash
docker compose up --build -d
```

## Дополнительная информация

- Статические файлы обслуживаются через Nginx
- Все сервисы работают в одной Docker network для безопасной коммуникации
- В случае если ресурс не доступен по ссылке `http://127.0.0.1:80/` стоит перезагрузить контейнер Nginx командной
```bash
  docker restart max-nginx
```
