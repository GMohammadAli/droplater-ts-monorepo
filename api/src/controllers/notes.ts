import { Request, Response } from "express";
import pino from "pino";
import {
  CreateNoteInput,
  createNoteSchema,
  FetchPaginatedNotesInput,
  fetchPaginatedNotesSchema,
  ReplayNoteInput,
  replayNoteSchema,
} from "../validations/notes";
import { Note, NoteDocument } from "../models/Note";
import dotenv from "dotenv";

dotenv.config();
const logger = pino({
  level: process.env.LOG_LEVEL || "debug",
});
const DEFAULT_NOTES_PER_PAGE = 20;

export const createNote = async (req: Request, res: Response) => {
  try {
    const parsed = createNoteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        errors: parsed.error,
      });
    }

    const note: CreateNoteInput = parsed.data;

    const newNote: NoteDocument = new Note(note);
    await newNote.save();

    return res.status(201).json({
      message: "Note created Successfully",
      id: newNote.id,
    });
  } catch (error: any) {
    logger.error("Error while creating a note %o", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getPaginatedNotes = async (req: Request, res: Response) => {
  try {
    logger.debug("Req query received: %o", req.query);
    const parsed = fetchPaginatedNotesSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        errors: parsed.error,
      });
    }

    const reqQuery: FetchPaginatedNotesInput = parsed.data;
    const { page, status } = reqQuery;
    const notesPerPage = DEFAULT_NOTES_PER_PAGE;

    const skip = (page - 1) * notesPerPage;
    const filter = status === "all" ? {} : { status };

    const notes: Array<NoteDocument> = await Note.find(filter)
      .sort({ releaseAt: 1 })
      .skip(skip)
      .limit(notesPerPage);

    const total = await Note.countDocuments(filter);

    logger.debug(`Total Notes found are ${total}`);

    res.status(200).json({
      data: notes,
      pagination: {
        total: total,
        page,
        notesPerPage,
        totalPages: Math.ceil(total / notesPerPage),
      },
    });
  } catch (error: any) {
    logger.error("Error while fetching notes %o", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const replayNote = async (req: Request, res: Response) => {
  try {
    const parsed = replayNoteSchema.safeParse(req.params);

    if (!parsed.success) {
      return res.status(400).json({
        errors: parsed.error,
      });
    }

    const { id }: ReplayNoteInput = parsed.data;

    const note: NoteDocument | null = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const { status } = note;
    if (status !== "failed" && status !== "dead") {
      return res.status(400).json({
        message: "Only dead or failed notes could be replayed",
      });
    }

    note.status = "pending";
    note.deliveredAt = null;
    note.attempts = [];
    await note.save();

    res.status(200).json({
      message: "Note requeued successfully!",
      id: note.id,
    });
  } catch (error: any) {
    logger.error("Error while replaying a note %o", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
