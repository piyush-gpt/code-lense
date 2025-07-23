"use client";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

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

export default function IssueSearch({ issues, onFiltered }: { issues: Issue[]; onFiltered: (filtered: Issue[]) => void }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.user.login.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    onFiltered(filteredIssues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, issues.length]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search issues by title or author..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
} 