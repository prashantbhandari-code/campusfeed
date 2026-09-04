"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiPlus, HiBookOpen, HiDocumentText, HiAcademicCap, HiArrowLeft, HiCheckCircle, HiChatBubbleLeftRight, HiUserGroup, HiClock, HiExclamationTriangle, HiCheckBadge, HiPencilSquare, HiArrowUturnLeft } from "react-icons/hi2";
import { format } from "date-fns";

interface Course {
  id: string; name: string; code: string; description?: string; department?: string; semester?: number; credits: number;
  creator: { id: string; name: string; avatar?: string };
  modules: { id: string; name: string; description?: string; order: number;
    assignments: { id: string; title: string; dueDate?: string; maxScore: number; _count: { submissions: number } }[];
    quizzes: { id: string; title: string; timeLimit: number; _count: { questions: number } }[];
  }[];
  materials: { id: string; title: string; fileName: string; fileType?: string; createdAt: string }[];
}

interface AttendanceRecord {
  id: string; studentId: string; status: string; date: string; notes?: string;
  student?: { id: string; name: string; avatar?: string };
}

interface AttendanceStats {
  total: number; present: number; absent: number; late: number; percentage: number;
}

interface ForumPost {
  id: string; title: string; content: string; pinned: boolean; resolved: boolean; createdAt: string;
  author: { id: string; name: string; avatar?: string };
  _count: { replies: number };
}

interface ForumReply {
  id: string; content: string; createdAt: string;
  author: { id: string; name: string; avatar?: string };
}

function AttendanceTab({ courseId }: { courseId: string }) {
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

  const statusColor = (s: string) => {
    if (s === "present") return "text-green-600 bg-green-50 dark:bg-green-900/20";
    if (s === "absent") return "text-red-600 bg-red-50 dark:bg-red-900/20";
    if (s === "late") return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
  };

  const statusIcon = (s: string) => {
    if (s === "present") return <HiCheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "absent") return <HiExclamationTriangle className="w-4 h-4 text-red-500" />;
    if (s === "late") return <HiClock className="w-4 h-4 text-yellow-500" />;
    return <HiCheckBadge className="w-4 h-4 text-blue-500" />;
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

function ForumTab({ courseId }: { courseId: string }) {
  const { data: session } = useSession() as any;
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ForumReply[]>>({});
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    fetch("/api/courses/" + courseId + "/forum")
      .then(r => r.json())
      .then(d => { setPosts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const createPost = async () => {
    if (!newTitle || !newContent) return;
    const res = await fetch("/api/courses/" + courseId + "/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    if (res.ok) {
      const post = await res.json();
      setPosts([{ ...post, author: { id: session?.user?.id, name: session?.user?.name, avatar: session?.user?.image }, _count: { replies: 0 } }, ...posts]);
      setNewTitle(""); setNewContent(""); setShowNew(false);
    }
  };

  const loadReplies = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    if (!replies[postId]) {
      const res = await fetch("/api/forum/" + postId + "/replies");
      if (res.ok) { const data = await res.json(); setReplies({ ...replies, [postId]: Array.isArray(data) ? data : [] }); }
    }
    setExpandedPost(postId);
  };

  const addReply = async (postId: string) => {
    if (!replyText) return;
    const res = await fetch("/api/forum/" + postId + "/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText })
    });
    if (res.ok) {
      const reply = await res.json();
      setReplies({ ...replies, [postId]: [...(replies[postId] || []), { ...reply, author: { id: session?.user?.id, name: session?.user?.name, avatar: session?.user?.image } }] });
      setReplyText("");
      setPosts(posts.map(p => p.id === postId ? { ...p, _count: { replies: p._count.replies + 1 } } : p));
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
        <HiPencilSquare className="w-4 h-4" /> New Discussion
      </button>

      {showNew && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discussion title" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Describe your question or topic..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm h-24 resize-none" />
          <div className="flex gap-2">
            <button onClick={createPost} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Post</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {posts.length > 0 ? posts.map(post => (
        <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div onClick={() => loadReplies(post.id)} className="p-4 cursor-pointer hover:bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {post.pinned && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Pinned</span>}
                {post.resolved && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">Resolved</span>}
              </div>
              <h3 className="font-semibold text-sm dark:text-white">{post.title}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.content}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
              <span>{post.author?.name}</span>
              <span>{format(new Date(post.createdAt), "MMM d")}</span>
              <span className="flex items-center gap-1"><HiChatBubbleLeftRight className="w-3 h-3" /> {post._count.replies} replies</span>
            </div>
          </div>
          </div>

          {expandedPost === post.id && (
            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {(replies[post.id] || []).map((reply: ForumReply) => (
                <div key={reply.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">{(reply.author?.name || "U").charAt(0)}</div>
                    <span className="text-xs font-medium dark:text-white">{reply.author?.name}</span>
                    <span className="text-xs text-gray-400">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 ml-7">{reply.content}</p>
                </div>
              ))}
              <div className="px-4 py-3 flex gap-2">
                <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply(post.id)} placeholder="Write a reply..." className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                <button onClick={() => addReply(post.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Reply</button>
              </div>
            </div>
          )}
        </div>
      )) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <HiChatBubbleLeftRight className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">No discussions yet. Start one!</p>
        </div>
      )}
    </div>
  );
}


export default function CourseDetail({ params }: { params: { courseId: string } }) {
  const courseId = params.courseId;
  const { data: session } = useSession();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [tab, setTab] = useState<"modules"|"attendance"|"forum"|"resources"|"grades">("modules");
  const [showModule, setShowModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [showAssignment, setShowAssignment] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ title: "", description: "", dueDate: "", maxScore: "100" });

  useEffect(() => { fetch("/api/courses/" + courseId).then(r => r.json()).then(setCourse); }, [courseId]);

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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2"><span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">{course.code}</span>
          {course.semester && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Sem {course.semester}</span>}
          <span className="text-xs text-gray-400">{course.credits} credits</span></div>
        <h1 className="text-2xl font-bold dark:text-white">{course.name}</h1>
        {course.description && <p className="text-gray-500 dark:text-gray-400 mt-2">{course.description}</p>}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {(["modules","attendance","forum","resources","grades"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-gray-700 shadow dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "modules" && (
        <div className="space-y-4">
          <button onClick={() => setShowModule(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"><HiPlus className="w-4 h-4" /> Add Module</button>
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
                <button onClick={() => setShowAssignment(m.id)} className="text-xs text-blue-600 hover:text-blue-700">+ Assignment</button>
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
      {tab === "attendance" && <AttendanceTab courseId={courseId} />}
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
