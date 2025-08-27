import dotenv from "dotenv";
import express from "express";
import pino from "pino";
import Redis from "ioredis";

dotenv.config();
const PORT = process.env.SINK_PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SINK_RETURN_ERROR = process.env.SINK_RETURN_ERROR === "true";

const redis = new Redis(REDIS_URL);

const logger = pino({
  level: process.env.LOG_LEVEL || "debug",
});
const app = express();

app.use(express.json());

app.get("/sink/health", (_, res) => res.json({ ok: true }));

app.post("/sink/webhook", async (req, res) => {
  if (SINK_RETURN_ERROR) {
    return res.status(500).json({
      message: "Simulated 500 Status",
    });
  }

  const idempotencyKey = req.header("X-Idempotency-Key");

  if (!idempotencyKey) {
    return res.status(400).json({
      message: "Missing X-Idempotency-Key header",
    });
  }

  try {
    //SETNX key 1 EX 86400: Set if not exists, expire in 1 day
    const isAlreadySet = await redis.set(
      idempotencyKey,
      "1",
      "EX",
      86400,
      "NX"
    );

    if (!isAlreadySet) {
      // Already processed — idempotency hit
      logger.info(`[SINK] Duplicate delivery ignored. Key=${idempotencyKey}`);
      return res.status(200).json({
        isDuplicate: true,
        message: "Duplicate Entry",
      });
    }

    logger.info(`[SINK] New delivery: %o`, req.body);

    return res.status(200).json({
      isDuplicate: false,
      message: "First time hit",
    });
  } catch (error: any) {
    logger.error("[SINK] Redis error: %o", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  logger.info(`Sink service running on port ${PORT}`);
});
