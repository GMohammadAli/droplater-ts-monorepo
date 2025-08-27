import mongoose from "mongoose";
import dotenv from "dotenv";

const { Note } = require("../models/Note");

dotenv.config();

const connectToDb = async () => {
  const MONGO_DB_URL =
    process.env.MONGO_DB_URL ||
    "mongodb://localhost:27017/note-delivery-service";

  await mongoose
    .connect(MONGO_DB_URL)
    .then(() => console.log("Mongo DB Connected"))
    .catch((error) => console.error(error));
};

async function seed() {
  try {
    await connectToDb();

    // Generate 50 notes with numbered titles
    const exampleNotes = Array.from({ length: 50 }, (_, i) => ({
      title: `System Alert #${i + 1}`,
      body: "CPU usage is above threshold.",
      releaseAt: new Date(), // current date/time
      webhookUrl: "http://sink:4000/sink/webhook",
      status: "pending",
      attempts: [],
      deliveredAt: new Date("2025-08-26T11:34:53.066Z"),
      createdAt: new Date("2025-08-22T19:56:27.002Z"),
      updatedAt: new Date("2025-08-26T11:34:53.073Z"),
      __v: 1,
    }));

    // Insert generated notes
    const result = await Note.insertMany(exampleNotes);

    //@ts-ignore
    console.log(`Inserted ${result?.length} notes`);
  } catch (err) {
    console.error("Failed to seed data:", err);
  } finally {
    process.exit(0); // Exit the process explicitly when done
  }
}

seed();
