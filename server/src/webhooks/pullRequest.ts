// pullRequest.ts - Pull Request webhook handlers
import { Webhooks } from "@octokit/webhooks";
import { savePRAnalysis, deletePRAnalysis, updatePRAnalysisCommentId, findPRAnalysis, updatePRAnalysisCICommentId, updatePRAnalysisRefactorCommentId, updatePRAnalysisRefactorSuggestions } from "../database/functions/prAnalysis.ts";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { config } from '../config/config.ts';
import axios from "axios";
import crypto from "crypto";

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

async function postOrUpdateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  analysis: any,
  existingCommentId?: number
) {
  const commentBody = `### 🤖 PR Agent Analysis

**Summary**: ${analysis.summary}

**Risk Level**: ${analysis.risk}

**Suggested Tests**:
${analysis.suggested_tests}

**Checklist**:
${analysis.checklist}

**Affected Modules**: ${analysis.affected_modules}
---

_This comment was generated automatically by CodeLense PR Agent_ 🚀`;

  try {
    if (existingCommentId) {
      // Try to update existing comment
      try {
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: existingCommentId,
          body: commentBody
        });
        console.log(`✅ Updated existing comment ${existingCommentId} for PR #${prNumber}`);
      } catch (updateError: any) {
        // If comment doesn't exist (404), create a new one
        if (updateError.status === 404) {
          console.log(`⚠️ Comment ${existingCommentId} not found, creating new comment`);
          const response = await octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: commentBody
          });
          console.log(`✅ Created new comment ${response.data.id} for PR #${prNumber}`);
          return response.data.id;
        } else {
          throw updateError;
        }
      }
    } else {
      // Create new comment
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody
      });
      console.log(`✅ Created new comment ${response.data.id} for PR #${prNumber}`);
      return response.data.id;
    }
  } catch (error) {
    console.error("❌ Failed to post/update comment:", error);
    throw error;
  }
}

async function postOrUpdateRefactorComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  refactorBody: string,
  existingCommentId?: number
) {
  try {
    if (existingCommentId) {
      // Try to update existing comment
      try {
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: existingCommentId,
          body: refactorBody
        });
        console.log(`✅ Updated existing refactor comment ${existingCommentId} for PR #${prNumber}`);
      } catch (updateError: any) {
        // If comment doesn't exist (404), create a new one
        if (updateError.status === 404) {
          console.log(`⚠️ Refactor comment ${existingCommentId} not found, creating new comment`);
          const response = await octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: refactorBody
          });
          console.log(`✅ Created new refactor comment ${response.data.id} for PR #${prNumber}`);
          return response.data.id;
        } else {
          throw updateError;
        }
      }
    } else {
      // Create new comment
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: refactorBody
      });
      console.log(`✅ Created new refactor comment ${response.data.id} for PR #${prNumber}`);
      return response.data.id;
    }
  } catch (error) {
    console.error("❌ Failed to post/update refactor comment:", error);
    throw error;
  }
}

async function analyzeAndSavePR(
  installationId: number,
  accountId: number,
  owner: string,
  repoName: string,
  prNumber: number,
  prTitle: string,
  prBody: string
) {
  try {
    // Get Octokit instance for this installation
    const octokit = await getInstallationOctokit(installationId);

    // Get changed files using Octokit
    const filesResp = await octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    const changedFiles = filesResp.data
      .slice(0, 10)  // Limit to top 10 files
      .map((f: any) => ({
        filename: f.filename,
        patch: f.patch ? f.patch.split("\n").slice(0, 100).join("\n") : "(no patch)"
      }));
     
    console.log("changedFiles:", changedFiles);
    // Early exit if both PR body and changed files are missing
    if (!prBody && changedFiles.length === 0) {
      await octokit.issues.createComment({
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `⚠️ Not enough data to analyze this PR (missing description and changed files). Please add a description or commit some changes.`
      });
      console.warn(`⚠️ Skipped PR #${prNumber} in ${owner}/${repoName}: missing description and changed files.`);
      return;
    }

    // === HASH OPTIMIZATION: Short-circuit if content unchanged ===
    const contentToHash = JSON.stringify({ prTitle, prBody, changedFiles });
    const contentHash = crypto.createHash("sha256").update(contentToHash).digest("hex");
    // Try to get last analysis (for this PR)
    const lastAnalysis = await findPRAnalysis(accountId, owner, repoName, prNumber);
    if (lastAnalysis && lastAnalysis.contentHash === contentHash) {
      console.log(`⏩ Skipping analysis for PR #${prNumber} in ${owner}/${repoName}: content unchanged.`);
      return;
    }
    console.log("now doing analysis______________________________")

    // Run both PR analysis and refactor analysis in parallel
    console.log("Making requests to agent endpoints...");
    const [analysisResponse, refactorResponse] = await Promise.all([
      axios.post("http://localhost:8000/analyze-pr", {
        pr_title: prTitle,
        pr_body: prBody,
        changed_files: changedFiles,
      }),
      axios.post("http://localhost:8000/analyze-refactor", {
        pr_title: prTitle,
        pr_body: prBody,
        changed_files: changedFiles,
      })
    ]).catch(error => {
      console.error("Error calling agent endpoints:", error);
      throw error;
    });
    console.log("after analysis_________________________________")
    console.log("analysisResponse status:", analysisResponse.status);
    console.log("refactorResponse status:", refactorResponse.status);
    console.log("refactorResponse.data:", refactorResponse.data);
    const analysis = analysisResponse.data;
    const refactorAnalysis = refactorResponse.data;

    // Save the analysis result using installationId as accountId
    const savedAnalysis = await savePRAnalysis({
      accountId,
      owner,
      repo: repoName,
      prNumber,
      prTitle,
      analysis,
      contentHash
    });

    // Post or update comment on GitHub
    const commentId = await postOrUpdateComment(
      octokit,
      owner,
      repoName,
      prNumber,
      analysis,
      savedAnalysis.commentId
    );

    // Update the comment ID in the database if it's a new comment
    if (commentId && !savedAnalysis.commentId) {
      await updatePRAnalysisCommentId(accountId, owner, repoName, prNumber, commentId);
    }

    // Post refactor suggestions comment if there are any
    console.log("refactorAnalysis:", refactorAnalysis);
    if (refactorAnalysis.refactor_suggestions && refactorAnalysis.refactor_suggestions.length > 0) {
      console.log("inside refactorAnalysis");
      let refactorBody = `### 🔧 Refactoring Suggestions\n\n`;
      
      for (const suggestion of refactorAnalysis.refactor_suggestions) {
        refactorBody += `**File:** \`${suggestion.file_path}\`\n`;
        refactorBody += `**Suggestion:** ${suggestion.suggestion}\n`;
        if (suggestion.updated_code) {
          refactorBody += `**Updated Code:**\n\`\`\`\n${suggestion.updated_code}\n\`\`\`\n`;
        }
        refactorBody += `\n---\n\n`;
      }

      const refactorCommentId = await postOrUpdateRefactorComment(
        octokit,
        owner,
        repoName,
        prNumber,
        refactorBody,
        savedAnalysis.refactorCommentId
      );

      // Update the refactor comment ID in the database if it's a new comment
      if (refactorCommentId && !savedAnalysis.refactorCommentId) {
        await updatePRAnalysisRefactorCommentId(accountId, owner, repoName, prNumber, refactorCommentId);
      }

      // Save refactor suggestions to database
      await updatePRAnalysisRefactorSuggestions(accountId, owner, repoName, prNumber, refactorAnalysis.refactor_suggestions);
    }

    // === LABEL SYNC LOGIC ===
    try {
      // Fetch current labels on the PR
      const existingLabelsResp = await octokit.issues.listLabelsOnIssue({
        owner,
        repo: repoName,
        issue_number: prNumber
      });
      const existingLabels = new Set(existingLabelsResp.data.map(label => label.name));

      // Define which labels your bot manages
      const managedLabels = [
        "high-risk",
        "medium-risk",
        "low-risk",
        "needs-tests",
        "refactor",
        "feature",
        "bugfix",
        "documentation",
        "needs-review"
      ];

      // Parse new labels from AI agent (comma-separated string)
      const newLabels = new Set(
        (analysis.labels || "")
          .split(",")
          .map(l => l.trim())
          .filter(l => l.length > 0)
      );

      // Labels to remove: managed labels that are no longer in newLabels
      const labelsToRemove = [...existingLabels].filter(
        label => managedLabels.includes(label) && !newLabels.has(label)
      );

      // Remove outdated labels
      for (const label of labelsToRemove) {
        try {
          await octokit.issues.removeLabel({
            owner,
            repo: repoName,
            issue_number: prNumber,
            name: label
          });
          console.log(`❌ Removed label '${label}' from PR #${prNumber}`);
        } catch (err) {
          // Ignore if label was already removed
          if ((err as any).status !== 404) {
            console.error(`❌ Failed to remove label '${label}':`, err as any);
          }
        }
      }

      // Fallback: Only add labels that already exist in the repo, or try to create them if missing
      const allRepoLabelsResp = await octokit.issues.listLabelsForRepo({
        owner,
        repo: repoName,
        per_page: 100
      });
      const repoLabelsSet = new Set(allRepoLabelsResp.data.map(label => label.name));
      const labelsToAdd: string[] = [];
      const skippedLabels: string[] = [];
      for (const label of Array.from(newLabels) as string[]) {
        if (existingLabels.has(label)) continue;
        if (repoLabelsSet.has(label)) {
          labelsToAdd.push(label);
        } else {
          // Try to create the label (default color: gray)
          try {
            await octokit.issues.createLabel({
              owner,
              repo: repoName,
              name: label,
              color: "ededed",
              description: `Label auto-created by PR agent.`
            });
            labelsToAdd.push(label);
            console.log(`✅ Created label '${label}' in repo ${owner}/${repoName}`);
          } catch (createErr) {
            skippedLabels.push(label);
            if ((createErr as any).status !== 422 && (createErr as any).status !== 403) {
              // 422: already exists (race), 403: no permission
              console.warn(`⚠️ Failed to create label '${label}':`, createErr);
            } else {
              console.warn(`⚠️ Skipped label '${label}' (could not create, likely due to permissions).`);
            }
          }
        }
      }
      if (labelsToAdd.length > 0) {
        await octokit.issues.addLabels({
          owner,
          repo: repoName,
          issue_number: prNumber,
          labels: labelsToAdd
        });
        console.log(`🏷️ Added labels: ${labelsToAdd.join(", ")} to PR #${prNumber}`);
      }
      if (skippedLabels.length > 0) {
        console.warn(`⚠️ Skipped non-existent labels (not added to PR): ${skippedLabels.join(", ")}`);
      }
    } catch (err) {
      console.error("❌ Failed to sync labels:", err);
    }

    console.log(`✅ PR analysis saved and comment posted for PR #${prNumber} in ${owner}/${repoName}`);
  } catch (error) {
    console.error("❌ Failed to analyze PR:", error);
    throw error;
  }
}

export function setupPullRequestWebhooks(webhooks: Webhooks) {
  // Webhook event: pull_request.opened
  webhooks.on("pull_request.opened", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in PR webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    //@ts-ignore
    const account = payload.installation.account;
    const accountId = account?.id || 0;
    const pr = payload.pull_request;
    const repo = payload.repository;
    
    console.log("🔀 PR opened:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      prNumber: pr.number, 
      prTitle: pr.title 
    });
    console.log("📊 Debug - Installation ID:", installationId, "Account ID:", accountId);

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const prTitle = pr.title;
      const prBody = pr.body || "";

      await analyzeAndSavePR(
        installationId,
        accountId,
        owner,
        repoName,
        pr.number,
        prTitle,
        prBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze PR on webhook:", error);
    }
  });

  // Webhook event: pull_request.closed
  webhooks.on("pull_request.closed", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in PR webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const pr = payload.pull_request;
    const repo = payload.repository;
    
    console.log("🔀 PR closed:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      prNumber: pr.number, 
      prTitle: pr.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;

      // Get Octokit instance for this installation
      const octokit = await getInstallationOctokit(installationId);

      // Find the existing analysis to get the comment ID
      const existingAnalysis = await findPRAnalysis(accountId, owner, repoName, pr.number);
      
      // Delete the comment if it exists
      if (existingAnalysis?.commentId) {
        try {
          console.log("deleting comment______________________________")
          await octokit.issues.deleteComment({
            owner,
            repo: repoName,
            comment_id: existingAnalysis.commentId
          });
          console.log("after deleting comment______________________________")
          console.log(`🗑️ Deleted comment ${existingAnalysis.commentId} for PR #${pr.number}`);
        } catch (error) {
          console.error("❌ Failed to delete comment:", error);
        }
      }
      // Delete the CI comment if it exists
      if (existingAnalysis?.cicommentId) {
        try {
          console.log("deleting cicomment______________________________")
          await octokit.issues.deleteComment({
            owner,
            repo: repoName,
            comment_id: existingAnalysis.cicommentId
          });
          console.log("after deleting cicomment______________________________")
          await updatePRAnalysisCICommentId(accountId, owner, repoName, pr.number, null);
          console.log(`🗑️ Deleted CI comment ${existingAnalysis.cicommentId} for PR #${pr.number}`);
        } catch (error) {
          console.error("❌ Failed to delete CI comment:", error);
        }
      }

      // Delete the refactor comment if it exists
      if (existingAnalysis?.refactorCommentId) {
        try {
          console.log("deleting refactor comment______________________________")
          await octokit.issues.deleteComment({
            owner,
            repo: repoName,
            comment_id: existingAnalysis.refactorCommentId
          });
          console.log("after deleting refactor comment______________________________")
          await updatePRAnalysisRefactorCommentId(accountId, owner, repoName, pr.number, null);
          console.log(`🗑️ Deleted refactor comment ${existingAnalysis.refactorCommentId} for PR #${pr.number}`);
        } catch (error) {
          console.error("❌ Failed to delete refactor comment:", error);
        }
      }

  
      await deletePRAnalysis(accountId, owner, repoName, pr.number);
      console.log(`✅ PR analysis deleted for PR #${pr.number} in ${owner}/${repoName}`);
    } catch (error) {
      console.error("❌ Failed to delete PR analysis on webhook:", error);
    }
  });

  // Webhook event: pull_request.reopened
  webhooks.on("pull_request.reopened", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in PR webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const pr = payload.pull_request;
    const repo = payload.repository;
    
    console.log("🔀 PR reopened:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      prNumber: pr.number, 
      prTitle: pr.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const prTitle = pr.title;
      const prBody = pr.body || "";

      await analyzeAndSavePR(
        installationId,
        accountId,
        owner,
        repoName,
        pr.number,
        prTitle,
        prBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze reopened PR on webhook:", error);
    }
  });

  // Webhook event: pull_request.edited
  webhooks.on("pull_request.edited", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in PR webhook payload");
      return;
    }
    console.log("🔀 PR edited:");
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const pr = payload.pull_request;
    const repo = payload.repository;
    
    console.log("🔀 PR edited:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      prNumber: pr.number, 
      prTitle: pr.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const prTitle = pr.title;
      const prBody = pr.body || "";

      await analyzeAndSavePR(
        installationId,
        accountId,
        owner,
        repoName,
        pr.number,
        prTitle,
        prBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze edited PR on webhook:", error);
    }
  });

  // Webhook event: pull_request.synchronize
  webhooks.on("pull_request.synchronize", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in PR webhook payload");
      return;
    }
    console.log("🔀 PR synchronized:");
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const pr = payload.pull_request;
    const repo = payload.repository;
    
    console.log("🔀 PR synchronized:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      prNumber: pr.number, 
      prTitle: pr.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const prTitle = pr.title;
      const prBody = pr.body || "";

      await analyzeAndSavePR(
        installationId,
        accountId,
        owner,
        repoName,
        pr.number,
        prTitle,
        prBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze synchronized PR on webhook:", error);
    }
  });
} 