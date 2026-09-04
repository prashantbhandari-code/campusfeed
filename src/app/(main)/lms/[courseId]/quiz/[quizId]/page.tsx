"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi2";

export default function QuizPage({ params }: { params: { courseId: string; quizId: string } }) {
  const { courseId, quizId } = params;
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canAttempt, setCanAttempt] = useState(true);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/quizzes/" + quizId + "/take").then(r => r.json()).then(data => {
      if (data.quiz) { setQuiz(data.quiz); setCanAttempt(data.canAttempt); setAttemptsUsed(data.attemptsUsed); setAnswers(new Array(data.quiz.questions.length).fill("")); }
    });
  }, [quizId]);

  useEffect(() => {
    if (started && timeLeft > 0 && !submitted) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (started && timeLeft === 0 && !submitted) handleSubmit();
  }, [timeLeft, started, submitted]);

  const startQuiz = () => { setStarted(true); setTimeLeft((quiz.timeLimit || 30) * 60); };

  const handleSubmit = async () => {
    if (submitted) return; setSubmitted(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    const res = await fetch("/api/quizzes/" + quizId + "/take", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
    setResult(await res.json());
  };

  const fmt = (s: number) => Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);

  if (!quiz) return <div className="max-w-4xl mx-auto p-4">Loading...</div>;

  if (submitted && result) {
    const ga = JSON.parse(result.attempt.answers);
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <button onClick={() => router.push("/lms/" + courseId)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><HiArrowLeft className="w-4 h-4" /> Back</button>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-4">
          <HiCheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold dark:text-white">Quiz Complete!</h1>
          <p className="text-4xl font-bold text-blue-600">{result.score} / {result.total}</p>
          <p className="text-gray-500 dark:text-gray-400">{Math.round((result.score / result.total) * 100)}% score</p>
        </div>
        <div className="space-y-3">
          {quiz.questions.map((q: any, i: number) => (
            <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                {ga[i]?.correct ? <HiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" /> : <HiXCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                <div className="flex-1"><p className="font-medium dark:text-white">Q{i+1}: {q.question}</p>
                  <p className="text-sm text-gray-500">Your: {ga[i]?.userAnswer || "(empty)"}</p>
                  {!ga[i]?.correct && <p className="text-sm text-green-600">Correct: {q.answer}</p>}</div>
              </div></div>
          ))}</div></div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <button onClick={() => router.push("/lms/" + courseId)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><HiArrowLeft className="w-4 h-4" /> Back</button>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-4">
          <HiClock className="w-16 h-16 mx-auto text-blue-500" />
          <h1 className="text-2xl font-bold dark:text-white">{quiz.title}</h1>
          <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span>{quiz.questions.length} questions</span><span>{quiz.timeLimit} min</span><span>{attemptsUsed}/{quiz.maxAttempts} used</span></div>
          {!canAttempt ? <p className="text-red-500">No attempts remaining</p> :
            <button onClick={startQuiz} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Start Quiz</button>}
        </div></div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 sticky top-2 z-10">
        <h1 className="font-semibold dark:text-white">{quiz.title}</h1>
        <div className="flex items-center gap-4">
          <span className={"text-lg font-mono " + (timeLeft < 60 ? "text-red-500" : "text-gray-600 dark:text-gray-300")}>{fmt(timeLeft)}</span>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Submit</button>
        </div></div>
      {quiz.questions.map((q: any, i: number) => (
        <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-3">
          <p className="font-medium dark:text-white">Q{i+1}: {q.question} <span className="text-xs text-gray-400">({q.points} pts)</span></p>
          {q.type === "multiple_choice" ? <div className="space-y-2">
            {JSON.parse(q.options).map((opt: string, j: number) => (
              <label key={j} className={"flex items-center gap-3 p-3 rounded-lg border cursor-pointer " + (answers[i] === opt ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700")}>
                <input type="radio" name={"q"+i} checked={answers[i] === opt} onChange={() => { const n = [...answers]; n[i] = opt; setAnswers(n); }} className="text-blue-600" />
                <span className="dark:text-white">{opt}</span></label>
            ))}</div> : <input value={answers[i]} onChange={e => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }} placeholder="Your answer" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
          }</div>
      ))}</div>
  );
}