import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'fallback_secret_min_32_chars_long!!',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
} as const;

export default config;
