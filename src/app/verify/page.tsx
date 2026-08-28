"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { HiAcademicCap, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HiAcademicCap className="text-4xl text-campus-400" />
          <h1 className="text-3xl font-bold text-gradient">CampusConnect</h1>
        </div>

        <div className="glass rounded-2xl p-8">
          {error ? (
            <>
              <HiExclamationCircle className="text-5xl text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
              <p className="text-gray-400 mb-6">
                {error === "expired"
                  ? "This verification link has expired. Please register again."
                  : "Invalid verification link. Please check your email and try again."}
              </p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Verifying your email...</h2>
              <p className="text-gray-400">
                Please wait while we verify your @kiit.ac.in email.
              </p>
            </>
          )}

          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
