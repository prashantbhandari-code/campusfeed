"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiOutlineArrowLeft, HiOutlineCheck, HiOutlineExclamationCircle } from "react-icons/hi2";

/**
 * Teacher grading screen: one row per enrolled student, three editable columns
 * (internal / mid-sem / end-sem). Saves per student so a long roster can be
 * filled in without one giant submit.
 */

type ExamType = "internal" | "mid_sem" | "end_sem";

interface StudentRow {
  id: string;
  name: string;
  username: string;
  rollNumber: string | null;
  section: string | null;
  role: string;
  marks: Partial<Record<ExamType, { score: number; maxScore: number; comment: string | null }>>;
}

const COLUMNS: { key: ExamType; label: string; max: number }[] = [
  { key: "internal", label: "Internal", max: 30 },
  { key: "mid_sem", label: "Mid Sem", max: 30 },
  { key: "end_sem", label: "End Sem", max: 100 },
];

export default function MarksPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;
  const router = useRouter();

  const [course, setCourse] = useState<{ name: string; code: string } | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  // Unsaved edits: `${studentId}:${examType}` -> string
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/marks?courseId=${courseId}`);
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Could not load the roster.");
        return;
      }
      setCourse(json.course);
      setStudents(json.students || []);
    } catch {
      setError("Could not load the roster.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const cellValue = (s: StudentRow, examType: ExamType) => {
    const key = `${s.id}:${examType}`;
    if (key in edits) return edits[key];
    const stored = s.marks[examType];
    return stored ? String(stored.score) : "";
  };

  const setCell = (s: StudentRow, examType: ExamType, value: string) =>
    setEdits((prev) => ({ ...prev, [`${s.id}:${examType}`]: value }));

  const saveStudent = async (s: StudentRow) => {
    setSaving(s.id);
    const saved: ExamType[] = [];
    try {
      for (const col of COLUMNS) {
        const raw = cellValue(s, col.key).trim();
        if (raw === "") continue;
        const score = Number(raw);
        if (!Number.isFinite(score)) continue;
        if (score > col.max) {
          toast.error(`${col.label} for ${s.name} is above ${col.max}`);
          return;
        }
        const res = await fetch("/api/marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            studentId: s.id,
            examType: col.key,
            score,
            maxScore: col.max,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.error || `Could not save ${col.label}`);
          return;
        }
        saved.push(col.key);
      }
      if (saved.length === 0) {
        toast.error("Nothing to save");
        return;
      }
      // Reflect saved values locally and drop the pending edits.
      setStudents((prev) =>
        prev.map((row) => {
          if (row.id !== s.id) return row;
          const next = { ...row, marks: { ...row.marks } };
          for (const key of saved) {
            next.marks[key] = {
              score: Number(cellValue(s, key)),
              maxScore: COLUMNS.find((c) => c.key === key)!.max,
              comment: null,
            };
          }
          return next;
        })
      );
      setEdits((prev) => {
        const next = { ...prev };
        for (const key of saved) delete next[`${s.id}:${key}`];
        return next;
      });
      toast.success(`Saved ${saved.length} mark${saved.length === 1 ? "" : "s"} for ${s.name}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
        >
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            Marks {course ? `· ${course.code}` : ""}
          </h1>
          <p className="text-xs text-gray-400 truncate">{course?.name ?? "Loading…"}</p>
        </div>
      </div>

      {loading && <div className="glass-card rounded-2xl h-40 animate-pulse" />}

      {!loading && forbidden && (
        <div className="glass-card rounded-2xl p-5 flex items-start gap-3">
          <HiOutlineExclamationCircle className="text-xl text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Only the course teacher can grade</p>
            <p className="text-xs text-gray-500 mt-1">Ask the teacher who created this course for access.</p>
          </div>
        </div>
      )}

      {!loading && error && <div className="glass-card rounded-2xl p-5 text-sm text-gray-500">{error}</div>}

      {!loading && !forbidden && !error && (
        <>
          {students.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 text-center text-sm text-gray-500">
              No students are enrolled in this course yet, so there is nothing to grade.
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_58px_58px_58px_64px] gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06] text-[10px] uppercase tracking-wide text-gray-400">
                <span>Student</span>
                {COLUMNS.map((c) => (
                  <span key={c.key} className="text-center">{c.label}</span>
                ))}
                <span />
              </div>

              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {students.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1fr_58px_58px_58px_64px] gap-2 px-3 py-2.5 items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {s.rollNumber ? `#${s.rollNumber}` : "@" + s.username}
                        {s.section ? ` · ${s.section}` : ""}
                      </p>
                    </div>

                    {COLUMNS.map((c) => (
                      <input
                        key={c.key}
                        inputMode="numeric"
                        aria-label={`${c.label} for ${s.name}`}
                        placeholder="—"
                        value={cellValue(s, c.key)}
                        onChange={(e) => setCell(s, c.key, e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full text-center text-sm py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-transparent focus:border-primary-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    ))}

                    <button
                      onClick={() => saveStudent(s)}
                      disabled={saving === s.id}
                      className="text-[11px] font-medium py-1.5 rounded-lg bg-primary-500 text-white disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {saving === s.id ? "…" : <><HiOutlineCheck /> Save</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-3 px-1">
            Max scores are Internal 30, Mid Sem 30, End Sem 100. Re-saving a column corrects it.
          </p>
        </>
      )}
    </div>
  );
}
