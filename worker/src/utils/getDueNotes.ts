import { Note } from "../models/Note";

export const getDueNotes = async () => {
  return await Note.find({
    releaseAt: { $lte: Date.now() },
    status: "pending",
  });
};
