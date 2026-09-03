"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { HiAcademicCap, HiArrowPath, HiUser, HiLockClosed, HiExclamationTriangle } from "react-icons/hi2";

export default function AcademicPage() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);
  const [rawHtml, setRawHtml] = useState("");

  const handleSync = async () => {
    if (!username || !password) { setError("Please enter your KIIT portal credentials"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kiit/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sync failed"); setLoading(false); return; }
      setSynced(true);
      setPortalData(data.data);
      setRawHtml(data.raw || "");
    } catch (e: any) { setError("Connection failed: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <HiAcademicCap className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Academic Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sync with KIIT SLcM Portal</p>
        </div>
      </div>

      {!synced ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <HiLockClosed className="w-5 h-5" />
            <span className="font-medium">Connect to KIIT Portal</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your KIIT SLcM Portal credentials to sync your academic data (attendance, courses, grades, schedule).
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
              <HiExclamationTriangle className="w-4 h-4" />
              <span>Your credentials are sent directly to the KIIT portal. We do not store your password.</span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">KIIT Portal Username</label>
              <div className="relative">
                <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. 23050123456" className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your portal password" className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSync} disabled={loading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? "Syncing..." : "Sync with KIIT Portal"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Connected to KIIT Portal</span>
            </div>
            <button onClick={() => { setSynced(false); setPortalData(null); }} className="text-sm text-blue-600 hover:text-blue-700">Re-sync</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold dark:text-white mb-3">Courses Found</h3>
              {portalData?.courses?.length > 0 ? (
                <div className="space-y-2">
                  {portalData.courses.map((c: any, i: number) => (
                    <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm dark:text-gray-300">{Array.isArray(c) ? c.join(" | ") : JSON.stringify(c)}</div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No courses parsed from portal</p>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold dark:text-white mb-3">Attendance</h3>
              {portalData?.attendance?.length > 0 ? (
                <div className="space-y-2">
                  {portalData.attendance.map((a: number, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={"h-2 rounded-full " + (a >= 75 ? "bg-green-500" : a >= 60 ? "bg-yellow-500" : "bg-red-500")} style={{width: Math.min(a, 100) + "%"}} />
                      </div>
                      <span className="text-sm font-medium dark:text-white">{a}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">No attendance data parsed</p>}
            </div>
          </div>

          {rawHtml && (
            <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <summary className="p-4 cursor-pointer text-sm font-medium dark:text-white">View Raw Portal HTML</summary>
              <pre className="p-4 text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-96 border-t border-gray-200 dark:border-gray-700">{rawHtml}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}