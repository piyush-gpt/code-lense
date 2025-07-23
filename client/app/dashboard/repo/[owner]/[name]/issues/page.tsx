import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import IssuesClient from './IssuesClient';

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

export default async function IssuesPage(props: { params: { owner: string; name: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('devdash_session')?.value;
  const params = await props.params;
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

  let issues: Issue[] = [];
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

    // Fetch issues
    const issuesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/issueagent/get-repo-issues?owner=${owner}&repo=${name}`, {
      headers: { Cookie: `devdash_session=${token}` },
      cache: 'no-store',
      credentials: 'include',
      next: { tags: ['issues'] },
    });
    const issuesData = await issuesRes.json();
    if (!issuesRes.ok) throw new Error(issuesData.error || 'Failed to fetch issues');
    issues = issuesData.issues;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load issues';
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <IssuesClient issues={issues} owner={owner} name={name} user={user} error={error} />
  );
} 