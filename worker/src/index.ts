import { Worker } from "bullmq";
import dotenv from "dotenv";
import pino from "pino";

dotenv.config();
const logger = pino();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const worker = new Worker("jobs", async job => {
    logger.info(`Processing job ${job.id} with data: ${JSON.stringify(job.data)}`)
},{
    connection: {url :REDIS_URL }
})

worker.on("completed", job => logger.info(`Job ${job.id} completed`))

worker.on("failed", (job, err) => logger.error(`Job ${job?.id} failed: ${err}`))