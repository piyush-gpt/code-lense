'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { 
  GitBranch, 
  GitPullRequest, 
  GitCommit, 
  Star, 
  Eye, 
  Calendar,
  TrendingUp,
  Users,
  Activity,
  ExternalLink
} from 'lucide-react';

interface RepoStats {
  name: string;
  owner: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  commits_count: number;
  pull_requests_count: number;
  contributors_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();
  const [repoStats, setRepoStats] = useState<RepoStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }

    if (isAuthenticated) {
      fetchRepoStats();
    }
  }, [isAuthenticated, loading, router]);

  const fetchRepoStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('https://localhost:4000/api/protected/repo-stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repo stats');
      }

      const data = await response.json();
      setRepoStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'JavaScript': 'bg-yellow-400',
      'TypeScript': 'bg-blue-500',
      'Python': 'bg-green-500',
      'Java': 'bg-red-500',
      'C++': 'bg-pink-500',
      'Go': 'bg-cyan-500',
      'Rust': 'bg-orange-500',
      'PHP': 'bg-purple-500',
      'Ruby': 'bg-red-400',
      'Swift': 'bg-orange-400',
    };
    return colors[language] || 'bg-gray-400';
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DevDashAI
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.account_login}!
              </span>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Repository Analytics
          </h1>
          <p className="text-gray-600">
            Insights and statistics for your GitHub repositories
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Activity className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading repository stats
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {repoStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GitBranch className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Repositories</p>
                  <p className="text-2xl font-bold text-gray-900">{repoStats.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <GitCommit className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Commits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {repoStats.reduce((sum, repo) => sum + repo.commits_count, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GitPullRequest className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Open PRs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {repoStats.reduce((sum, repo) => sum + repo.pull_requests_count, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Stars</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {repoStats.reduce((sum, repo) => sum + repo.stargazers_count, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repositories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repoStats.map((repo) => (
            <div
              key={repo.full_name}
              onClick={() => router.push(`/dashboard/repo/${repo.owner}/${repo.name}`)}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer group hover:scale-105"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {repo.name}
                  </h3>
                  <p className="text-sm text-gray-500">{repo.owner}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Description */}
              {repo.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {repo.description}
                </p>
              )}

              {/* Language */}
              {repo.language && (
                <div className="flex items-center mb-4">
                  <div className={`w-3 h-3 rounded-full ${getLanguageColor(repo.language)} mr-2`}></div>
                  <span className="text-sm text-gray-600">{repo.language}</span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{repo.stargazers_count}</span>
                  </div>
                  <p className="text-xs text-gray-500">Stars</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <GitBranch className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{repo.forks_count}</span>
                  </div>
                  <p className="text-xs text-gray-500">Forks</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <GitCommit className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{repo.commits_count}</span>
                  </div>
                  <p className="text-xs text-gray-500">Commits</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <GitPullRequest className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{repo.pull_requests_count}</span>
                  </div>
                  <p className="text-xs text-gray-500">PRs</p>
                </div>
              </div>

              {/* Updated Date */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  Updated {formatDate(repo.updated_at)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loadingStats && repoStats.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <GitBranch className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
            <p className="text-gray-500">
              Install the GitHub app on your repositories to see analytics here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}