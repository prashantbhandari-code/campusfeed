"use client";

// Route-level error boundary (M1 from the code review). Catches render
// crashes in any page under the root layout and shows a recoverable UI
// instead of Next's default error page. `reset()` re-renders the failed
// segment without a full reload — keeps the session and client state.

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          An unexpected error occurred while loading this page.
          {error?.digest ? (
            <span className="block mt-2 font-mono text-xs text-gray-400">
              ref: {error.digest}
            </span>
          ) : null}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gray-200 dark:bg-dark-700 hover:bg-gray-300 dark:hover:bg-dark-600 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium transition-colors"
          >
            Reload page
          </button>
        </div>
        <button
          onClick={() => { window.location.href = "/feed"; }}
          className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Go to feed
        </button>
      </div>
    </div>
  );
}
