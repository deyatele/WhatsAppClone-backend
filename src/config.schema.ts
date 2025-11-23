import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // База данных
  DATABASE_URL: Joi.string().required(),

  // Приложение
  PORT: Joi.number().default(3000),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // TURN-сервер
  TURN_PROVIDER_URL: Joi.string().uri().required(),

  // SSL (опционально)
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CERT_PATH: Joi.string().optional(),
});
