'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { 
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
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  TestTube,
  ClipboardList,
  GitBranch,
  User,
  Tag
} from 'lucide-react';

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

interface PRAnalysis {
  pr_title: string;
  pr_body: string;
  changed_files: any[];
  issues: string[];
  summary: string;
  risk: string;
  suggested_tests: string;
  checklist: string;
  affected_modules: string;
  matched_issues: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: PRAnalysis;
  cached?: boolean;
  error?: string;
}

export default function PRsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading } = useAuthStore();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loadingPRs, setLoadingPRs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'open' | 'draft'>('all');
  const [ciTestResults, setCiTestResults] = useState<any>({});

  const owner = params.owner as string;
  const name = params.name as string;

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }

    if (isAuthenticated && owner && name) {
      fetchPRs();
    }
  }, [isAuthenticated, loading, router, owner, name]);

  const fetchPRs = async () => {
    try {
      setLoadingPRs(true);
      const response = await fetch(`https://localhost:4000/api/pragent/get-repo-prs?owner=${owner}&repo=${name}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PRs');
      }

      const data = await response.json();
      setPrs(data.prs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoadingPRs(false);
    }
  };


  const analyzePR = async (pr: PR) => {
    try {
      setAnalyzing(true);
      setSelectedPR(pr);
      setCiTestResults({});
      
      const response = await fetch(`https://localhost:4000/api/pragent/get-pr-agent?owner=${owner}&repo=${name}&pr_number=${pr.number}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to analyze PR');
      }

      const data: AnalysisResponse = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAnalysis(data.analysis);
      setIsCached(data.cached || false);
      // Fetch filtered CI test results for this PR
      const ciResp = await fetch(`https://localhost:4000/api/pragent/ci-test-results?owner=${owner}&repo=${name}&prNumber=${pr.number}`, {
        credentials: 'include',
      });
      if (ciResp.ok) {
        const ciData = await ciResp.json();
        setCiTestResults(ciData.ciTestResults || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze PR');
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
      minute: '2-digit'
    });
  };

  const getRiskColor = (risk: string) => {
    if (!risk) return 'text-gray-600 bg-gray-100';
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return 'text-green-600 bg-green-100';
    if (riskLower.includes('medium')) return 'text-yellow-600 bg-yellow-100';
    if (riskLower.includes('high')) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const cleanMarkdown = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').trim();
  };

  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pr.user.login.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterState === 'all' || 
                         (filterState === 'open' && !pr.draft) ||
                         (filterState === 'draft' && pr.draft);
    return matchesSearch && matchesFilter;
  });

  if (loading || loadingPRs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pull requests...</p>
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
                  {prs.length} PRs
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All PRs</option>
                <option value="open">Open PRs</option>
                <option value="draft">Draft PRs</option>
              </select>
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

        {/* PRs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PR List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pull Requests</h2>
            {filteredPRs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No PRs found</h3>
                <p className="text-gray-500">No pull requests match your current filters.</p>
              </div>
            ) : (
              filteredPRs.map((pr) => (
                <div
                  key={pr.number}
                  className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 cursor-pointer transition-all hover:shadow-xl ${
                    selectedPR?.number === pr.number ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => analyzePR(pr)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-2">
                          #{pr.number} {pr.title}
                        </h3>
                        {pr.draft && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {pr.body || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <img
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                          className="w-5 h-5 rounded-full mr-1"
                        />
                        <span>{pr.user.login}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(pr.updated_at)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-sm">
                        <Plus className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600 font-medium">+{pr.additions}</span>
                        <XCircle className="h-4 w-4 text-red-600 ml-2 mr-1" />
                        <span className="text-red-600 font-medium">-{pr.deletions}</span>
                      </div>
                    </div>
                  </div>
                  {pr.labels.length > 0 && (
                    <div className="flex items-center mt-3 space-x-2">
                      {pr.labels.slice(0, 3).map((label, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: parseInt(label.color, 16) > 0x888888 ? 'white' : 'black'
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {pr.labels.length > 3 && (
                        <span className="text-xs text-gray-500">+{pr.labels.length - 3} more</span>
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
            
            {!selectedPR && (
              <div className="bg-white rounded-xl p-8 text-center">
                <Zap className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a PR to analyze</h3>
                <p className="text-gray-500">Click on any pull request to get AI-powered analysis.</p>
              </div>
            )}

            {analyzing && (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing PR...</h3>
                <p className="text-gray-500">Our AI is analyzing the pull request for you.</p>
              </div>
            )}

            {selectedPR && analysis && !analyzing && (
              <div className="space-y-4">
                {/* Cache Status */}
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
                {/* CI Test Results */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <TestTube className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">CI Test Results</h3>
                  </div>
                  {Object.keys(ciTestResults).length === 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                      <CheckCircle className="h-4 w-4 mr-1" /> All tests passed
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(ciTestResults).map(([key, result]: any) => (
                        <div key={key} className="flex items-center text-xs font-medium rounded-full px-2 py-1 bg-red-50 text-red-700">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{result.jobName}</span>
                          <span className="ml-2">{result.status === 'flaky' ? 'Flaky' : 'Failed'}</span>
                          {result.explanation && (
                            <span className="ml-2 text-gray-500">({result.explanation})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Summary */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.summary) || 'Summary not available'}</p>
                </div>

                {/* Risk Assessment */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <Shield className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                  </div>
                  <div className="space-y-2">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysis.risk)}`}>
                      {cleanMarkdown(analysis.risk?.includes('Risk Level:') ? analysis.risk.split('Risk Level:')[1]?.split('Reason:')[0]?.trim() || 'High' : analysis.risk || 'Risk assessment not available')}
                    </div>
                    {analysis.risk?.includes('Reason:') && (
                      <p className="text-gray-700 text-sm">{cleanMarkdown(analysis.risk.split('Reason:')[1]?.trim())}</p>
                    )}
                  </div>
                </div>

                {/* Test Suggestions */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <TestTube className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Test Suggestions</h3>
                  </div>
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{cleanMarkdown(analysis.suggested_tests) || 'Test suggestions not available'}</div>
                </div>

                {/* Review Checklist */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <ClipboardList className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Review Checklist</h3>
                  </div>
                  <div className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{cleanMarkdown(analysis.checklist) || 'Review checklist not available'}</div>
                </div>

                {/* Affected Modules */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <GitBranch className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Affected Modules</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.affected_modules) || 'Affected modules not available'}</p>
                </div>

                {/* Matched Issues */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <Tag className="h-5 w-5 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Related Issues</h3>
                  </div>
                  <p className="text-gray-700">{cleanMarkdown(analysis.matched_issues) || 'Related issues not available'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 