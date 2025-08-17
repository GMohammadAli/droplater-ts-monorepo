import { Document, model, Schema } from "mongoose";

interface Attempt {
    at: Date;
    statusCode: number;
    ok: boolean;
    error?: string;
}

export interface NoteDocument extends Document {
    title: string;
    body: string;
    releaseAt: Date;
    webhookUrl: string;
    status: "pending" | "delivered" | "failed" | "dead";
    attempts: Attempt[];
    deliveredAt: Date | null;
}

const attemptSchema = new Schema<Attempt>(
    {
        at: {type: Date, required: true},
        statusCode: {type: Number, required: true},
        ok: {type: Boolean, required: true},
        error: {type: String}
    },
    {_id: false}
)

const noteSchema = new Schema<NoteDocument>(
    {
        title: { type: String, required: true},
        body: { type: String, required: true},
        releaseAt: { type: Date, required: true},
        webhookUrl: {type: String, required: true},
        status: {
            type: String,
            enum: ["pending","delivered","failed","dead"],
            default: "pending"
        },
        attempts: {
            type: [attemptSchema], default: []
        },
        deliveredAt: { type: Date, default: null}
    },
    {
        timestamps: true
    }
)

//Indexes for efficient search, ascending order indexes
noteSchema.index({ releaseAt: 1});
noteSchema.index({status: 1})

export const Note = model<NoteDocument>("Note", noteSchema);