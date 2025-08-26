import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { motion } from "framer-motion";
import api from "./services/apiService";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

type Note = {
  _id: string;
  title: string;
  body: string;
  releaseAt: string;
  webhookUrl: string;
  status: string;
  attempts: Array<Attempt>;
};

type Attempt = {
  at: Date;
  statusCode: number;
  ok: boolean;
  error?: string;
};

type NoteInput = Omit<Note, "_id" | "status" | "attempts">;
const DEFAULT_PAGE_SIZE = 20;

export default function App() {
  const { reset } = useForm<Note>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [deliveredIds, setDeliveredIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get(
        `/notes?status=${statusFilter}&page=${pageIndex + 1}`
      );
      setNotes(res.data.data);
      setTotalPages(res.data.totalPages);
      setDeliveredIds([]);
    } catch (error) {
      console.log({ error });
    }
  }, [statusFilter, pageIndex]);

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, fetchNotes]);

  // Create new note
  const onSubmit = async (data: NoteInput) => {
    try {
      await api.post(`/notes`, {
        ...data,
        status: "pending",
        attempts: [],
        deliveredAt: null,
      });
      toast.success("Note created successfully");
      reset();
    } catch (error) {
      console.log({ error });
      toast.error(`Failed to create note`);
    }
  };

  const allowedReplayStatuses = ["dead", "failed"];
  // Compute last attempt code helper
  const getLastAttempt = (attempts: Attempt[]) => {
    if (attempts.length === 0) return null;
    return attempts.reduce((latest, attempt) =>
      new Date(attempt.at) > new Date(latest.at) ? attempt : latest
    );
  };

  // Replay handler
  const onReplay = async (id: string, status: string) => {
    if (!allowedReplayStatuses.includes(status)) return;
    try {
      await api.post(`/notes/${id}/replay`);
      toast.success("Note replay requested");
      fetchNotes();
    } catch {
      toast.error("Failed to replay note");
    }
  };

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<Note>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
      },
      {
        accessorKey: "body",
        header: "Body",
        cell: ({ row }) => {
          const text = row.original.body || "";
          const trimmed = text.length > 200 ? text.slice(0, 200) + "…" : text;
          return <span title={text}>{trimmed}</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "releaseAt",
        header: "Released At",
        cell: ({ row }) => {
          const readable = dayjs(row.original.releaseAt).format(
            "MMMM D, YYYY h:mm A"
          );
          return <>{readable ?? "-"}</>;
        },
      },
      {
        id: "lastAttemptCode",
        header: "Last Attempt",
        cell: ({ row }) => {
          const attempts: Attempt[] = row.original.attempts;
          const lastAttempt = getLastAttempt(attempts);
          const code = lastAttempt?.statusCode;
          const time = dayjs(lastAttempt?.at).format("MMMM D, YYYY h:mm A");
          const val = !lastAttempt ? "No Attempts Made" : `${code} - ${time}`;
          return <>{val ?? "-"}</>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const note = row.original;
          const allowedReplayStatuses = ["dead", "failed"];
          const canReplay = allowedReplayStatuses.includes(note.status);
          return (
            <div>
              <button
                disabled={!canReplay}
                onClick={() => onReplay(note._id, note.status)}
                className={`px-2 py-1 rounded text-white ${
                  canReplay ? "bg-gray-500" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Replay
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  // Build table instance
  const table = useReactTable({
    data: notes,
    columns,
    state: {
      pagination: { pageIndex, pageSize: DEFAULT_PAGE_SIZE }, // pageSize fixed if needed
    },
    pageCount: totalPages,
    manualPagination: true,
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize: DEFAULT_PAGE_SIZE })
          : updater;
      setPageIndex(newState.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <ToastContainer />
      <h1 className="primary">Notes Admin</h1>

      {/* Create Form */}
      <CreateNoteForm onCreate={onSubmit} />

      <div className="table-section">
        <div className="filter-wrapper">
          <label htmlFor="statusFilter">Filter by Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="dead">Dead</option>
            <option value="all">All</option>
          </select>
        </div>

        <table className="table-wrapper">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const note = row.original;
              const isDelivered = note.status === "delivered";
              return (
                <motion.tr
                  key={row.id}
                  initial={{ backgroundColor: "#fff" }}
                  animate={
                    isDelivered && !deliveredIds.includes(note._id)
                      ? { backgroundColor: ["var(--base-color)", "#fff"] }
                      : {}
                  }
                  transition={{ duration: 1.2 }}
                  onAnimationComplete={() => {
                    if (!deliveredIds.includes(note._id)) {
                      setDeliveredIds((prev) => [...prev, note._id]);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </motion.tr>
              );
            })}
            <tbody className="table-footer">
              <div className="pagination-wrapper">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  {"<<"}
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  {"<"}
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  {">"}
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  {">>"}
                </button>
              </div>

              <div>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
            </tbody>
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CreateNoteFormType = {
  onCreate: (data: NoteInput) => Promise<void>;
};

function CreateNoteForm({ onCreate }: CreateNoteFormType) {
  const { register, handleSubmit } = useForm<NoteInput>();

  const defaultWebhookUrl = "http://localhost:4000/sink/webhook";

  const onSubmit: SubmitHandler<NoteInput> = async (data) => {
    await onCreate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Title</label>
        <input {...register("title", { required: true })} />
      </div>
      <div className="textarea-wrapper">
        <label>Body</label>
        <textarea {...register("body", { required: true })} />
      </div>
      <div>
        <label>Release At (ISO)</label>
        <input
          {...register("releaseAt", { required: true })}
          type="datetime-local"
        />
      </div>
      <div>
        <label>Webhook URL</label>
        <input value={defaultWebhookUrl} readOnly {...register("webhookUrl")} />
      </div>
      <button type="submit">Create Note</button>
    </form>
  );
}
