'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  ArrowLeft,
  ExternalLink,
  Clock,
  MessageSquare,
  Search,
  Send,
  Bot,
  FileCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

export default function RepoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading } = useAuthStore();
  const [repoDetail, setRepoDetail] = useState<RepoDetail | null>(null);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycleTimeMs, setCycleTimeMs] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const owner = params.owner as string;
  const name = params.name as string;

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }

    if (isAuthenticated && owner && name) {
      fetchRepoDetail();
      fetchCycleTime();
    }
  }, [isAuthenticated, loading, router, owner, name]);

  const fetchRepoDetail = async () => {
    try {
      setLoadingRepo(true);
      const response = await fetch(`https://localhost:4000/api/protected/repo-stats`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repository data');
      }

      const data = await response.json();
      const repo = data.data.find((r: RepoDetail) => r.owner === owner && r.name === name);
      
      if (!repo) {
        setError('Repository not found');
        return;
      }

      setRepoDetail(repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository data');
    } finally {
      setLoadingRepo(false);
    }
  };

  const fetchCycleTime = async () => {
    try {
      const response = await fetch(`https://localhost:4000/api/pragent/average-pr-cycle-time?repo=${name}`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const data = await response.json();
      setCycleTimeMs(data.averageCycleTimeMs);
    } catch {
      setCycleTimeMs(null);
    }
  };

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

  const formatCycleTime = (ms: number | null) => {
    if (!ms || ms <= 0) return 'No merged PRs yet';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h`;
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoadingQuery(true);
    setQueryError(null);
    setAnswer(null);

    try {
      const response = await fetch('https://localhost:4000/api/codequery/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_query: query,
          repo: `${owner}/${name}`,
          owner: owner
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data.answer);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setLoadingQuery(false);
    }
  };

  if (loading || loadingRepo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading repository details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Activity className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
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
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
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
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
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
              <div className="flex items-center space-x-4 mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  <Clock className="h-4 w-4 mr-1" />
                  Avg PR Cycle Time: {formatCycleTime(cycleTimeMs)}
                </span>
              </div>
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
              <button
                onClick={() => router.push(`/dashboard/repo/${owner}/${name}/prs`)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <GitPullRequest className="h-4 w-4 mr-2" />
                View PRs
              </button>
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

        {/* Code Query Agent */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Code Assistant</h3>
              <p className="text-sm text-gray-600">Ask questions about your codebase and get intelligent answers</p>
            </div>
          </div>

          <form onSubmit={handleQuerySubmit} className="mb-6">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about your code... (e.g., 'How does authentication work?', 'Show me the API endpoints')"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loadingQuery}
                />
              </div>
              <button
                type="submit"
                disabled={loadingQuery || !query.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
              >
                {loadingQuery ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Ask
                  </>
                )}
              </button>
            </div>
          </form>

          {queryError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{queryError}</span>
              </div>
            </div>
          )}

          {answer && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start mb-4">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <FileCode className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Answer</h4>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-gray-700 leading-relaxed">
                      <ReactMarkdown
                        components={{
                          // Custom components for better styling
                          h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-base font-semibold text-gray-800 mb-2 mt-3">{children}</h4>,
                          p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-700 leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                          code: ({ children, className }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg my-3"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto my-3">{children}</pre>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-3">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="border-gray-300 my-6" />,
                          a: ({ children, href }) => (
                            <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {answer}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Example Queries */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Try asking:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "How does authentication work?",
                "Show me the API endpoints",
                "What's the main entry point?",
                "How is data stored?",
                "Explain the routing system",
                "What testing framework is used?"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

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