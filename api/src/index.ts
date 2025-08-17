import dotenv from 'dotenv';
import express from 'express';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import pino from 'pino';

dotenv.config();
const logger = pino();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_DB_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/api';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

app.use(express.json());

mongoose
  .connect(MONGO_DB_URL)
  .then(() => logger.info('Mongo DB Connected'))
  .catch((error) => logger.error(error));

const redis = new Redis(REDIS_URL);

redis.on('connect', () => logger.info('Redis Connected'));
redis.on('error', (err) => logger.error(err));

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});
