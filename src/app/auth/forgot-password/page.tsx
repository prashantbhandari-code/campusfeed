"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isValidEmail = email.endsWith("@kiit.ac.in");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call our server API — no Appwrite SDK involved
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Always show success to prevent email enumeration
      setSent(true);
      toast.success("Recovery email sent! Check your inbox.");
    } catch {
      // Even on error, show success to prevent enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <HiAcademicCap className="text-4xl text-campus-400" />
              <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
            </div>
          </div>
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiCheckCircle className="text-3xl text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">
              We&apos;ve sent a password reset link to:
            </p>
            <p className="text-gray-900 dark:text-white font-semibold mb-6">{email}</p>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Didn&apos;t receive it? Check your spam folder or try again in a few minutes.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="w-full py-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-white rounded-xl font-semibold transition-all"
              >
                Try Another Email
              </button>
              <Link
                href="/login"
                className="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">Reset your password</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Enter your KIIT email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                KIIT Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="yourname@kiit.ac.in"
                required
                autoFocus
              />
              {email && !isValidEmail && (
                <p className="text-xs text-red-500 mt-1">Must be a @kiit.ac.in email</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isValidEmail}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto" />
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
