import dotenv from "dotenv";
import express from "express";
import pino from "pino";

dotenv.config();
const PORT = process.env.SINK_PORT || 4000;


const logger = pino();
const app = express();

app.use(express.json());

app.post("/webhook", (req, res) => {
    logger.info("Webhook received: %o", req.body);
    res.status(200).send("ok");
})

app.listen(PORT, () => {
    logger.info(`Sink service running on port ${PORT}`)
})