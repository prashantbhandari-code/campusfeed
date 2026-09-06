"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle, HiLockClosed } from "react-icons/hi";
import { account } from "@/lib/appwrite";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!passwordsMatch) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Proof of identity: a short-lived JWT minted from the current Appwrite
      // session. The server verifies it and sets the password for that
      // identity only — no email trust involved.
      const jwt = await account.createJWT();

      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set password");
        toast.error(data.error || "Failed to set password");
        setLoading(false);
        return;
      }

      toast.success("Password set! You can now login with email & password.");
      router.push("/login?password-set=true");
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <HiExclamationCircle className="text-5xl text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
          <p className="text-gray-400 mb-4">This page must be accessed through Google sign-in.</p>
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
            Go to Login
          </Link>
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
          <p className="text-gray-400 mb-3">Set a password for your account</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 rounded-full">
            <HiLockClosed className="text-yellow-400 text-sm" />
            <span className="text-sm text-yellow-300 font-medium">Password Required for Direct Login</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300">
              Your account was created with Google sign-in. Set a password so you can also login directly with email & password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center gap-2">
              <HiExclamationCircle className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-green-500/50 rounded-xl text-gray-400 cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors ${
                    confirmPassword && !passwordsMatch ? "border-red-500" : "border-gray-200 dark:border-dark-500"
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
              disabled={loading || !passwordsMatch || password.length < 6}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
              ) : (
                "Set Password & Login"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-400">
              Skip for now — I&apos;ll use Google to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
