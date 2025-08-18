import { Router } from "express";
import {
  getPaginatedNotes,
  createNote,
  replayNote,
} from "../controllers/notes";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

//POST, GET /api/notes
router.route("/").get(getPaginatedNotes).post(createNote);

// POST /api/notes/:id/replay
router.route("/:id/replay").post(replayNote);

export default router;
