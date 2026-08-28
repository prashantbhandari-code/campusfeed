"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle, HiMail } from "react-icons/hi";

const DEPARTMENTS = [
  "CSE", "CSE (Data Science)", "CSE (AI & ML)", "CSE (IoT)", "CSE (Cyber Security)",
  "IT", "ECE", "EEE", "Mechanical", "Civil",
  "Electrical", "Biotechnology", "Chemical", "Aerospace",
  "Automobile", "Mechatronics", "Architecture", "Law",
  "Management", "Media & Communication", "Design"
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const isValidEmail = email.endsWith("@kiit.ac.in");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, rollNumber, department, batchYear }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      // Show email verification message
      setRegisteredEmail(email);
      setRegistered(true);
      toast.success("Account created! Check your email to verify.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">CampusConnect</h1>
          </div>
          <p className="text-gray-400 mb-3">Create your student account</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-campus-600/20 border border-campus-500/30 rounded-full">
            <HiCheckCircle className="text-campus-400 text-sm" />
            <span className="text-sm text-campus-300 font-medium">KIIT Students Only 🔒</span>
          </div>
        </div>

        {registered ? (
          <div className="glass rounded-2xl p-8 text-center">
            <HiMail className="text-5xl text-primary-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Check your email!</h2>
            <p className="text-gray-400 mb-2">
              We sent a verification link to
            </p>
            <p className="text-white font-semibold mb-4">{registeredEmail}</p>
            <p className="text-gray-500 text-sm mb-6">
              Click the link in the email to verify your account, then come back to sign in.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : (
        <div className="glass rounded-2xl p-8 space-y-5">
          {/* Google Sign-In Button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/feed" })}
            className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-semibold transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>

          {/* GitHub Sign-Up Button */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/feed" })}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign up with GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or register with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="johndoe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">KIIT Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors ${
                  email && !isValidEmail ? "border-red-500" : "border-dark-500"
                }`}
                placeholder="yourname@kiit.ac.in"
                required
              />
              {email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidEmail ? (
                    <HiCheckCircle className="text-green-400 text-xl" />
                  ) : (
                    <span className="text-red-400 text-xs">Must be @kiit.ac.in</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <div className="border-t border-white/10 pt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Student Info (Optional)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="e.g., 2305011000XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department / Branch</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-200"
                >
                  <option value="">Select your branch</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Batch Year</label>
                <select
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-200"
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
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isValidEmail}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
            ) : (
              "Join CampusConnect"
            )}
          </button>
          </form>
        </div>
        )}

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
