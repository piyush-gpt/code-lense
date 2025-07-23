import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
  ExternalLink,
  Clock,
  MessageSquare,
  Bot,
  FileCode
} from 'lucide-react';
import CodeQueryClient from './CodeQueryClient';

interface RepoDetail {
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
  html_url: string;
  default_branch: string;
  size: number;
  watchers_count: number;
}

export default async function RepoDetailPage(props: { params: { owner: string; name: string } }) {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get('devdash_session')?.value;
  const owner = params.owner;
  const name = params.name;
  let isAuthenticated = false;
  let user: any = null;

  if (token) {
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/user/me`, {
        headers: { Cookie: `devdash_session=${token}` },
        cache: 'no-store',
        credentials: 'include',
      });
      const userData = await userRes.json();
      if (userRes.ok && userData.success) {
        isAuthenticated = true;
        user = userData.user;
      }
    } catch {}
  }

  if (!isAuthenticated) {
    redirect('/');
  }

  let repoDetail: RepoDetail | null = null;
  let error: string | null = null;
  try {
    // Fetch user info
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/user/me`, {
      headers: { Cookie: `devdash_session=${token}` },
      cache: 'no-store',
      credentials: 'include',
      next: { tags: ['user'] },
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData.success) throw new Error(userData.error || 'Failed to fetch user');
    user = userData.user;

    // Fetch repo stats
    const repoRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/protected/repo-stats`, {
      headers: { Cookie: `devdash_session=${token}` },
      cache: 'no-store',
      credentials: 'include',
      next: { tags: ['repo-stats'] },
    });
    const repoData = await repoRes.json();
    if (!repoRes.ok) throw new Error(repoData.error || 'Failed to fetch repo stats');
    repoDetail = repoData.data.find((r: RepoDetail) => r.owner === owner && r.name === name) || null;
    if (!repoDetail) throw new Error('Repository not found');
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load repository';
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (sizeInKB: number) => {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`;
    } else {
      return `${(sizeInKB / 1024).toFixed(1)} MB`;
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Activity className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/dashboard" className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!repoDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Repository not found</h3>
            <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
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
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Repository Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <h1 className="text-3xl font-bold text-gray-900 mr-4">
                  {repoDetail.name}
                </h1>
                {repoDetail.language && (
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getLanguageColor(repoDetail.language)} mr-2`}></div>
                    <span className="text-sm text-gray-600">{repoDetail.language}</span>
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-600 mb-2">
                {repoDetail.owner} / {repoDetail.name}
              </p>
              {repoDetail.description && (
                <p className="text-gray-700 mb-4">{repoDetail.description}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <GitBranch className="h-4 w-4 mr-1" />
                  {repoDetail.default_branch}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Updated {formatDate(repoDetail.updated_at)}
                </div>
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {repoDetail.watchers_count} watchers
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href={`/dashboard/repo/${owner}/${name}/prs`} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                <GitPullRequest className="h-4 w-4 mr-2" />
                View PRs
              </Link>
              <Link href={`/dashboard/repo/${owner}/${name}/issues`} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                <MessageSquare className="h-4 w-4 mr-2" />
                View Issues
              </Link>
              <a
                href={repoDetail.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stars</p>
                <p className="text-2xl font-bold text-gray-900">{repoDetail.stargazers_count.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <GitBranch className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Forks</p>
                <p className="text-2xl font-bold text-gray-900">{repoDetail.forks_count.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GitCommit className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Commits</p>
                <p className="text-2xl font-bold text-gray-900">{repoDetail.commits_count.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900">{repoDetail.pull_requests_count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Size</span>
                <span className="font-medium">{formatSize(repoDetail.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Open Issues</span>
                <span className="font-medium">{repoDetail.open_issues_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contributors</span>
                <span className="font-medium">{repoDetail.contributors_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Watchers</span>
                <span className="font-medium">{repoDetail.watchers_count}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <GitCommit className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Recent Commits</span>
                </div>
                <span className="text-sm font-bold text-blue-600">{repoDetail.commits_count}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <GitPullRequest className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Active PRs</span>
                </div>
                <span className="text-sm font-bold text-purple-600">{repoDetail.pull_requests_count}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Contributors</span>
                </div>
                <span className="text-sm font-bold text-green-600">{repoDetail.contributors_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Code Query Agent (Client Component) */}
        <CodeQueryClient repo={repoDetail} user={user} />

        {/* Coming Soon Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 mr-3" />
            <h3 className="text-xl font-semibold">More Analytics Coming Soon</h3>
          </div>
          <p className="text-blue-100 mb-4">
            We're working on bringing you detailed analytics including commit history, 
            contributor insights, pull request trends, and more advanced metrics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Commit History Timeline
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Contributor Analytics
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              PR Review Insights
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 