"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiDocumentText, HiCheckCircle } from "react-icons/hi2";
import { format } from "date-fns";

export default function AssignmentPage({ params }: { params: { courseId: string; assignmentId: string } }) {
  const { courseId, assignmentId } = params;
  const { data: session } = useSession();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/courses/" + courseId).then(r => r.json()).then(course => {
      course.modules?.forEach((m: any) => {
        m.assignments?.forEach((a: any) => {
          if (a.id === assignmentId) setAssignment(a);
        });
      });
    });
    fetch("/api/assignments/" + assignmentId + "/submit").then(r => r.json()).then(s => {
      if (s) { setSubmission(s); setContent(s.content || ""); setSubmitted(true); }
    });
  }, [courseId, assignmentId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/assignments/" + assignmentId + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const s = await res.json();
      setSubmission(s);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (!assignment) return <div className="max-w-4xl mx-auto p-4">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <button onClick={() => router.push("/lms/" + courseId)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"><HiArrowLeft className="w-4 h-4" /> Back to Course</button>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-3">
          <HiDocumentText className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{assignment.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Max Score: {assignment.maxScore} pts</p>
          </div>
        </div>
        {assignment.description && <p className="text-gray-600 dark:text-gray-300">{assignment.description}</p>}
        {assignment.dueDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Due: {format(new Date(assignment.dueDate), "MMM d, yyyy h:mm a")}</span>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <h2 className="text-lg font-semibold dark:text-white">Your Submission</h2>
        {submitted && submission?.score !== null && submission?.score !== undefined ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <HiCheckCircle className="w-5 h-5" />
              <span className="font-medium">Graded: {submission.score}/{assignment.maxScore}</span>
            </div>
            {submission.feedback && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{submission.feedback}</p>}
          </div>
        ) : null}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your answer here..."
          className="w-full h-48 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={submitted && submission?.score !== null}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">{submitted ? "Last submitted: " + format(new Date(submission?.submittedAt || Date.now()), "MMM d, h:mm a") : "Not submitted yet"}</p>
          {(!submitted || submission?.status === "resubmitted") && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : submitted ? "Resubmit" : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}