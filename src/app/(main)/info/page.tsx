"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineUserCircle,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
  HiOutlineBookOpen,
  HiOutlineExclamationCircle,
  HiOutlineIdentification,
} from "react-icons/hi2";

/**
 * The Info tab doubles as the student's academic record: identity, subjects,
 * attendance per subject, exam marks (internal / mid-sem / end-sem) and
 * assignment status, plus the support links that used to be the whole page.
 *
 * Everything comes from one aggregated endpoint (/api/student/overview) because
 * fetching a roster per enrolled course is O(courses x roster) on this
 * connection-limited database.
 */

type MarkInfo = { score: number; maxScore: number; percentage: number; comment: string | null } | null;

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number | null;
  department: string | null;
  teacher: string | null;
  role: string;
  attendance: { present: number; absent: number; late: number; excused: number; total: number; percentage: number | null };
  marks: { internal: MarkInfo; mid_sem: MarkInfo; end_sem: MarkInfo };
  assignments: { id: string; title: string; dueDate: string | null; maxScore: number; submitted: boolean; status: string | null; score: number | null }[];
  assignmentsPending: number;
}

interface Overview {
  profile: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    rollNumber: string | null;
    section: string | null;
    currentSemester: number | null;
    department: string | null;
    batchYear: number | null;
    email: string;
    collegeEmail: string | null;
    phone: string | null;
  };
  subjects: Subject[];
  summary: {
    subjects: number;
    credits: number;
    attendancePercentage: number | null;
    assignmentsTotal: number;
    assignmentsPending: number;
    marksRecorded: number;
  };
}

const pctColour = (p: number | null) =>
  p === null ? "text-gray-400" : p >= 75 ? "text-emerald-500" : p >= 60 ? "text-amber-500" : "text-red-500";

const pctBar = (p: number | null) =>
  p === null ? "bg-gray-300 dark:bg-white/10" : p >= 75 ? "bg-emerald-500" : p >= 60 ? "bg-amber-500" : "bg-red-500";

const EXAM_LABELS: { key: "internal" | "mid_sem" | "end_sem"; label: string }[] = [
  { key: "internal", label: "Internal" },
  { key: "mid_sem", label: "Mid Sem" },
  { key: "end_sem", label: "End Sem" },
];

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {value === null || value === undefined || value === "" ? <span className="text-gray-400 dark:text-gray-600">Not set</span> : value}
      </p>
    </div>
  );
}

export default function InfoPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/overview");
        if (res.status === 401) {
          if (!cancelled) setError("Please sign in to see your academic record.");
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          if (res.ok) setData(json);
          else setError(json?.error || "Could not load your academic record.");
        }
      } catch {
        if (!cancelled) setError("Could not load your academic record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = data?.profile;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
        >
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <HiOutlineIdentification className="text-xl text-gray-900 dark:text-white" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Record</h1>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="glass-card rounded-2xl p-5 flex items-start gap-3">
          <HiOutlineExclamationCircle className="text-xl text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">{error}</p>
            <Link href="/login" className="text-xs text-primary-500 mt-1 inline-block">
              Go to sign in
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && !profile && (
        <div className="glass-card rounded-2xl p-5 text-sm text-gray-500">No record available.</div>
      )}

      {!loading && !error && profile && data && (
        <>
          {/* Identity */}
          <div className="glass-card rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt={profile.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-500/15 text-primary-500 flex items-center justify-center text-lg font-bold">
                  {profile.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{profile.name}</p>
                <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Roll number" value={profile.rollNumber} />
              <Field label="Section" value={profile.section} />
              <Field label="Semester" value={profile.currentSemester ? `Sem ${profile.currentSemester}` : null} />
              <Field label="Batch" value={profile.batchYear} />
              <Field label="Department" value={profile.department} />
              <Field label="Programme" value="B.Tech" />
            </div>

            {(!profile.rollNumber || !profile.section || !profile.currentSemester || !profile.department) && (
              <Link
                href="/settings"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600"
              >
                Complete your academic details
              </Link>
            )}
          </div>

          {/* Contact */}
          <div className="glass-card rounded-2xl p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300 mb-3">
              Contact
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <HiOutlineEnvelope className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-white truncate">{profile.collegeEmail || profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <HiOutlineEnvelope className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <HiOutlinePhone className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-white truncate">
                  {profile.phone || <span className="text-gray-400 dark:text-gray-600">Not set</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Subjects", value: data.summary.subjects },
              { label: "Credits", value: data.summary.credits },
              { label: "Attend.", value: data.summary.attendancePercentage === null ? "—" : `${data.summary.attendancePercentage}%` },
              { label: "Pending", value: data.summary.assignmentsPending },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-2.5 text-center">
                <p className={`text-base font-bold ${s.label === "Attend." ? pctColour(data.summary.attendancePercentage) : "text-gray-900 dark:text-white"}`}>
                  {s.value}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Subjects */}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300 px-1 mb-2">
            Subjects
          </h2>

          {data.subjects.length === 0 && (
            <div className="glass-card rounded-2xl p-5 text-center">
              <HiOutlineBookOpen className="text-2xl text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">No subjects yet</p>
              <p className="text-xs text-gray-500 mt-1">
                You are not enrolled in any course. Enrol from the LMS to see attendance, marks and assignments here.
              </p>
              <Link href="/lms" className="inline-block mt-3 text-xs font-medium text-primary-500 hover:text-primary-600">
                Go to LMS
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {data.subjects.map((s) => (
              <div key={s.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {s.code} · {s.name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {s.credits} credits{s.semester ? ` · Sem ${s.semester}` : ""}
                      {s.teacher ? ` · ${s.teacher}` : ""}
                      {s.role === "teaching_assistant" ? " · TA" : ""}
                    </p>
                  </div>
                  <Link href={`/lms/${s.id}`} className="text-[11px] text-primary-500 flex-shrink-0">
                    Open
                  </Link>
                </div>

                {/* Attendance */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <HiOutlineChartBar /> Attendance
                    </span>
                    <span className={`font-semibold ${pctColour(s.attendance.percentage)}`}>
                      {s.attendance.percentage === null ? "No records" : `${s.attendance.percentage}%`}
                      {s.attendance.total > 0 && (
                        <span className="text-gray-400 font-normal">
                          {" "}({s.attendance.present + s.attendance.late}/{s.attendance.total})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pctBar(s.attendance.percentage)}`}
                      style={{ width: `${s.attendance.percentage ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Marks */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {EXAM_LABELS.map(({ key, label }) => {
                    const m = s.marks[key];
                    return (
                      <div key={key} className="rounded-xl bg-gray-100/70 dark:bg-white/[0.04] p-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
                        {m ? (
                          <>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {m.score}
                              <span className="text-[10px] font-normal text-gray-400">/{m.maxScore}</span>
                            </p>
                            <p className={`text-[10px] ${pctColour(m.percentage)}`}>{m.percentage}%</p>
                          </>
                        ) : (
                          <p className="text-[11px] text-gray-400 dark:text-gray-600 py-1">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Assignments */}
                {s.assignments.length > 0 ? (
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                      <HiOutlineClipboardDocumentList /> Assignments
                      <span className="text-gray-400">
                        ({s.assignments.length - s.assignmentsPending}/{s.assignments.length} done)
                      </span>
                    </p>
                    <ul className="space-y-1">
                      {s.assignments.slice(0, 4).map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-gray-700 dark:text-gray-300 truncate">{a.title}</span>
                          <span
                            className={
                              a.submitted
                                ? "text-emerald-500 flex-shrink-0"
                                : "text-amber-500 flex-shrink-0"
                            }
                          >
                            {a.submitted
                              ? a.score !== null
                                ? `${a.score}/${a.maxScore}`
                                : "Submitted"
                              : a.dueDate
                                ? `Due ${new Date(a.dueDate).toLocaleDateString()}`
                                : "Pending"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">No assignments posted</p>
                )}
              </div>
            ))}
          </div>

          {/* The support links that used to be the whole page */}
          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300 px-1 mb-2">
              More
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
              {[
                { label: "Events", href: "/events", icon: HiOutlineAcademicCap },
                { label: "Blogs", href: "/blogs", icon: HiOutlineBookOpen },
                { label: "Help Center", href: "/help", icon: HiOutlineUserCircle },
                { label: "About Campusfeed", href: "/about", icon: HiOutlineAcademicCap },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
                >
                  <item.icon className="text-lg text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
