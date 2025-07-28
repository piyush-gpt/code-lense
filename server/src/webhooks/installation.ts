// installation.ts - Installation webhook handlers
import { Webhooks } from "@octokit/webhooks";
import { createInstallation, findInstallationByAccountId, deleteInstallationByAccountId } from "../database/functions/installation.ts";
import { deleteAllPRAnalysesForAccount, getAllAnalysesForAccount } from "../database/functions/prAnalysis.ts";
import { deleteAllIssueAnalysesForAccount } from "../database/functions/issueAnalysis.ts";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { config } from '../config/config.ts';
import RepoFileList from '../models/RepoFileList.ts';

async function getInstallationOctokit(installationId: number) {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_PRIVATE_KEY,
      installationId: installationId,
    },
  });
  return octokit;
}
console.log(config.GITHUB_PRIVATE_KEY);

// Helper to fetch all filepaths in a repo using the GitHub API
type RepoObj = { full_name: string, name: string, default_branch?: string };
async function fetchRepoFilepaths(octokit: Octokit, owner: string, repo: string, branch = 'main') {
  try {
    // Get the default branch if not provided
    if (!branch) {
      const repoResp = await octokit.repos.get({ owner, repo });
      branch = repoResp.data.default_branch;
    }
    // Get the tree SHA for the branch
    const branchResp = await octokit.repos.getBranch({ owner, repo, branch });
    const treeSha = branchResp.data.commit.commit.tree.sha;
    // Get the full tree recursively
    const treeResp = await octokit.git.getTree({ owner, repo, tree_sha: treeSha, recursive: 'true' });
    return treeResp.data.tree
      .filter(item => item.type === 'blob')
      .map(item => item.path);
  } catch (err) {
    console.error(`❌ Failed to fetch filepaths for ${owner}/${repo}:`, err);
    return [];
  }
}

export function setupInstallationWebhooks(webhooks: Webhooks) {
  // Webhook event: installation.created
  webhooks.on("installation.created", async ({ payload }) => {
    const installationId = payload.installation.id;
    const account = payload.installation.account as any;
    const accountLogin = account?.login || "unknown";
    const accountId = account?.id || 0;
    const accountType = account?.type || "User";
    
    console.log("📦 Installation created:", { accountLogin, installationId, accountId });

    try {
      // Check if installation already exists for this account
      const existingInstallation = await findInstallationByAccountId(accountId);
      
      if (existingInstallation) {
        console.log("✅ Installation already exists for account, updating details");
        // Update with complete information from webhook, including new installation ID
        existingInstallation.installationId = installationId; // Update to new installation ID
        existingInstallation.accountLogin = accountLogin;
        existingInstallation.accountId = accountId;
        existingInstallation.accountType = accountType as 'User' | 'Organization';
        existingInstallation.permissions = payload.installation.permissions;
        existingInstallation.repositories = payload.repositories?.map(repo => repo.full_name) || [];
        await existingInstallation.save();
      } else {
        // Create new installation with complete data
        await createInstallation({
          installationId,
          accountLogin,
          accountId,
          accountType: accountType as 'User' | 'Organization',
          permissions: payload.installation.permissions,
          repositories: payload.repositories?.map(repo => repo.full_name) || []
        });
      }
      
      console.log("✅ Installation data saved to database");

      const octokit = await getInstallationOctokit(installationId);
      if (payload.repositories && Array.isArray(payload.repositories)) {
        for (const repoObj of payload.repositories as RepoObj[]) {
          const owner = repoObj.full_name.split('/')[0];
          const repo = repoObj.name;
          const branch = repoObj.default_branch || 'main';
          const filepaths = await fetchRepoFilepaths(octokit, owner, repo, branch);
          await RepoFileList.findOneAndUpdate(
            { accountId, repo: repoObj.full_name },
            { filepaths, updatedAt: new Date() },
            { upsert: true, new: true }
          );
          console.log(`✅ Updated file list for ${repoObj.full_name} (${filepaths.length} files)`);
        }
      }
      // === END NEW ===
    } catch (error) {
      console.error("❌ Failed to save installation data:", error);
    }
  });

  // Webhook event: push (update file list only when files are added/removed on default branch)
  webhooks.on("push", async ({ payload }) => {
    try {
      //@ts-ignore
      const installationId = payload.installation.id;
      //@ts-ignore
      const accountId = payload.repository.owner.id;
      //@ts-ignore
      const repoFullName = payload.repository.full_name;
      //@ts-ignore
      const owner = payload.repository.owner.login;
      //@ts-ignore
      const repo = payload.repository.name;
      const branch = payload.ref.replace('refs/heads/', '');
      const defaultBranch = payload.repository.default_branch;

      // Only process if push is to the default branch
      if (branch === defaultBranch) {
        // Check if any files were added or removed in this push
        let hasFileChanges = false;

        // Check all commits in this push for file changes
        if (payload.commits && Array.isArray(payload.commits)) {
          for (const commit of payload.commits) {
            //@ts-ignore
            if (commit.added && commit.added.length > 0) {
              hasFileChanges = true;
            }
            //@ts-ignore
            if (commit.removed && commit.removed.length > 0) {
              hasFileChanges = true;
            }
          }
        }

        // Only update file list if files were actually added or removed
        if (hasFileChanges) {
          console.log(`📁 File changes detected in ${repoFullName}:`);

          const octokit = await getInstallationOctokit(installationId);
          const filepaths = await fetchRepoFilepaths(octokit, owner, repo, branch);
          await RepoFileList.findOneAndUpdate(
            { accountId, repo: repoFullName },
            { filepaths, updatedAt: new Date() },
            { upsert: true, new: true }
          );
          console.log(`✅ Updated file list for ${repoFullName} after file changes (${filepaths.length} files)`);
        } else {
          console.log(`⏭️ Skipping file list update for ${repoFullName} - no files added/removed`);
        }
      }
    } catch (err) {
      console.error('❌ Failed to update file list on push event:', err);
    }
  });

  // Webhook event: installation.deleted
  webhooks.on("installation.deleted", async ({ payload }) => {
    const installationId = payload.installation.id;
    const account = payload.installation.account as any;
    const accountLogin = account?.login || "unknown";
    const accountId = account?.id || 0;
    console.log("🗑️ Installation deleted:", { accountLogin, installationId, accountId });

    try {
      // Get all PR analyses for this account to delete comments
      const analyses = await getAllAnalysesForAccount(accountId);
      
      if (analyses.length > 0) {
        // Get Octokit instance for this installation
        const octokit = await getInstallationOctokit(installationId);
        
        // Delete all comments
        for (const analysis of analyses) {
          if (analysis.commentId) {
            try {
              await octokit.issues.deleteComment({
                owner: analysis.owner,
                repo: analysis.repo,
                comment_id: analysis.commentId
              });
              console.log(`🗑️ Deleted comment ${analysis.commentId} for PR #${analysis.prNumber}`);
            } catch (error) {
              console.error(`❌ Failed to delete comment ${analysis.commentId}:`, error);
            }
          }
          // Delete CI comment if it exists
          if (analysis.cicommentId) {
            try {
              await octokit.issues.deleteComment({
                owner: analysis.owner,
                repo: analysis.repo,
                comment_id: analysis.cicommentId
              });
              console.log(`🗑️ Deleted CI comment ${analysis.cicommentId} for PR #${analysis.prNumber}`);
            } catch (error) {
              console.error(`❌ Failed to delete CI comment ${analysis.cicommentId}:`, error);
            }
          }
        }
      }

      // Delete all PR analyses for this account
      const deletedAnalyses = await deleteAllPRAnalysesForAccount(accountId);
      console.log(`🗑️ Deleted ${deletedAnalyses.deletedCount} PR analyses for account ${accountLogin}`);
      
      // Delete all Issue analyses for this account
      const deletedIssueAnalyses = await deleteAllIssueAnalysesForAccount(accountId);
      console.log(`🗑️ Deleted ${deletedIssueAnalyses.deletedCount} issue analyses for account ${accountLogin}`);
      
      // Delete all RepoStats for this account
      
      // Delete all RepoFileList entries for this account
      const deletedRepoFileLists = await RepoFileList.deleteMany({ accountId });
      console.log(`🗑️ Deleted ${deletedRepoFileLists.deletedCount} repo file lists for account ${accountLogin}`);
      
      // Delete the installation
      await deleteInstallationByAccountId(accountId);
      console.log("✅ Installation deleted from database");
    } catch (error) {
      console.error("❌ Failed to delete installation and PR analyses from database:", error);
    }
  });
} 
