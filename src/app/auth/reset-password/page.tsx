"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { account } from "@/lib/appwrite";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";
  const secret = searchParams.get("secret") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = password.length >= 6 && passwordsMatch;

  if (!userId || !secret) {
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
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiExclamationCircle className="text-3xl text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid Reset Link</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all text-center"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successfully!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/login?password-set=true"
              className="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all text-center"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);

    try {
      // Appwrite's updateRecovery completes the password reset
      await account.updateRecovery(userId, secret, password);
      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("expired") || msg.includes("invalid")) {
        toast.error("Reset link has expired. Please request a new one.");
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Create a new password</p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    confirmPassword && !passwordsMatch
                      ? "border-red-500"
                      : "border-gray-200 dark:border-dark-500"
                  }`}
                  placeholder="Re-enter your password"
                  required
                />
                {confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <HiCheckCircle className="text-green-400 text-xl" />
                    ) : (
                      <span className="text-red-400 text-xs">Doesn&apos;t match</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto" />
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          <Link
            href="/login"
            className="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
