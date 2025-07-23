 "use client";
import { useState } from 'react';
import { Search, Send, Activity, FileCode } from 'lucide-react';
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

export default function CodeQueryClient({ repo, user }: { repo: RepoDetail; user: any }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoadingQuery(true);
    setQueryError(null);
    setAnswer(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/codequery/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_query: query,
          repo: `${repo.owner}/${repo.name}`,
          owner: repo.owner
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

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
          <FileCode className="h-6 w-6 text-white" />
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
  );
}
