export async function getRepoStats(octokit: any, owner: string, repo: string) {
  try {
    // Get repository details
    const repoData = await octokit.rest.repos.get({
      owner,
      repo,
    });

    const commits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 100,
    });

    // Get open pull requests
    const prs = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });

    // Get contributors (top 10)
    const contributors = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 10,
    });

    return {
      name: repoData.data.name,
      owner: repoData.data.owner.login,
      full_name: repoData.data.full_name,
      description: repoData.data.description || '',
      language: repoData.data.language || '',
      stargazers_count: repoData.data.stargazers_count,
      forks_count: repoData.data.forks_count,
      open_issues_count: repoData.data.open_issues_count,
      updated_at: repoData.data.updated_at,
      commits_count: commits.data.length,
      pull_requests_count: prs.data.length,
      contributors_count: contributors.data.length,
      html_url: repoData.data.html_url,
      default_branch: repoData.data.default_branch,
      size: repoData.data.size,
      watchers_count: repoData.data.watchers_count,
    };
  } catch (error) {
    console.error(`❌ Error fetching stats for ${owner}/${repo}:`, error);
    // Return basic data if detailed fetch fails
    return {
      name: repo,
      owner: owner,
      full_name: `${owner}/${repo}`,
      description: '',
      language: '',
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      updated_at: new Date().toISOString(),
      commits_count: 0,
      pull_requests_count: 0,
      contributors_count: 0,
      html_url: `https://github.com/${owner}/${repo}`,
      default_branch: 'main',
      size: 0,
      watchers_count: 0,
    };
  }
}
