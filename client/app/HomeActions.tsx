"use client";
import Link from "next/link";

export default function HomeActions({ isAuthenticated, user }: { isAuthenticated: boolean; user: any }) {
  const handleLogin = () => {
    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG!;
    window.location.href = `https://github.com/apps/${appSlug}/installations/new`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <button
        onClick={handleLogin}
        className="px-8 py-4 rounded-lg font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      >
        🔐 Install GitHub App
      </button>
      {isAuthenticated && (
        <Link
          href="/dashboard"
          className="px-8 py-4 rounded-lg font-semibold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          🚀 Go to Dashboard
        </Link>
      )}
      <Link
        href="/dashboard"
        className="px-8 py-4 rounded-lg font-semibold text-lg bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        📊 View Dashboard
      </Link>
    </div>
  );
} 