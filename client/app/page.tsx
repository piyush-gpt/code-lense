import { cookies } from 'next/headers';
import HomeActions from './HomeActions';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('devdash_session')?.value;
  let isAuthenticated = false;
  let user: any = null;

  async function fetchUserWithRefresh() {
    console.log('Fetching user with refresh');
    console.log('Token:', token);
    // Try to fetch user info
    try{
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/user/me`, {
      headers: { Cookie: `devdash_session=${token}` },
      cache: 'no-store',
      credentials: 'include',
    });
    const userData = await userRes.json();
    console.log('User data:', userData);
    if (userRes.ok && userData.success) {
      return userData.user;
    }
    // If unauthorized, try to refresh
    if (userRes.status === 401 || userRes.status === 403) {
      console.log('Refreshing token');
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/user/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { Cookie: `devdash_session=${token}` },
      });
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.success) {
        console.log('Token refreshed');
        // Try again to fetch user info
        const userRes2 = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/api/user/me`, {
          headers: { Cookie: `devdash_session=${token}` },
          cache: 'no-store',
          credentials: 'include',
        });
        const userData2 = await userRes2.json();
        if (userRes2.ok && userData2.success) {
          return userData2.user;
        }
      }
    } }
    catch (error) {
      console.error('Error fetching user:', error);
    }
    return null;
  }

  if (token) {
    try {
      user = await fetchUserWithRefresh();
      if (user) isAuthenticated = true;
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CodeLense
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user && (
                <span className="text-sm text-gray-600">
                  Welcome, {user.account_login}!
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Supercharge Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                GitHub Workflow
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect your GitHub repositories and unlock powerful insights, 
              automated workflows, and intelligent analytics to boost your development productivity.
            </p>

            {/* Action Buttons */}
            <HomeActions isAuthenticated={isAuthenticated} user={user} />

            {/* Status Indicator */}
            <div className="mt-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                isAuthenticated 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                {isAuthenticated ? 'Connected to GitHub' : 'Not connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative bg-white/50 backdrop-blur-sm py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to streamline your GitHub workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Analytics Dashboard</h3>
              <p className="text-gray-600">
                Get insights into your repository activity, pull requests, and team performance.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Insights</h3>
              <p className="text-gray-600">
                Intelligent analysis of your codebase and development patterns.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Automated Workflows</h3>
              <p className="text-gray-600">
                Streamline your development process with smart automation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
