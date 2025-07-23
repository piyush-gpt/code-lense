"use client";
import { useState } from 'react';
import { Clock, MessageSquare, Tag, CheckCircle, Plus, User, Calendar, Zap } from 'lucide-react';

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

export default function AnalysisPanel({ issues, owner, name }: { issues: Issue[]; owner: string; name: string }) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const analyzeIssue = async (issue: Issue) => {
    try {
      setAnalyzing(true);
      setSelectedIssue(issue);
      setAnalysis(null);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/issueagent/get-issue-agent?owner=${owner}&repo=${name}&issue_number=${issue.number}`, {
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

  return (
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
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
      {/* Issue List for selection */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues</h2>
        {issues.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-500">No issues match your current filters.</p>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.number}
              className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 cursor-pointer transition-all hover:shadow-xl ${selectedIssue?.number === issue.number ? 'ring-2 ring-blue-500' : ''}`}
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
    </div>
  );
} 