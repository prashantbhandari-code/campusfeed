"use client";

import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      default:
        return err ? "Something went wrong. Please try again." : null;
    }
  };

  const errorMessage = getErrorMessage(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Appwrite email/password session
      await account.createEmailPasswordSession(email, password);

      // Fetch user profile from our DB
      const res = await fetch("/api/auth/me", {
        headers: {
          "x-appwrite-user-id": (await account.get()).$id,
        },
      });

      if (res.ok) {
        toast.success("Welcome back to CampusConnect!");
        router.push("/feed");
      } else {
        // User doesn't exist in our DB yet — need to complete profile
        toast.error("Please complete your profile first");
        router.push("/auth/complete-profile?email=" + encodeURIComponent(email));
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid credentials") || msg.includes("user_invalid")) {
        toast.error("Invalid email or password");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { OAuthProvider } = await import("appwrite");
      account.createOAuth2Session(
        OAuthProvider.Google,
        window.location.origin + "/feed",
        window.location.origin + "/login?error=google-failed"
      );
    } catch {
      toast.error("Google sign-in failed");
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="••••••••"
                required
              />
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
