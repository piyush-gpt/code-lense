import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PRsClient from './PRsClient';

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

export default async function PRsPage(props: { params: { owner: string; name: string } }) {
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

  let prs: PR[] = [];
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

    // Fetch PRs
    const prsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/pragent/get-repo-prs?owner=${owner}&repo=${name}`, {
      headers: { Cookie: `devdash_session=${token}` },
      cache: 'no-store',
        credentials: 'include',
      next: { tags: ['prs'] },
      });
    const prsData = await prsRes.json();
    if (!prsRes.ok) throw new Error(prsData.error || 'Failed to fetch PRs');
    prs = prsData.prs;
    } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load pull requests';
    }

  return (
    <PRsClient prs={prs} owner={owner} name={name} user={user} error={error} />
  );
} 