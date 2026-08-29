"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";

const DEPARTMENTS = [
  "CSE", "CSE (Data Science)", "CSE (AI & ML)", "CSE (IoT)", "CSE (Cyber Security)",
  "IT", "ECE", "EEE", "Mechanical", "Civil",
  "Electrical", "Biotechnology", "Chemical", "Aerospace",
  "Automobile", "Mechatronics", "Architecture", "Law",
  "Management", "Media & Communication", "Design"
];

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleName = searchParams.get("name") || "";
  const googleEmail = searchParams.get("email") || "";

  const [name, setName] = useState(googleName);
  const [username, setUsername] = useState("");
  const [email] = useState(googleEmail); // Locked — from Google
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = email.endsWith("@kiit.ac.in");
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

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, confirmPassword, phone, department, batchYear }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        toast.error(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      toast.success("Account created! You can now login.");
      router.push("/login?verified=true");
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  if (!googleEmail) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
          </div>
          <p className="text-gray-400 mb-3">Complete your profile to get started</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-full">
            <span className="text-sm text-green-300 font-medium">Google Account Connected ✓</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center gap-2">
              <HiExclamationCircle className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Name (pre-filled from Google) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">1. Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* 2. Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">2. Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Choose a unique username"
                required
              />
            </div>

            {/* 3. Email (locked from Google) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">3. Email (from Google)</label>
              <input
                type="email"
                value={email}
                className="w-full px-4 py-3 bg-dark-700 border border-green-500/50 rounded-xl text-gray-400 cursor-not-allowed"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Locked — from your Google account</p>
            </div>

            {/* 4. Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">4. Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your phone number"
                required
              />
            </div>

            {/* 5. Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">5. Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            {/* 6. Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">6. Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors ${
                    confirmPassword && !passwordsMatch ? "border-red-500" : "border-dark-500"
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

            {/* 7. Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">7. Branch</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-200"
                required
              >
                <option value="">Select your branch</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 8. Batch */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">8. Batch</label>
              <select
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-200"
                required
              >
                <option value="">Select your batch</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidEmail || !passwordsMatch || !username || !department || !batchYear}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
              ) : (
                "Create Account & Login"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <CompleteProfileForm />
    </Suspense>
  );
}
