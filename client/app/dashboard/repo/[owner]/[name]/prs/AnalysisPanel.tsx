"use client";
import { useState } from 'react';
import { Clock, MessageSquare, Tag, CheckCircle, Plus, User, Calendar, Zap, Shield, TestTube, ClipboardList, GitBranch, XCircle, GitPullRequest } from 'lucide-react';

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

export default function AnalysisPanel({ prs, owner, name }: { prs: PR[]; owner: string; name: string }) {
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ciTestResults, setCiTestResults] = useState<any>({});

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const cleanMarkdown = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').trim();
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

  const getRiskColor = (risk: string) => {
    if (!risk) return 'text-gray-600 bg-gray-100';
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return 'text-green-600 bg-green-100';
    if (riskLower.includes('medium')) return 'text-yellow-600 bg-yellow-100';
    if (riskLower.includes('high')) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const analyzePR = async (pr: PR) => {
    try {
      setAnalyzing(true);
      setSelectedPR(pr);
      setAnalysis(null);
      setError(null);
      setCiTestResults({});
      const response = await fetch(`${API_BASE_URL}/api/pragent/get-pr-agent?owner=${owner}&repo=${name}&pr_number=${pr.number}`, {
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
      const ciResp = await fetch(`${API_BASE_URL}/api/pragent/ci-test-results?owner=${owner}&repo=${name}&prNumber=${pr.number}`, {
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

  return (
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      {selectedPR && analysis && !analyzing && (
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
      {/* PR List for selection */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pull Requests</h2>
        {prs.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No PRs found</h3>
            <p className="text-gray-500">No pull requests match your current filters.</p>
          </div>
        ) : (
          prs.map((pr) => (
            <div
              key={pr.number}
              className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 cursor-pointer transition-all hover:shadow-xl ${selectedPR?.number === pr.number ? 'ring-2 ring-blue-500' : ''}`}
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
    </div>
  );
} 