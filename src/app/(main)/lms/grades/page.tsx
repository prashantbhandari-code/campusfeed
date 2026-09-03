"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiAcademicCap, HiDocumentText, HiCheckCircle } from "react-icons/hi2";

export default function GradesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grades").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const calcGPA = () => {
    if (!data) return "0.00";
    const allGrades = [...(data.submissions || []), ...(data.quizAttempts || [])];
    if (allGrades.length === 0) return "0.00";
    let totalPoints = 0, earnedPoints = 0;
    allGrades.forEach((g: any) => {
      const max = g.assignment?.maxScore || g.quiz?.questions?.length || 100;
      const score = g.score || 0;
      totalPoints += max;
      earnedPoints += score;
    });
    const pct = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const gpa4 = pct >= 90 ? 4.0 : pct >= 80 ? 3.5 : pct >= 70 ? 3.0 : pct >= 60 ? 2.5 : pct >= 50 ? 2.0 : 1.0;
    return gpa4.toFixed(2);
  };

  if (loading) return <div className="max-w-4xl mx-auto p-4 space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <button onClick={() => router.push("/lms")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"><HiArrowLeft className="w-4 h-4" /> Back to LMS</button>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
        <HiAcademicCap className="w-12 h-12 mx-auto text-blue-500 mb-3" />
        <h1 className="text-2xl font-bold dark:text-white">My Grades</h1>
        <p className="text-4xl font-bold text-blue-600 mt-2">GPA: {calcGPA()}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{data?.submissions?.length || 0} assignments graded, {data?.quizAttempts?.length || 0} quizzes completed</p>
      </div>

      {data?.submissions?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold dark:text-white">Assignment Grades</h2>
          {data.submissions.map((s: any) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HiDocumentText className="w-5 h-5 text-orange-500" />
                <div><p className="font-medium dark:text-white">{s.assignment?.title || "Assignment"}</p>
                  <p className="text-xs text-gray-400">{s.assignment?.module?.course?.name || ""}</p></div>
              </div>
              <div className="text-right">
                <p className="font-bold dark:text-white">{s.score}/{s.assignment?.maxScore || 100}</p>
                <p className="text-xs text-gray-400">{Math.round(((s.score || 0) / (s.assignment?.maxScore || 100)) * 100)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.quizAttempts?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold dark:text-white">Quiz Grades</h2>
          {data.quizAttempts.map((qa: any) => (
            <div key={qa.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HiCheckCircle className="w-5 h-5 text-green-500" />
                <div><p className="font-medium dark:text-white">{qa.quiz?.title || "Quiz"}</p>
                  <p className="text-xs text-gray-400">{qa.quiz?.module?.course?.name || ""}</p></div>
              </div>
              <div className="text-right">
                <p className="font-bold dark:text-white">{qa.score}/{qa.quiz?.questions?.length || 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!data?.submissions?.length && !data?.quizAttempts?.length && (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No grades yet. Complete assignments and quizzes to see your grades here.</p>
        </div>
      )}
    </div>
  );
}