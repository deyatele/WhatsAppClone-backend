import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // База данных
  DATABASE_URL: Joi.string().required(),

  // Приложение
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // TURN-сервер
  TURN_PROVIDER_URL: Joi.string().uri().required(),

  // CORS
  FRONTEND_URL: Joi.string()
    .pattern(/^(https?:\/\/[^\s,]+)(\s*,\s*https?:\/\/[^\s,]+)*$/)
    .optional()
    .default('https://localhost:3000')
    .messages({
      'string.pattern.base':
        'FRONTEND_URL must contain valid HTTP/HTTPS URLs separated by commas or spaces',
    }),

  // SSL (опционально)
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CERT_PATH: Joi.string().optional(),
});
