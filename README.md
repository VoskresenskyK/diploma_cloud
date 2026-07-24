# CloudSpace — Облачное файловое хранилище (Монолитная архитектура)

Веб-приложение для управления личными и командными файловыми хранилищами, разработанное в рамках дипломного проекта. Проект реализован в виде монолита: клиентская часть на React компилируется в статический пакет и интегрируется непосредственно в экосистему веб-сервера Django. Приложение разворачивается на едином хосте, управляется через WSGI-сервер Gunicorn (Unix-сокет) и проксируется через веб-сервер Nginx.

---

## 📂 Детальная структура папок и файлов проекта

```text
diploma_cloud/
├── backend/                        # СЕРВЕРНАЯ ЧАСТЬ (Django)
│   ├── core/                       # Папка главной конфигурации проекта
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py             # Настройки статики React, .env и логирования
│   │   ├── urls.py                 # Корневой роутинг (TemplateView для React SPA)
│   │   └── wsgi.py
│   ├── apps/                       # Изолированная директория приложений бэкенда
│   │   ├── authentication/         # Приложение авторизации и контроля учетных записей
│   │   │   ├── apps.py
│   │   │   ├── models.py           # Кастомная модель CustomUser (модель пользователей)
│   │   │   ├── urls.py             # Маршруты (/api/register/, /api/login/, /api/users/)
│   │   │   └── views.py            # Логика токенов, ролей и списков пользователей
│   │   └── storage/                # Приложение файлового хранилища
│   │       ├── apps.py
│   │       ├── models.py           # Модель UserFile (UUID, пути, метаданные, share_token)
│   │       ├── urls.py             # Файловые операции (/api/files/...)
│   │       └── views.py            # Логика CRUD, скачивания, стриминга и прав доступа
│   ├── media/                      # Хранилище физических файлов на диске (по ТЗ)
│   │   └── user_storages/          # Динамические изолированные папки пользователей
│   ├── .env                        # Секретные переменные окружения и СУБД (не для Git)
│   ├── db.sqlite3                  # Локальная реляционная база данных SQLite
│   └── manage.py                   # Системный скрипт управления Django
│
├── frontend/                       # КЛИЕНТСКАЯ ЧАСТЬ (React + Vite)
│   ├── src/
│   │   ├── components/             # Модульные компоненты интерфейса SPA
│   │   │   ├── MainPage.jsx        # Гостевой экран приветствия
│   │   │   ├── RegisterPage.jsx    # Регистрация с RegEx валидацией (без лишних логов)
│   │   │   ├── LoginPage.jsx       # Авторизация по заголовкам X-User-Id
│   │   │   ├── UsersTable.jsx      # Админ-панель управления пользователями
│   │   │   └── Dashboard.jsx       # Полноэкранная рабочая область и шапка (Header)
│   │   ├── App.css                 # Общие CSS-стили лейаутов и кнопок
│   │   ├── App.jsx                 # Корневой компонент (Глобальный стейт localStorage)
│   │   └── main.jsx                # Точка монтирования React в DOM
│   ├── dist/                       # Папка готовой компиляции фронтенда (создается при build)
│   │   ├── assets/                 # Скомпилированные минифицированные JS и CSS файлы
│   │   └── index.html              # Точка входа SPA, считываемая шаблонизатором Django
│   ├── index.html                  # HTML-шаблон разработки
│   ├── vite.config.js              # Конфигурация Vite (настройка базового пути /assets/)
│   └── package.json                # Зависимости и скрипты сборки клиента
│
└── README.md                       # Данная техническая документация проекта
```

---

## 🛠️ Архитектурные особенности и требования ТЗ

### 1. Безопасность и хранение данных
* **Изоляция коллизий (UUID)**: Файлы на диске сервера сохраняются под уникальными случайными именами `UUID` внутри изолированных папок формата `user_<username>`. Исходные названия хранятся в БД и возвращаются пользователю в заголовке `Content-Disposition` при скачивании.
* **Параметризация среды (`.env`)**: Конфиденциальные данные (`SECRET_KEY`, `DEBUG`, параметры СУБД) полностью вынесены в переменные среды. Базовая папка настраивается через параметр `CLOUD_STORAGE_DIR_NAME`.
* **Обезличенные ссылки**: Публичные ссылки шаринга генерируются на базе криптографически стойких токенов случайной длины. Они скрывают имена пользователей, пути к дискам и оригинальные имена файлов от внешнего веба.
* **Адаптивный ответ сервера**: Файлы, поддерживаемые браузером (картинки, PDF, тексты), открываются по ссылке `inline` во весь экран внутри защищенного изолированного фрейма `iframe` (директива `SAMEORIGIN`). Архивы и документы автоматически скачиваются в режиме `attachment`.

### 2. Логирование сервера
Бэкенд ведет непрерывное логирование ключевых событий сервера через встроенный модуль `logging`. Сообщения категорий `DEBUG`, `INFO`, `WARNING`, `ERROR` выводятся в консоль выполнения с указанием даты, времени, модуля и контекста выполняемой операции.

---

## 🚀 Инструкция по развёртыванию и запуску на сервере Ubuntu (Reg.ru)

Руководство предназначено для системных администраторов и DevOps-специалистов. Все команды выполняются в терминале сервера через SSH-сессию.

### Шаг 1. Подготовка ОС, обновление пакетов и создание пользователя
1. Подключитесь к серверу под учетной записью `root` и выполните полное обновление списка пакетов и установленных компонентов ОС до актуальных версий:
   ```bash
   apt update && apt upgrade -y
   ```
2. Создайте в системе нового изолированного пользователя `kirill` для безопасного запуска веб-приложения:
   ```bash
   adduser kirill
   ```
   *Задайте надежный пароль пользователя и заполните личные данные по желанию.*
3. Добавьте созданного пользователя в группу `sudo`, чтобы вы могли выполнять административные команды:
   ```bash
   usermod -aG sudo kirill
   ```
4. Переключитесь в сессию созданного пользователя и перейдите в его домашнюю директорию:
   ```bash
   su - kirill
   cd /home/kirill
   ```

### Шаг 2. Установка среды Python 3
1. Обновите индекс пакетов репозиториев для пользователя `kirill` перед установкой:
   ```bash
   sudo apt update
   ```
2. Установите интерпретатор Python 3, менеджер пакетов pip и необходимые системные библиотеки для сборки зависимостей:
   ```bash
   sudo apt install python3 python3-pip python3-dev build-essential -y
   ```
3. Убедитесь, что установка прошла успешно, проверив версии компонентов:
   ```bash
   python3 --version
   pip3 --version
   ```

### Шаг 3. Клонирование репозитория проекта
Склонируйте исходный код проекта из удаленного репозитория GitHub в домашний каталог пользователя:
```bash
git clone https://github.com
cd diploma_cloud
```

### Шаг 4. Развёртывание и настройка базы данных PostgreSQL
1. Установите СУБД PostgreSQL и клиентские библиотеки для связи с Python:
   ```bash
   sudo apt install postgresql postgresql-contrib libpq-dev -y
   ```
2. Подключитесь к системной консоли СУБД PostgreSQL от имени администратора СУБД:
   ```bash
   sudo -i -u postgres psql
   ```
3. Задайте пароль для главного системного пользователя `postgres`:
   ```sql
   ALTER USER postgres PASSWORD 'ваш_надежный_пароль_бд';
   ```
4. Создайте новую выделенную базу данных для облачного хранилища:
   ```sql
   CREATE DATABASE cloud_space_db;
   ```
5. Завершите сессию работы с консолью PostgreSQL и вернитесь в среду Bash:
   ```sql
   \q
   exit
   ```

### Шаг 5. Создание конфигурационного файла `.env`
В папке `backend/` необходимо создать локальный файл `.env` для безопасного хранения секретных ключей приложения и раздельных параметров доступа к СУБД PostgreSQL.
```bash
nano backend/.env
```
Вставьте следующие параметры конфигурации, адаптировав их под параметры вашего сервера:
```env
SECRET_KEY=django-insecure-super-secret-key-for-production-2026
DEBUG=False
ALLOWED_HOSTS=127.0.0.1,localhost,80.78.244.116,mycloudspace.ru
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://80.78.244.116

# Раздельные параметры СУБД PostgreSQL
DB_NAME=cloud_space_db
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=ваш_надежный_пароль_бд

# Параметры папки хранилища
CLOUD_STORAGE_DIR_NAME=user_storages
```
*Нажмите `Ctrl+O`, затем `Enter` для сохранения файла и `Ctrl+X` для выхода из текстового редактора nano.*

### Шаг 6. Установка Node.js и сборка фронтенда (на сервере)
1. Установите среду выполнения Node.js и пакетный менеджер `npm` на сервер:
   ```bash
   sudo apt install nodejs npm -y
   ```
2. Перейдите в каталог клиентской части и разверните необходимые Node-зависимости:
   ```bash
   cd frontend
   npm install
   ```
3. Выполните компиляцию и оптимизацию продакшен-пакета фронтенда по месту развёртывания:
   ```bash
   npm run build
   ```
   *Сборщик Vite сгенерирует статичные минимизированные ресурсы в папку `dist/`, настроив пути к ним через префикс `/assets/`.*

### Шаг 7. Настройка виртуального окружения Python и миграции Django
1. Вернитесь в директорию бэкенда, установите утилиту виртуальных окружений `venv` и разверните её:
   ```bash
   cd ../backend
   sudo apt install python3-venv -y
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Установите все зависимости бэкенда из файла манифеста (пакеты `django-environ`, `psycopg2-binary` и `gunicorn` будут развёрнуты автоматически на данном этапе):
   ```bash 
   pip install -r requirements.txt    
   ```
3. Примените и выполните миграции структуры таблиц в базу данных PostgreSQL:
   ```bash 
   python manage.py makemigrations authentication storage 
   python manage.py migrate    
   ```
4. Создайте учетную запись главного администратора системы (суперпользователя):   
    ```bash 
    python manage.py createsuperuser
    ```    
### Шаг 8. Настройка и запуск продакшен-серверов (Nginx + Gunicorn)
1. **Процесс Gunicorn (WSGI)**: Запустите процесс Gunicorn, обслуживающий unix-сокет `project.sock` в фоновом режиме с явным сбросом runtime-переменных окружения:   
```bash 
env XDG_RUNTIME_DIR="" HOME=/home/kirill gunicorn core.wsgi:application --bind unix:/home/kirill/diploma_cloud/backend/core/project.sock --workers 3 --timeout 120 
```   
2. **Веб-сервер Nginx**: Установите веб-сервер и настройте конфигурацию виртуального хоста в системном файле /etc/nginx/sites-available/my-project:   
```bash 
sudo apt update && sudo apt install nginx -y 
sudo nano /etc/nginx/sites-available/my-project    
```
Вставьте конфигурацию, обеспечивающую правильную раздачу путей и проксирование сокета:   
```nginx
server {
    include /etc/nginx/mime.types;
    listen 80;
    server_name 80.78.244.116;
    
    client_max_body_size 100M; # Снято ограничение в 1МБ для поддержки загрузки больших файлов
    
    location / {root /home/kirill/diploma_cloud/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;}
    
    location /api/ {proxy_pass http://unix:/home/kirill/diploma_cloud/backend/core/project.sock;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;}}  
 ```
3. Свяжите конфигурационный файл символической ссылкой, деактивируйте дефолтную страницу, примените права доступа на папки (чтобы Nginx (`www-data`) имел доступ к домашнему каталогу) и перезапустите веб-сервер:   
```bash
sudo ln -s /etc/nginx/sites-available/my-project /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```
## Выдача прав доступа для Nginx к статике и сокету проекта
```bash
sudo chmod 755 /home/kirill
sudo chmod 755 /home/kirill/diploma_cloud
sudo chmod -R 755 /home/kirill/diploma_cloud/frontend/dist
sudo chown -R kirill:www-data /home/kirill/diploma_cloud/backend/media/
sudo chmod -R 775 /home/kirill/diploma_cloud/backend/media/
sudo chown kirill:www-data /home/kirill/diploma_cloud/backend/core/project.sock
sudo chmod 660 /home/kirill/diploma_cloud/backend/core/project.sock
```
## Проверка и перезапуск веб-сервера 
```bash
sudo nginx -t && 
sudo systemctl restart nginx && 
sudo systemctl enable nginx   
```
## 🧪 Инструкция по верификации системы
1. Откройте веб-браузер по сетевому адресу: http://80.78.244.
2. **Валидация хранилища**: Загрузите файл размером > 1 МБ (например, видео или архив 15 МБ). Убедитесь, что расширенный лимит Nginx 100M успешно пропускает трафик, а кастомный логгер сервера фиксирует событие в консоли.
3. **Адаптивный просмотр**: Нажмите кнопку «Просмотр» на изображении или текстовом файле — документ откроется во весь экран внутри защищенного изолированного фрейма iframe (директива SAMEORIGIN), полностью скрывая физический UUID-путь файла из адресной строки браузера.