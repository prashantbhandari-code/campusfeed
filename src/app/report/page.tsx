"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineFlag, HiOutlinePaperAirplane } from "react-icons/hi";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Something is broken (bug)",
  "Problem with a post or comment",
  "Account or safety concern",
  "Report a user",
  "Feature request",
  "Something else",
];

export default function ReportaProblemPage() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");

  const submit = () => {
    if (details.trim().length < 10) {
      toast.error("Please describe the problem in at least 10 characters");
      return;
    }
    const subject = encodeURIComponent(`[Campusfeed] ${category}`);
    const body = encodeURIComponent(
      `Problem: ${category}\n\nDetails:\n${details.trim()}\n\nContact (email/phone, optional):\n${contact.trim() || "—"}\n\nPage: ${typeof window !== "undefined" ? window.location.href : ""}`
    );
    window.location.href = `mailto:support@campusfeed.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineFlag className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Report a Problem</h1>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 space-y-4">
        <div>
          <label htmlFor="report-category" className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            What&apos;s the problem?
          </label>
          <select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="report-details" className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Details
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            placeholder="What happened? What did you expect instead? Steps to reproduce it help a lot."
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{details.trim().length} characters (10 minimum)</p>
        </div>

        <div>
          <label htmlFor="report-contact" className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            How can we reach you? <span className="normal-case font-normal">(optional)</span>
          </label>
          <input
            id="report-contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email address or phone number"
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={submit}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-all"
        >
          <HiOutlinePaperAirplane className="w-4 h-4" />
          Send report
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4 leading-relaxed">
        Reports open in your email app, pre-filled with your description and the page you&apos;re on.
        For urgent safety issues, also block the user from their post&apos;s ⋮ menu.
      </p>
    </div>
  );
}
