# WhatsApp Clone Backend

## Описание

Этот проект представляет собой бэкенд для клона WhatsApp, созданный с использованием NestJS, Prisma и Socket.IO. Он обеспечивает основной функционал, необходимый для чат-приложения в реальном времени, включая аутентификацию пользователей, управление контактами, обмен сообщениями и видеозвонки.

## Функционал

*   Аутентификация пользователей (регистрация, вход) с использованием JWT.
*   Управление контактами.
*   Обмен текстовыми сообщениями в реальном времени.
*   Видеозвонки (WebRTC).
*   Обновление статуса пользователя (онлайн/офлайн).

## Технологии

*   **Бэкенд:**
    *   [NestJS](https://nestjs.com/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Prisma](https://www.prisma.io/) (ORM)
    *   [PostgreSQL](https://www.postgresql.org/) (база данных)
    *   [Socket.IO](https://socket.io/) (WebSockets)
    *   [Swagger](https://swagger.io/) (документация API)
*   **Фронтенд (тестовый клиент):**
    *   HTML, CSS, JavaScript

## Начало работы

### Требования

*   Node.js
*   npm
*   PostgreSQL

### Установка

1.  Клонируйте репозиторий:
    ```bash
    git clone https://github.com/your-username/whatsapp-clone-backend.git
    cd whatsapp-clone-backend
    ```
2.  Установите зависимости:
    ```bash
    npm install
    ```
3.  Настройте базу данных:
    *   Создайте файл `.env` в корне проекта.
    *   Добавьте переменную окружения `DATABASE_URL` в файл `.env`:
        ```
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
        ```
    *   Выполните миграции базы данных:
        ```bash
        npm run pm
        ```

### Запуск приложения

*   **Режим разработки:**
    ```bash
    npm run dev
    ```
    Это запустит сервер в режиме разработки с автоматической перезагрузкой.

*   **Продакшн режим:**
    ```bash
    npm run build
    npm start
    ```

## Документация API

Документация API доступна по адресу `/docs` при запущенном приложении.

## Структура проекта

```
├── prisma/
│   └── schema.prisma       # Схема базы данных
├── public/                 # Статические файлы для тестового клиента
├── src/
│   ├── auth/               # Модуль аутентификации
│   ├── calls/              # Модуль звонков
│   ├── chats/              # Модуль чатов
│   ├── contacts/           # Модуль контактов
│   ├── gateway/            # Модуль WebSocket
│   ├── keys/               # Модуль ключей шифрования
│   ├── messages/           # Модуль сообщений
│   ├── prisma/             # Модуль Prisma
│   ├── turn-credentials/   # Модуль TURN-сервера
│   ├── users/              # Модуль пользователей
│   ├── app.module.ts       # Корневой модуль приложения
│   └── main.ts             # Точка входа в приложение
├── .eslintrc.js            # Конфигурация ESLint
├── package.json            # Зависимости и скрипты
└── tsconfig.json           # Конфигурация TypeScript
```

## Использование сервера клиентским приложением

### 1. Аутентификация

Клиентское приложение должно сначала аутентифицировать пользователя, чтобы получить `accessToken`.

*   **Регистрация:** `POST /auth/register` с `phone` и `password`.
*   **Вход:** `POST /auth/login` с `identifier` (может быть `phone` или `email`) и `password`.

В ответ на успешный вход сервер вернет `accessToken` и `refreshToken`. `accessToken` должен использоваться для аутентификации на защищенных эндпоинтах и при подключении к WebSocket.

### 2. WebSocket соединение

Клиент должен установить WebSocket соединение с сервером, передав `accessToken` в `auth.token` при подключении.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { // Замените на ваш URL сервера
  auth: {
    token: 'ваш_accessToken'
  }
});

socket.on('connect', () => {
  console.log('Успешное подключение к WebSocket');
});

socket.on('ошибка', (error) => {
  console.error('Ошибка WebSocket:', error);
});
```

### 3. Обмен сообщениями

*   **Отправка сообщения:**
    *   Событие: `message:send`
    *   Данные: `{ chatId: string, encryptedPayload: string }`
*   **Получение нового сообщения:**
    *   Событие: `message:new`
    *   Данные: `{ id, content, deletedSender, deletedReceiver, createdAt, updatedAt, chatId, senderId }`
*   **Удаление сообщения:**
    *   Событие: `message:delete`
    *   Данные: `{ messageId: string, flag?: boolean }`
*   **Сообщение удалено:**
    *   Событие: `message:deleted`
    *   Данные: `{ id, content, deletedSender, deletedReceiver, createdAt, updatedAt, chatId, senderId }`

### 4. Звонки (WebRTC)

Сервер используется для сигнализации (обмена метаданными) между клиентами.

*   **Начать звонок:**
    *   Событие: `call:start`
    *   Данные: `{ to: string, sdp: any }`
*   **Входящий звонок:**
    *   Событие: `call:incoming`
    *   Данные: `{ ...call, sdp: any, from: string, callId: string }`
*   **Принять звонок:**
    *   Событие: `call:accept`
    *   Данные: `{ callId: string, sdp: any }`
*   **Звонок принят:**
    *   Событие: `call:accepted`
    *   Данные: `{ ...updated, sdp: any, from: string }`
*   **Отклонить звонок:**
    *   Событие: `call:reject`
    *   Данные: `{ callId: string }`
*   **Звонок отклонен:**
    *   Событие: `call:rejected`
    *   Данные: `updated`
*   **Завершить звонок:**
    *   Событие: `call:end`
    *   Данные: `{ callId: string }`
*   **Звонок завершен:**
    *   Событие: `call:ended`
    *   Данные: `ended`

**WebRTC сигнализация:**

*   `call:offer`: Отправка/получение SDP offer.
*   `call:answer`: Отправка/получение SDP answer.
*   `call:candidate`: Отправка/получение ICE candidate.

### 5. REST API

В дополнение к WebSocket, сервер предоставляет REST API для управления данными. Все защищенные эндпоинты требуют `Bearer` токен в заголовке `Authorization`.

*   `GET /users/me`: Получить информацию о текущем пользователе.
*   `PATCH /users/me`: Обновить информацию о текущем пользователе.
*   `GET /contacts`: Получить список контактов.
*   `POST /contacts`: Добавить новый контакт.
*   `GET /chats/my`: Получить список чатов пользователя.
*   `POST /chats`: Создать новый чат.
*   `GET /messages/chat/:chatId`: Получить сообщения чата.
*   `GET /calls`: Получить историю звонков.

Для получения полного списка эндпоинтов и их параметров, обратитесь к Swagger документации по адресу `/docs`.