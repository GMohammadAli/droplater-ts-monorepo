import dotenv from "dotenv";
import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";
import pino from "pino";
import notesRouter from "./routes/notes";
import rateLimit from "express-rate-limit";
import cors from "cors";

dotenv.config();
const logger = pino({
  level: process.env.LOG_LEVEL || "debug",
});

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_DB_URL =
  process.env.MONGO_DB_URL || "mongodb://localhost:27017/note-delivery-service";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// allow only frontend, as deployment is not in scope
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

mongoose
  .connect(MONGO_DB_URL)
  .then(() => logger.info("Mongo DB Connected"))
  .catch((error) => logger.error(error));

const redis = new Redis(REDIS_URL);

redis.on("connect", () => logger.info("Redis Connected"));
redis.on("error", (err) => logger.error(err));

const limiter = rateLimit({
  windowMs: 60 * 1000, //resets limit after every minute
  max: 60, //limit upto 60 requests/windowMs
});

app.use(limiter);

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api/notes", notesRouter);

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});
