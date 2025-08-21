import { Job, Queue, Worker } from "bullmq";
import dotenv from "dotenv";
import Redis from "ioredis";
import pino from "pino";
import { getDueNotes } from "./utils/getDueNotes";
import { Note, NoteDocument } from "./models/Note";
import { getIdempotentKey } from "./utils/getIdempotentKey";
import axios from "axios";
import mongoose from "mongoose";

dotenv.config();
const logger = pino({
  level: process.env.LOG_LEVEL || "debug",
});

const MONGO_DB_URL = process.env.MONGO_DB_URL || "mongodb://localhost:27017/";

mongoose
  .connect(MONGO_DB_URL)
  .then(() => logger.info("Mongo DB Connected"))
  .catch((error) => logger.error(error));

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  // other options as needed, e.g. password
});

const noteQueue = new Queue("note-delivery", {
  connection: redis,
});

const pollDueNotes = async () => {
  const dueNotes: Array<NoteDocument> = await getDueNotes();
  logger.info(`No. of Due Notes ${dueNotes.length || 0}`);
  for (const note of dueNotes) {
    await noteQueue.add(
      "deliver-note",
      {
        noteId: note.id,
      },
      { removeOnComplete: true, removeOnFail: false }
    );
  }
};

//Poll every 5 seconds
setInterval(pollDueNotes, 5000);

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAYS_MS = [1000, 5000, 25000];

const worker = new Worker(
  "note-delivery",
  async (job: Job) => {
    const note = await Note.findById(job.data.noteId);
    if (!note) throw new Error("Note not found");

    const idKey = getIdempotentKey(
      note.id.toString(),
      note.releaseAt.toString()
    );

    let attemptNumber = note.attempts?.length || 0;

    try {
      const resp = await axios.post(
        note.webhookUrl,
        {
          title: note.title,
          body: note.body,
          releaseAt: note.releaseAt,
        },
        {
          headers: {
            "X-Note-Id": note.id.toString(),
            "X-Idempotency-Key": idKey,
          },
          timeout: 5000,
        }
      );

      if (resp.status === 200) {
        note.status = "delivered";
        note.deliveredAt = new Date();
        note.attempts.push({
          at: new Date(),
          statusCode: resp.status,
          ok: true,
        });
        logger.debug("Note Delivered sucessfully:", note.id);
        await note.save();
      } else {
        throw new Error(`Bad status: ${resp.status}`);
      }
    } catch (error: any) {
      attemptNumber += 1;
      note.attempts.push({
        at: new Date(),
        statusCode: error.response?.status || 500,
        ok: false,
        error: error.message,
      });
      logger.debug(
        `Note Delivery failed for ${attemptNumber} attempt:`,
        note.id
      );
      if (attemptNumber < MAX_ATTEMPTS) {
        const delay = BACKOFF_DELAYS_MS[Math.min(attemptNumber - 1, 2)];
        logger.debug(`Note Enqueued again for retry attempt:`, note.id);
        await noteQueue.add("deliver-note", { noteId: note.id }, { delay });
      } else {
        note.status = "dead";
      }
      await note.save();
    }
  },
  { connection: redis }
);

process.on("SIGTERM", async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
});
