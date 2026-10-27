"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import { HiPlus, HiAcademicCap, HiBookOpen, HiCalendar, HiCheckBadge, HiUserGroup } from "react-icons/hi2";

interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: string;
  semester?: number;
  credits: number;
  createdBy: string;
  creator: { id: string; name: string; avatar?: string };
  _count: { modules: number; materials: number };
}

interface EnrollmentMap { [courseId: string]: { isEnrolled: boolean; count: number } }

export default function LMSDashboard() {
  const { data: session } = useSession() as any;
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentMap>({});
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", department: "", semester: "", credits: "3" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses").then(r => r.json()).then(async (d) => {
      // A failed load returns {error}, not an array — guard it so
      // courses.map below can't crash the page on a 401/500.
      const list: Course[] = Array.isArray(d) ? d : [];
      setCourses(list);
      setLoading(false);
      // Fetch enrollment status for each course
      const results: EnrollmentMap = {};
      await Promise.all(list.map(async (c: Course) => {
        try {
          const res = await fetch("/api/courses/" + c.id + "/enroll");
          if (res.ok) { const data = await res.json(); results[c.id] = { isEnrolled: data.isEnrolled, count: data.count }; }
        } catch (error) { console.error("Operation failed:", error); }
      }));
      setEnrollments(results);
    });
  }, []);

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnrolling(courseId);
    const res = await fetch("/api/courses/" + courseId + "/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "student" }) });
    if (res.ok) {
      setEnrollments({ ...enrollments, [courseId]: { isEnrolled: true, count: (enrollments[courseId]?.count || 0) + 1 } });
    }
    setEnrolling(null);
  };

  const createCourse = async () => {
    if (!form.name || !form.code) return;
    const res = await fetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      const course = await res.json();
      setCourses([course, ...courses]);
      setShowCreate(false);
      setForm({ name: "", code: "", description: "", department: "", semester: "", credits: "3" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Learning Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your courses, assignments, and grades</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <HiPlus className="w-4 h-4" /> New Course
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="text-lg font-semibold dark:text-white">Create Course</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Course Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
            <input placeholder="Course Code (e.g. CS101)" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
            <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
            <input type="number" placeholder="Semester" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
            <input type="number" placeholder="Credits" value={form.credits} onChange={e => setForm({...form, credits: e.target.value})} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white h-20" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={createCourse} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <HiAcademicCap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">No courses yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first course to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map(course => {
            const enrollment = enrollments[course.id];
            const isEnrolled = enrollment?.isEnrolled || false;
            const isCreator = session?.user?.id === course.createdBy;
            return (
              <div key={course.id} onClick={() => router.push("/lms/" + course.id)} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">{course.code}</span>
                      {course.semester && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Sem {course.semester}</span>}
                      {isEnrolled && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-medium flex items-center gap-1"><HiCheckBadge className="w-3 h-3" /> Enrolled</span>}
                      {isCreator && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">Creator</span>}
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white mt-1">{course.name}</h3>
                    {course.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{course.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-gray-400">
                      <p>{course.credits} credits</p>
                    </div>
                    {!isEnrolled && !isCreator && (
                      <button onClick={(e) => handleEnroll(course.id, e)} disabled={enrolling === course.id} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                        {enrolling === course.id ? "Joining..." : "Enroll"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><HiBookOpen className="w-3 h-3" /> {course._count.modules} modules</span>
                  <span className="flex items-center gap-1"><HiCalendar className="w-3 h-3" /> {course._count.materials} materials</span>
                  {enrollment?.count !== undefined && <span className="flex items-center gap-1"><HiUserGroup className="w-3 h-3" /> {enrollment.count} students</span>}
                  <span className="flex items-center gap-1">by {course.creator.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
