import dotenv from "dotenv";

dotenv.config();

function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`❌ Missing mandatory environment variable: ${key}`);
  }

  return value;
}

export const env = {
  // Application settings
  PORT: process.env.PORT ? Number(process.env.PORT) : 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Frontend URL for CORS (with a default for local dev)
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Secrets & Databases
  DATABASE_URL: getEnvVariable("DATABASE_URL"),
  JWT_ACCESS_SECRET: getEnvVariable("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getEnvVariable("JWT_REFRESH_SECRET"),
  REDIS_URL: getEnvVariable("REDIS_URL"),
};