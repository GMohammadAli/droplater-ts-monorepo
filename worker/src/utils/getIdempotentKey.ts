import crypto from "crypto";

export const getIdempotentKey = (noteId: string, releaseAt: string) => {
  return crypto
    .createHash("sha256")
    .update(noteId + releaseAt)
    .digest("hex");
};
