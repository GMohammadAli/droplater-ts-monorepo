import dayjs from "dayjs";
import { Note } from "../models/Note";

export const getDueNotes = async () => {
  return await Note.find({
    releaseAt: { $lte: dayjs().toDate() },
    status: "pending",
  });
};
