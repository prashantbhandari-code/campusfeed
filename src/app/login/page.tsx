"use client";

import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();

  const justVerified = searchParams.get("verified") === "true";
  const justSetPassword = searchParams.get("password-set") === "true";
  const error = searchParams.get("error");

  const getErrorMessage = (err: string | null) => {
    switch (err) {
      case "not-kiit":
        return "Only @kiit.ac.in college emails are allowed. Please use your KIIT email.";
      case "CredentialsSignin":
        return "Invalid email or password. Please try again.";
      case "google-failed":
        return "Google sign-in failed. Please try again or use email/password.";
      default:
        return err ? "Something went wrong. Please try again." : null;
    }
  };

  const errorMessage = getErrorMessage(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct login via server API — no Appwrite SDK involved
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        toast.success("Welcome back to CampusConnect!");
        window.location.href = "/feed";
        return;
      }

      const errorData = await loginRes.json().catch(() => ({}));
      toast.error(errorData.error === "no-password"
        ? "This account uses Google sign-in. Please use 'Sign in with Google'."
        : "Invalid email or password");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Direct Google OAuth — bypasses Appwrite entirely
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-3">Sign in to your campus</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-campus-600/20 border border-campus-500/30 rounded-full">
            <HiCheckCircle className="text-campus-400 text-sm" />
            <span className="text-sm text-campus-700 dark:text-campus-300 font-medium">KIIT Students Only 🔒</span>
          </div>
        </div>

        {/* Success Messages */}
        {justVerified && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-500/30 rounded-xl flex items-center gap-2">
            <HiCheckCircle className="text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300">Email verified! You can now sign in.</span>
          </div>
        )}

        {justSetPassword && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-500/30 rounded-xl flex items-center gap-2">
            <HiCheckCircle className="text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300">Password set! You can now login with email & password.</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center gap-2">
            <HiExclamationCircle className="text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{errorMessage}</span>
          </div>
        )}

        <div className="glass rounded-2xl p-8 space-y-5">
          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-white dark:bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 border border-gray-200 dark:border-transparent"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">KIIT Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="yourname@kiit.ac.in"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              <div className="text-right mt-1">
                <Link href="/auth/forgot-password" className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold">
            Join CampusConnect
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
