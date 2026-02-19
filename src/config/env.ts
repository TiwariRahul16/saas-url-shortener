import dotenv from "dotenv";

dotenv.config();

function getEnvVariable(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 5000,
  DATABASE_URL: getEnvVariable("DATABASE_URL"),
  JWT_ACCESS_SECRET: getEnvVariable("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getEnvVariable("JWT_REFRESH_SECRET"),
  REDIS_URL: getEnvVariable("REDIS_URL"),
};
