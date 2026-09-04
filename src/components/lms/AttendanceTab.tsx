"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { HiCheckCircle, HiExclamationTriangle, HiClock, HiCheckBadge, HiPencilSquare, HiUserGroup } from "react-icons/hi2";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string; studentId: string; status: string; date: string; notes?: string;
  student?: { id: string; name: string; avatar?: string };
}

interface AttendanceStats {
  total: number; present: number; absent: number; late: number; percentage: number;
}

function statusColor(s: string) {
  if (s === "present") return "text-green-600 bg-green-50 dark:bg-green-900/20";
  if (s === "absent") return "text-red-600 bg-red-50 dark:bg-red-900/20";
  if (s === "late") return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
  return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
}

function statusIcon(s: string) {
  if (s === "present") return <HiCheckCircle className="w-4 h-4 text-green-500" />;
  if (s === "absent") return <HiExclamationTriangle className="w-4 h-4 text-red-500" />;
  if (s === "late") return <HiClock className="w-4 h-4 text-yellow-500" />;
  return <HiCheckBadge className="w-4 h-4 text-blue-500" />;
}

export default function AttendanceTab({ courseId }: { courseId: string }) {
  const { data: session } = useSession() as any;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [showMark, setShowMark] = useState(false);
  const [markStatus, setMarkStatus] = useState("present");
  const [markDate, setMarkDate] = useState(new Date().toISOString().split("T")[0]);
  const [markNote, setMarkNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses/" + courseId + "/attendance")
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setStats(d.stats || { total:0,present:0,absent:0,late:0,percentage:0 }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const markAttendance = async () => {
    const res = await fetch("/api/courses/" + courseId + "/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: markStatus, date: markDate, notes: markNote })
    });
    if (res.ok) {
      const rec = await res.json();
      setRecords([rec, ...records]);
      setStats({
        total: stats.total + 1,
        present: stats.present + (markStatus === "present" ? 1 : 0),
        absent: stats.absent + (markStatus === "absent" ? 1 : 0),
        late: stats.late + (markStatus === "late" ? 1 : 0),
        percentage: Math.round(((stats.present + (markStatus === "present" ? 1 : 0)) / (stats.total + 1)) * 100)
      });
      setShowMark(false); setMarkNote("");
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <HiUserGroup className="w-5 h-5 mx-auto text-gray-400 mb-1" />
          <p className="text-2xl font-bold dark:text-white">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Classes</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <HiCheckCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          <p className="text-xs text-gray-500">Present</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <HiExclamationTriangle className="w-5 h-5 mx-auto text-red-500 mb-1" />
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-xs text-gray-500">Absent</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
          <HiClock className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
          <p className="text-xs text-gray-500">Late</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium dark:text-white">Attendance Rate</span>
          <span className="text-sm font-bold dark:text-white">{stats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div className="h-3 rounded-full transition-all duration-500" style={{ width: stats.percentage + "%", backgroundColor: stats.percentage >= 75 ? "#22c55e" : stats.percentage >= 50 ? "#eab308" : "#ef4444" }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{stats.percentage >= 75 ? "Good standing" : "Below 75% - attendance warning"}</p>
      </div>

      <button onClick={() => setShowMark(!showMark)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
        <HiPencilSquare className="w-4 h-4" /> Mark Attendance
      </button>

      {showMark && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex gap-2">
          {["present","absent","late","excused"].map(s => (
            <button key={s} onClick={() => setMarkStatus(s)} className={"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors " + (markStatus === s ? statusColor(s) + " ring-2 ring-offset-1" : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}</div>
          <input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <input value={markNote} onChange={e => setMarkNote(e.target.value)} placeholder="Optional note" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <div className="flex gap-2">
            <button onClick={markAttendance} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button>
            <button onClick={() => setShowMark(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-sm dark:text-white">Attendance History</h3>
        </div>
        {records.length > 0 ? records.map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
            <div className="flex items-center gap-3">
              {statusIcon(r.status)}
              <div>
                <p className="text-sm font-medium dark:text-white">{r.student?.name || "You"}</p>
                <p className="text-xs text-gray-400">{format(new Date(r.date), "MMM d, yyyy")}</p>
              </div>
            </div>
            <span className={"px-2 py-0.5 rounded-full text-xs font-medium capitalize " + statusColor(r.status)}>{r.status}</span>
          </div>
        )) : (
          <div className="p-8 text-center">
            <HiClock className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">No attendance records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
