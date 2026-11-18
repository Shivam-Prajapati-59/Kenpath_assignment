require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: isTest
    ? process.env.TEST_DATABASE_URL || 'postgres://sweety:sweety@localhost:5432/sweety_test'
    : process.env.DATABASE_URL || 'postgres://sweety:sweety@localhost:5432/sweety',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
