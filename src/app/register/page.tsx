"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiAcademicCap, HiCheckCircle } from "react-icons/hi";
import { DEPARTMENTS } from "@/lib/departments";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [batchYear, setBatchYear] = useState("");
  // Optional academic identifiers — they populate the student's Info record.
  const [rollNumber, setRollNumber] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const isValidEmail = email.endsWith("@kiit.ac.in");
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct registration via server API — no Appwrite SDK involved
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          phone,
          password,
          confirmPassword,
          department,
          batchYear: parseInt(batchYear) || null,
          rollNumber: rollNumber.trim() || null,
          section: section.trim() || null,
          currentSemester: parseInt(semester) || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      setRegisteredEmail(email);
      setRegistered(true);
      toast.success("Account created! Redirecting to login...");
      
      // Redirect to login after brief success display
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // Direct Google OAuth — bypasses Appwrite entirely
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HiAcademicCap className="text-4xl text-campus-400" />
            <h1 className="text-4xl font-bold text-gradient">Campusfeed</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-3">Create your student account</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-campus-600/20 border border-campus-500/30 rounded-full">
            <HiCheckCircle className="text-campus-400 text-sm" />
            <span className="text-sm text-campus-700 dark:text-campus-300 font-medium">KIIT Students Only 🔒</span>
          </div>
        </div>

        {registered ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2 text-green-400">Account Created Successfully!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">You can now login</p>
            <p className="text-gray-900 dark:text-white font-semibold mb-6">{registeredEmail}</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 space-y-5">
            {/* Google Sign-Up Button */}
            <button
              onClick={handleGoogleSignUp}
              className="w-full py-3 bg-white dark:bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 border border-gray-200 dark:border-transparent"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
              <span className="text-xs text-gray-400 dark:text-gray-500">or register with email</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">1. Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">2. Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  placeholder="Choose a unique username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">3. Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white ${
                      email && !isValidEmail ? "border-red-500" : "border-gray-200 dark:border-dark-500"
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
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">4. Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">5. Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">6. Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white ${
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

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">7. Branch</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select your branch</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">8. Batch</label>
                <select
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
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

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">9. Roll number <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 23053912"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">10. Section <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. CSE-4B"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">11. Semester <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                  >
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isValidEmail || !passwordsMatch}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
                ) : (
                  "Join Campusfeed"
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
