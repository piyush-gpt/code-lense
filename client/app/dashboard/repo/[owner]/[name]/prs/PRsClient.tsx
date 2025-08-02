"use client";
import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  GitPullRequest,
  ExternalLink,
  Search,
  Tag
} from 'lucide-react';
import AnalysisPanel from './AnalysisPanel';

interface PR {
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  additions: number;
  deletions: number;
  changed_files: number;
  draft: boolean;
  html_url: string;
}

export default function PRsClient({ prs, owner, name, user, error }: {
  prs: PR[];
  owner: string;
  name: string;
  user: any;
  error: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredPRs = prs.filter(pr =>
    (pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.user.login.toLowerCase().includes(searchTerm.toLowerCase())) &&
    pr.state === 'open'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href={`/dashboard/repo/${owner}/${name}`} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Repository
              </Link>
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CodeLense
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.account_login}!
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pull Requests
              </h1>
              <p className="text-lg text-gray-600">
                {owner} / {name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GitPullRequest className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {filteredPRs.length} PRs
                </span>
              </div>
              <a
                href={`https://github.com/${owner}/${name}/pulls`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search PRs by title or author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* PRs Analysis Panel (Client Component) */}
        <AnalysisPanel prs={filteredPRs} owner={owner} name={name} />
      </div>
    </div>
  );
} 