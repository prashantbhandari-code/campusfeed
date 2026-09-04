"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useRouter } from "next/navigation";
import { HiPlus, HiDocumentText, HiAcademicCap, HiArrowLeft, HiCheckCircle, HiCheckBadge, HiUserGroup, HiUserMinus } from "react-icons/hi2";
import { format } from "date-fns";
import AttendanceTab from "@/components/lms/AttendanceTab";
import ForumTab from "@/components/lms/ForumTab";
import UserAvatar from "@/components/UserAvatar";

interface Course {
  id: string; name: string; code: string; description?: string; department?: string; semester?: number; credits: number;
  createdBy: string;
  creator: { id: string; name: string; avatar?: string };
  modules: { id: string; name: string; description?: string; order: number;
    assignments: { id: string; title: string; dueDate?: string; maxScore: number; _count: { submissions: number } }[];
    quizzes: { id: string; title: string; timeLimit: number; _count: { questions: number } }[];
  }[];
  materials: { id: string; title: string; fileName: string; fileType?: string; createdAt: string }[];
}

interface EnrolledStudent {
  studentId: string;
  role: string;
  enrolledAt: string;
  student: { id: string; name: string; username?: string; avatar?: string };
}

export default function CourseDetail({ params }: { params: { courseId: string } }) {
  const courseId = params.courseId;
  const { data: session } = useSession() as any;
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [tab, setTab] = useState<"modules"|"attendance"|"forum"|"resources"|"grades">("modules");
  const [showModule, setShowModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [showAssignment, setShowAssignment] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ title: "", description: "", dueDate: "", maxScore: "100" });

  // Enrollment state
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [showStudents, setShowStudents] = useState(false);

  const isCreator = session?.user?.id === course?.createdBy;

  useEffect(() => {
    fetch("/api/courses/" + courseId).then(r => r.json()).then(setCourse);
    fetch("/api/courses/" + courseId + "/enroll").then(r => r.json()).then(d => {
      setIsEnrolled(d.isEnrolled || false);
      setEnrollmentCount(d.count || 0);
      setEnrolledStudents(d.enrollments || []);
    }).catch(() => {});
  }, [courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    const res = await fetch("/api/courses/" + courseId + "/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "student" }) });
    if (res.ok) {
      setIsEnrolled(true);
      setEnrollmentCount(c => c + 1);
      // Re-fetch students
      const d = await fetch("/api/courses/" + courseId + "/enroll").then(r => r.json());
      setEnrolledStudents(d.enrollments || []);
    }
    setEnrolling(false);
  };

  const handleUnenroll = async () => {
    if (!confirm("Are you sure you want to leave this course?")) return;
    const res = await fetch("/api/courses/" + courseId + "/enroll", { method: "DELETE" });
    if (res.ok) {
      setIsEnrolled(false);
      setEnrollmentCount(c => Math.max(0, c - 1));
      setEnrolledStudents(students => students.filter(s => s.studentId !== session?.user?.id));
    }
  };

  const addModule = async () => {
    if (!moduleName) return;
    const res = await fetch("/api/courses/" + courseId + "/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: moduleName }) });
    if (res.ok && course) { const m = await res.json(); setCourse({ ...course, modules: [...course.modules, { ...m, assignments: [], quizzes: [] }] }); setModuleName(""); setShowModule(false); }
  };

  const addAssignment = async (moduleId: string) => {
    if (!assignForm.title) return;
    const res = await fetch("/api/courses/" + courseId + "/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...assignForm, moduleId }) });
    if (res.ok && course) {
      const a = await res.json();
      setCourse({ ...course, modules: course.modules.map(m => m.id === moduleId ? { ...m, assignments: [...m.assignments, { ...a, _count: { submissions: 0 } }] } : m) });
      setShowAssignment(null); setAssignForm({ title: "", description: "", dueDate: "", maxScore: "100" });
    }
  };

  if (!course) return <div className="max-w-4xl mx-auto p-4 space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <button onClick={() => router.push("/lms")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"><HiArrowLeft className="w-4 h-4" /> Back to Courses</button>

      {/* Course Header with Enrollment */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">{course.code}</span>
              {course.semester && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Sem {course.semester}</span>}
              <span className="text-xs text-gray-400">{course.credits} credits</span>
              {isEnrolled && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-medium flex items-center gap-1"><HiCheckBadge className="w-3 h-3" /> Enrolled</span>}
              {isCreator && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">Creator</span>}
            </div>
            <h1 className="text-2xl font-bold dark:text-white">{course.name}</h1>
            {course.description && <p className="text-gray-500 dark:text-gray-400 mt-2">{course.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><HiUserGroup className="w-4 h-4" /> {enrollmentCount} student{enrollmentCount !== 1 ? "s" : ""}</span>
              <button onClick={() => setShowStudents(!showStudents)} className="text-blue-600 hover:text-blue-700 text-sm">{showStudents ? "Hide students" : "View students"}</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEnrolled && !isCreator && (
              <button onClick={handleEnroll} disabled={enrolling} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {enrolling ? "Joining..." : "Join Course"}
              </button>
            )}
            {isEnrolled && !isCreator && (
              <button onClick={handleUnenroll} className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">
                <HiUserMinus className="w-4 h-4" /> Leave
              </button>
            )}
          </div>
        </div>

        {/* Enrolled Students List */}
        {showStudents && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold dark:text-white mb-3">Enrolled Students ({enrolledStudents.length})</h3>
            {enrolledStudents.length > 0 ? (
              <div className="space-y-2">
                {enrolledStudents.map(e => (
                  <div key={e.studentId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={e.student} size="sm" />
                      <div>
                        <p className="text-sm font-medium dark:text-white">{e.student.name}</p>
                        {e.student.username && <p className="text-xs text-gray-400">@{e.student.username}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.role === "teacher" && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">Teacher</span>}
                      <span className="text-xs text-gray-400">{format(new Date(e.enrolledAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No students enrolled yet</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {(["modules","attendance","forum","resources","grades"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-gray-700 shadow dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "modules" && (
        <div className="space-y-4">
          {(isCreator || isEnrolled) && (
            <button onClick={() => setShowModule(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"><HiPlus className="w-4 h-4" /> Add Module</button>
          )}
          {showModule && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex gap-2">
              <input value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="Module name" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
              <button onClick={addModule} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
              <button onClick={() => setShowModule(false)} className="px-4 py-2 text-gray-500">Cancel</button>
            </div>
          )}
          {course.modules.map((m, i) => (
            <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold dark:text-white">Module {i + 1}: {m.name}</h3>
                {(isCreator || isEnrolled) && <button onClick={() => setShowAssignment(m.id)} className="text-xs text-blue-600 hover:text-blue-700">+ Assignment</button>}
              </div>
              {showAssignment === m.id && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3 space-y-2">
                  <input value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} placeholder="Assignment title" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white text-sm" />
                  <textarea value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} placeholder="Description" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white text-sm h-16" />
                  <div className="flex gap-2"><input type="datetime-local" value={assignForm.dueDate} onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white text-sm" />
                    <input type="number" value={assignForm.maxScore} onChange={e => setAssignForm({...assignForm, maxScore: e.target.value})} placeholder="Max score" className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white text-sm" />
                    <button onClick={() => addAssignment(m.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
                    <button onClick={() => setShowAssignment(null)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button></div>
                </div>
              )}
              {m.assignments.length > 0 && m.assignments.map(a => (
                <div key={a.id} onClick={() => router.push("/lms/" + courseId + "/assignment/" + a.id)} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <div className="flex items-center gap-2"><HiDocumentText className="w-4 h-4 text-orange-500" /><span className="text-sm dark:text-white">{a.title}</span></div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {a.dueDate && <span>Due {format(new Date(a.dueDate), "MMM d")}</span>}
                    <span>{a.maxScore} pts</span>
                  </div>
                </div>
              ))}
              {m.quizzes.map(qz => (
                <div key={qz.id} onClick={() => router.push("/lms/" + courseId + "/quiz/" + qz.id)} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <div className="flex items-center gap-2"><HiCheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm dark:text-white">{qz.title}</span></div>
                  <div className="flex items-center gap-3 text-xs text-gray-400"><span>{qz._count.questions} questions</span><span>{qz.timeLimit} min</span></div>
                </div>
              ))}
              {m.assignments.length === 0 && m.quizzes.length === 0 && <p className="text-sm text-gray-400 italic">No assignments or quizzes yet</p>}
            </div>
          ))}
          {course.modules.length === 0 && <p className="text-center text-gray-400 py-10">No modules yet. Add one to get started.</p>}
        </div>
      )}
      {tab === "attendance" && <AttendanceTab courseId={courseId} createdBy={course.createdBy} />}
      {tab === "forum" && <ForumTab courseId={courseId} />}
      {tab === "resources" && (
        <div className="space-y-4">
          {course.materials.length > 0 ? course.materials.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3"><HiDocumentText className="w-5 h-5 text-blue-500" /><div><p className="text-sm font-medium dark:text-white">{m.title}</p><p className="text-xs text-gray-400">{m.fileName}</p></div></div>
              <span className="text-xs text-gray-400">{format(new Date(m.createdAt), "MMM d, yyyy")}</span>
            </div>
          )) : <p className="text-center text-gray-400 py-10">No materials uploaded yet</p>}
        </div>
      )}
      {tab === "grades" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
          <HiAcademicCap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Grades will appear here after assignments are graded</p>
        </div>
      )}
    </div>
  );
}
