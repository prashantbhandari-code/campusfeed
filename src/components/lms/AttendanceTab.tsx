"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { HiCheckCircle, HiExclamationTriangle, HiClock, HiCheckBadge, HiPencilSquare, HiUserGroup, HiChevronDown } from "react-icons/hi2";
import { format } from "date-fns";
import UserAvatar from "@/components/ui/UserAvatar";

interface AttendanceRecord {
  id: string; studentId: string; status: string; date: string; notes?: string;
  student?: { id: string; name: string; avatar?: string };
}

interface AttendanceStats {
  total: number; present: number; absent: number; late: number; percentage: number;
}

interface EnrolledStudent {
  studentId: string;
  role: string;
  student: { id: string; name: string; username?: string; avatar?: string };
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

export default function AttendanceTab({ courseId, createdBy }: { courseId: string; createdBy?: string }) {
  const { data: session } = useSession();
  const isTeacher = !!(createdBy && session?.user?.id === createdBy);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [showMark, setShowMark] = useState(false);
  const [markStatus, setMarkStatus] = useState("present");
  const [markDate, setMarkDate] = useState(new Date().toISOString().split("T")[0]);
  const [markNote, setMarkNote] = useState("");
  const [loading, setLoading] = useState(true);

  // Teacher-specific state
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [filterStudent, setFilterStudent] = useState<string>("");

  useEffect(() => {
    fetch("/api/courses/" + courseId + "/attendance")
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setStats(d.stats || { total:0,present:0,absent:0,late:0,percentage:0 }); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch enrolled students if teacher
    if (isTeacher) {
      fetch("/api/courses/" + courseId + "/enroll")
        .then(r => r.json())
        .then(d => setStudents(d.enrollments || []))
        .catch(() => {});
    }
  }, [courseId, isTeacher]);

  // When teacher selects a filter student, re-fetch attendance for that student
  useEffect(() => {
    if (!isTeacher) return;
    const url = filterStudent
      ? "/api/courses/" + courseId + "/attendance?studentId=" + filterStudent
      : "/api/courses/" + courseId + "/attendance";
    fetch(url)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setStats(d.stats || { total:0,present:0,absent:0,late:0,percentage:0 }); })
      .catch(() => {});
  }, [filterStudent, courseId, isTeacher]);

  const markAttendance = async () => {
    const studentId = isTeacher ? selectedStudent : undefined;
    if (isTeacher && !selectedStudent) return; // Teacher must select a student

    const body: any = { status: markStatus, date: markDate, notes: markNote };
    if (studentId) body.studentId = studentId;

    const res = await fetch("/api/courses/" + courseId + "/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const rec = await res.json();
      // Attach student info to the record for display
      if (isTeacher && selectedStudent) {
        const student = students.find(s => s.studentId === selectedStudent);
        if (student) rec.student = student.student;
      }
      setRecords([rec, ...records]);
      setStats({
        total: stats.total + 1,
        present: stats.present + (markStatus === "present" ? 1 : 0),
        absent: stats.absent + (markStatus === "absent" ? 1 : 0),
        late: stats.late + (markStatus === "late" ? 1 : 0),
        percentage: Math.round(((stats.present + (markStatus === "present" ? 1 : 0)) / (stats.total + 1)) * 100)
      });
      setShowMark(false); setMarkNote(""); setSelectedStudent("");
    }
  };

  const selectedStudentInfo = students.find(s => s.studentId === selectedStudent);

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
        <HiPencilSquare className="w-4 h-4" /> {isTeacher ? "Mark Student Attendance" : "Mark Attendance"}
      </button>

      {showMark && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          {/* Teacher: Student Picker */}
          {isTeacher && (
            <div className="relative">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Select Student</label>
              <button onClick={() => setShowStudentPicker(!showStudentPicker)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm">
                {selectedStudentInfo ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar user={selectedStudentInfo.student} size="sm" />
                    <span>{selectedStudentInfo.student.name}</span>
                    {selectedStudentInfo.student.username && <span className="text-gray-400">@{selectedStudentInfo.student.username}</span>}
                  </div>
                ) : (
                  <span className="text-gray-400">Choose a student...</span>
                )}
                <HiChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showStudentPicker && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {students.filter(s => s.role !== "teacher").length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No students enrolled</div>
                  ) : (
                    students.filter(s => s.role !== "teacher").map(s => (
                      <button key={s.studentId} onClick={() => { setSelectedStudent(s.studentId); setShowStudentPicker(false); }}
                        className={"w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 " + (selectedStudent === s.studentId ? "bg-blue-50 dark:bg-blue-900/20" : "")}>
                        <UserAvatar user={s.student} size="sm" />
                        <div className="text-left">
                          <p className="font-medium dark:text-white">{s.student.name}</p>
                          {s.student.username && <p className="text-xs text-gray-400">@{s.student.username}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
          {["present","absent","late","excused"].map(s => (
            <button key={s} onClick={() => setMarkStatus(s)} className={"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors " + (markStatus === s ? statusColor(s) + " ring-2 ring-offset-1" : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}</div>
          <input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <input value={markNote} onChange={e => setMarkNote(e.target.value)} placeholder="Optional note" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <div className="flex gap-2">
            <button onClick={markAttendance} disabled={isTeacher && !selectedStudent} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
            <button onClick={() => { setShowMark(false); setSelectedStudent(""); }} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-sm dark:text-white">Attendance History</h3>
          {isTeacher && students.filter(s => s.role !== "teacher").length > 0 && (
            <div className="relative">
              <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white appearance-none pr-6">
                <option value="">All Students</option>
                {students.filter(s => s.role !== "teacher").map(s => (
                  <option key={s.studentId} value={s.studentId}>{s.student.name}</option>
                ))}
              </select>
              <HiChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
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
            <p className="text-sm text-gray-400">{isTeacher ? "No attendance records yet" : "No attendance records yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
