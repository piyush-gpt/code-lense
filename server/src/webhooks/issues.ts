// issues.ts - Issues webhook handlers
import { Webhooks } from "@octokit/webhooks";
import { saveIssueAnalysis, deleteIssueAnalysis, updateIssueAnalysisCommentId, findIssueAnalysis } from "../database/functions/issueAnalysis.ts";
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
  issueNumber: number,
  analysis: any,
  existingCommentId?: number
) {
  const commentBody = `### 🤖 Issue Analysis

**Summary**: ${analysis.summary}

**Type**: ${analysis.type}

**Priority**: ${analysis.priority}

**Suggested Actions**:
${analysis.suggested_actions}

**Related Areas**:
${analysis.related_areas}

**Estimated Effort**: ${analysis.estimated_effort}

---

_This comment was generated automatically by CodeLense Issue Agent_ 🚀`;

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
        console.log(`✅ Updated existing comment ${existingCommentId} for Issue #${issueNumber}`);
      } catch (updateError: any) {
        // If comment doesn't exist (404), create a new one
        if (updateError.status === 404) {
          console.log(`⚠️ Comment ${existingCommentId} not found, creating new comment`);
          const response = await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: commentBody
          });
          console.log(`✅ Created new comment ${response.data.id} for Issue #${issueNumber}`);
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
        issue_number: issueNumber,
        body: commentBody
      });
      console.log(`✅ Created new comment ${response.data.id} for Issue #${issueNumber}`);
      return response.data.id;
    }
  } catch (error) {
    console.error("❌ Failed to post/update comment:", error);
    throw error;
  }
}

async function analyzeAndSaveIssue(
  installationId: number,
  accountId: number,
  owner: string,
  repoName: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string
) {
  try {
    // Get Octokit instance for this installation
    const octokit = await getInstallationOctokit(installationId);

    // Early exit if issue body is missing
    if (!issueBody) {
      await octokit.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issueNumber,
        body: `⚠️ Not enough data to analyze this issue (missing description). Please add a description to get better analysis.`
      });
      console.warn(`⚠️ Skipped Issue #${issueNumber} in ${owner}/${repoName}: missing description.`);
      return;
    }

    // === HASH OPTIMIZATION: Short-circuit if content unchanged ===
    const contentToHash = JSON.stringify({ issueTitle, issueBody });
    const contentHash = crypto.createHash("sha256").update(contentToHash).digest("hex");
    // Try to get last analysis (for this issue)
    const lastAnalysis = await findIssueAnalysis(accountId, owner, repoName, issueNumber);
    if (lastAnalysis && lastAnalysis.contentHash === contentHash) {
      console.log(`⏩ Skipping analysis for Issue #${issueNumber} in ${owner}/${repoName}: content unchanged.`);
      return;
    }

    const analysisResponse = await axios.post("http://localhost:8000/analyze-issue", {
      issue_title: issueTitle,
      issue_body: issueBody,
    });

    const analysis = analysisResponse.data;

    // Save the analysis result using installationId as accountId
    const savedAnalysis = await saveIssueAnalysis({
      accountId,
      owner,
      repo: repoName,
      issueNumber,
      issueTitle,
      analysis,
      contentHash
    });

    // Post or update comment on GitHub
    const commentId = await postOrUpdateComment(
      octokit,
      owner,
      repoName,
      issueNumber,
      analysis,
      savedAnalysis.commentId
    );

    // Update the comment ID in the database if it's a new comment
    if (commentId && !savedAnalysis.commentId) {
      await updateIssueAnalysisCommentId(accountId, owner, repoName, issueNumber, commentId);
    }

    // === LABEL SYNC LOGIC ===
    try {
      // Fetch current labels on the issue
      const existingLabelsResp = await octokit.issues.listLabelsOnIssue({
        owner,
        repo: repoName,
        issue_number: issueNumber
      });
      const existingLabels = new Set(existingLabelsResp.data.map(label => label.name));

      // Define which labels your bot manages for issues
      const managedLabels = [
        "bug",
        "feature", 
        "enhancement",
        "question",
        "danger"
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
            issue_number: issueNumber,
            name: label
          });
          console.log(`❌ Removed label '${label}' from Issue #${issueNumber}`);
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
          // Try to create the label with appropriate colors
          const labelColors: { [key: string]: string } = {
            "bug": "d73a4a",
            "feature": "a2eeef", 
            "enhancement": "a2eeef",
            "question": "d876e3",
            "danger": "b60205"
          };
          try {
            await octokit.issues.createLabel({
              owner,
              repo: repoName,
              name: label,
              color: labelColors[label] || "ededed",
              description: `Label auto-created by Issue agent.`
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
          issue_number: issueNumber,
          labels: labelsToAdd
        });
        console.log(`🏷️ Added labels: ${labelsToAdd.join(", ")} to Issue #${issueNumber}`);
      }
      if (skippedLabels.length > 0) {
        console.warn(`⚠️ Skipped non-existent labels (not added to issue): ${skippedLabels.join(", ")}`);
      }
    } catch (err) {
      console.error("❌ Failed to sync labels:", err);
    }

    console.log(`✅ Issue analysis saved and comment posted for Issue #${issueNumber} in ${owner}/${repoName}`);
  } catch (error) {
    console.error("❌ Failed to analyze issue:", error);
    throw error;
  }
}

export function setupIssueWebhooks(webhooks: Webhooks) {
  // Webhook event: issues.opened
  webhooks.on("issues.opened", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in issue webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    //@ts-ignore
    const account = payload.installation.account;
    const accountId = account?.id || 0;
    const issue = payload.issue;
    const repo = payload.repository;
    
    console.log("🔀 Issue opened:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      issueNumber: issue.number, 
      issueTitle: issue.title 
    });
    console.log("📊 Debug - Installation ID:", installationId, "Account ID:", accountId);

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const issueTitle = issue.title;
      const issueBody = issue.body || "";

      await analyzeAndSaveIssue(
        installationId,
        accountId,
        owner,
        repoName,
        issue.number,
        issueTitle,
        issueBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze issue on webhook:", error);
    }
  });

  // Webhook event: issues.closed
  webhooks.on("issues.closed", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in issue webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const issue = payload.issue;
    const repo = payload.repository;
    
    console.log("🔀 Issue closed:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      issueNumber: issue.number, 
      issueTitle: issue.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;

      // Get Octokit instance for this installation
      const octokit = await getInstallationOctokit(installationId);

      // Find the existing analysis to get the comment ID
      const existingAnalysis = await findIssueAnalysis(accountId, owner, repoName, issue.number);
      
      // Delete the comment if it exists
      if (existingAnalysis?.commentId) {
        try {
          await octokit.issues.deleteComment({
            owner,
            repo: repoName,
            comment_id: existingAnalysis.commentId
          });
          console.log(`🗑️ Deleted comment ${existingAnalysis.commentId} for Issue #${issue.number}`);
        } catch (error) {
          console.error("❌ Failed to delete comment:", error);
        }
      }

      // Delete the issue analysis
      await deleteIssueAnalysis(accountId, owner, repoName, issue.number);
      console.log(`✅ Issue analysis deleted for Issue #${issue.number} in ${owner}/${repoName}`);
    } catch (error) {
      console.error("❌ Failed to delete issue analysis on webhook:", error);
    }
  });

  // Webhook event: issues.reopened
  webhooks.on("issues.reopened", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in issue webhook payload");
      return;
    }
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const issue = payload.issue;
    const repo = payload.repository;
    
    console.log("🔀 Issue reopened:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      issueNumber: issue.number, 
      issueTitle: issue.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const issueTitle = issue.title;
      const issueBody = issue.body || "";

      await analyzeAndSaveIssue(
        installationId,
        accountId,
        owner,
        repoName,
        issue.number,
        issueTitle,
        issueBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze reopened issue on webhook:", error);
    }
  });

  // Webhook event: issues.edited
  webhooks.on("issues.edited", async ({ payload }) => {
    if (!payload.installation) {
      console.log("❌ No installation data in issue webhook payload");
      return;
    }
    console.log("🔀 Issue edited:");
    
    const installationId = payload.installation.id;
    const accountId = payload.repository.owner.id;
    const issue = payload.issue;
    const repo = payload.repository;
    
    console.log("🔀 Issue edited:", { 
      installationId, 
      accountId,
      repo: repo.full_name, 
      issueNumber: issue.number, 
      issueTitle: issue.title 
    });

    try {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const issueTitle = issue.title;
      const issueBody = issue.body || "";

      await analyzeAndSaveIssue(
        installationId,
        accountId,
        owner,
        repoName,
        issue.number,
        issueTitle,
        issueBody
      );
    } catch (error) {
      console.error("❌ Failed to analyze edited issue on webhook:", error);
    }
  });
} 