'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Plus,
  Search,
  Tag,
  User,
  Zap,
} from 'lucide-react';

interface Issue {
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
  html_url: string;
}

interface IssueAnalysis {
  summary: string;
  type: string;
  priority: string;
  suggested_actions: string;
  related_areas: string;
  estimated_effort: string;
  labels: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: IssueAnalysis;
  cached?: boolean;
  error?: string;
}

export default function IssuesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading } = useAuthStore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const owner = params.owner as string;
  const name = params.name as string;

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }
    if (isAuthenticated && owner && name) {
      fetchIssues();
    }
  }, [isAuthenticated, loading, router, owner, name]);

  const fetchIssues = async () => {
    try {
      setLoadingIssues(true);
      // TODO: Replace with your backend endpoint
      const response = await fetch(`https://localhost:4000/api/issueagent/get-repo-issues?owner=${owner}&repo=${name}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }
      const data = await response.json();
      setIssues(data.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoadingIssues(false);
    }
  };

  const analyzeIssue = async (issue: Issue) => {
    try {
      setAnalyzing(true);
      setSelectedIssue(issue);
      setAnalysis(null);
      // TODO: Replace with your backend endpoint
      const response = await fetch(`https://localhost:4000/api/issueagent/get-issue-agent?owner=${owner}&repo=${name}&issue_number=${issue.number}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to analyze issue');
      }
      const data: AnalysisResponse = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAnalysis(data.analysis);
      setIsCached(data.cached || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze issue');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cleanMarkdown = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').trim();
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.user.login.toLowerCase().includes(searchTerm.toLowerCase());
    // Only show open issues
    return matchesSearch && issue.state === 'open';
  });

  if (loading || loadingIssues) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading issues...</p>
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
              <button
                onClick={() => router.push(`/dashboard/repo/${owner}/${name}`)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Repository
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Issues
              </h1>
              <p className="text-lg text-gray-600">
                {owner} / {name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {issues.length} Issues
                </span>
              </div>
              <a
                href={`https://github.com/${owner}/${name}/issues`}
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
                placeholder="Search issues by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

        {/* Issues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues</h2>
            {filteredIssues.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
                <p className="text-gray-500">No issues match your current filters.</p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.number}
                  className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 cursor-pointer transition-all hover:shadow-xl ${
                    selectedIssue?.number === issue.number ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => analyzeIssue(issue)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-2">
                          #{issue.number} {issue.title}
                        </h3>
                        {issue.state === 'closed' && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Closed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {issue.body || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <img
                          src={issue.user.avatar_url}
                          alt={issue.user.login}
                          className="w-5 h-5 rounded-full mr-1"
                        />
                        <span>{issue.user.login}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(issue.updated_at)}
                      </div>
                    </div>
                  </div>
                  {issue.labels.length > 0 && (
                    <div className="flex items-center mt-3 space-x-2">
                      {issue.labels.slice(0, 3).map((label, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: parseInt(label.color, 16) > 0x888888 ? 'white' : 'black',
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="text-xs text-gray-500">+{issue.labels.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Analysis Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis</h2>
            {!selectedIssue && (
              <div className="bg-white rounded-xl p-8 text-center">
                <Zap className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an issue to analyze</h3>
                <p className="text-gray-500">Click on any issue to get AI-powered analysis.</p>
              </div>
            )}
            {analyzing && (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing issue...</h3>
                <p className="text-gray-500">Our AI is analyzing the issue for you.</p>
              </div>
            )}
            {selectedIssue && analysis && !analyzing && (
              <div className="space-y-4">
                {isCached && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-blue-700 text-sm font-medium">
                        Using cached analysis
                      </span>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.summary) || 'Summary not available'}</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <Tag className="h-5 w-5 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Type & Labels</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {analysis.type}
                    </span>
                    {analysis.labels && analysis.labels.split(',').map((label, idx) => (
                      <span key={idx} className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {label.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Priority</h3>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700">
                    {analysis.priority}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <Plus className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Suggested Actions</h3>
                  </div>
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{cleanMarkdown(analysis.suggested_actions) || 'Suggested actions not available'}</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <User className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Related Areas</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.related_areas) || 'Related areas not available'}</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Estimated Effort</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.estimated_effort) || 'Estimated effort not available'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 