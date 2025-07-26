import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { config } from '../config/config.ts';
import dotenv from "dotenv";
import fetch from "node-fetch";
import unzipper from "unzipper";
import { findPRAnalysis, updatePRAnalysisCICommentId } from "../database/functions/prAnalysis.ts";
import { PRAnalysis } from "../models/PRAnalysis.ts";

dotenv.config();

const PYTHON_AGENT_URL = "http://localhost:8000/classify-ci-log";

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

interface ClassifyResponse {
  is_flaky: boolean;
  explanation: string;
}

interface JobInfo {
  id: number;
  name: string;
}

async function downloadAndExtractLogText(zipUrl: string): Promise<string> {
  try {
    console.log(`📥 Downloading logs from: ${zipUrl}`);
    const response = await fetch(zipUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download logs: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let logText = "";

    if (contentType && contentType.includes('application/zip')) {
      // Unzip as before
      const zip = await unzipper.Open.buffer(await response.buffer());
      for (const file of zip.files) {
        if (!file.path.endsWith(".txt")) continue;
        const content = await file.buffer();
        logText += content.toString();
      }
    } else {
      // Treat as plain text
      logText = await response.text();
    }

    if (!logText) {
      throw new Error('Log file is empty or could not be extracted.');
    }

    console.log(`📄 Extracted ${logText.length} characters of log text`);
    return logText;
  } catch (error) {
    console.error("❌ Failed to download and extract log text:", error);
    throw error;
  }
}

async function classifyLog(logText: string): Promise<ClassifyResponse> {
  try {
    console.log("🤖 Sending log to Python agent for classification");
    const classifyResp = await fetch(PYTHON_AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log_text: logText }),
    });

    if (!classifyResp.ok) {
      throw new Error(`Python agent failed: ${classifyResp.status} ${classifyResp.statusText}`);
    }

    const classifyData = await classifyResp.json() as ClassifyResponse;
    console.log(`✅ Classification result: ${classifyData.is_flaky ? 'flaky' : 'real issue'}`);
    return classifyData;
  } catch (error) {
    console.error("❌ Failed to classify log:", error);
    throw error;
  }
}

async function findJobByName(jobList: any[], checkName: string): Promise<JobInfo | null> {
  // Only allow exact match for safety
  const job = jobList.find((j) => j.name === checkName);
  if (job) {
    console.log(`✅ Found exact job match: ${job.name}`);
    return { id: job.id, name: job.name };
  }
  console.warn(`⚠️ No exact job found for check name: ${checkName}`);
  return null;
}

async function createOrUpdateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  cicommentId?: number
): Promise<number | null> {
  try {
    if (cicommentId) {
      try {
        const response = await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: cicommentId,
          body,
        });
        console.log(`✅ Updated existing comment ${cicommentId}`);
        return response.data.id;
      } catch (err: any) {
        if (err.status === 404) {
          console.log(`⚠️ Comment ${cicommentId} not found, creating new comment`);
          const response = await octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body,
          });
          console.log(`✅ Created new comment ${response.data.id}`);
          return response.data.id;
        } else {
          throw err;
        }
      }
    } else {
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log(`✅ Created new comment ${response.data.id}`);
      return response.data.id;
    }
  } catch (error) {
    console.error("❌ Failed to create or update comment:", error);
    return null;
  }
}



export function setupCITestWebhooks(webhooks: Webhooks) {
  // Handle complete workflow runs
  webhooks.on("workflow_run.completed", async ({ payload }) => {
    try {
      console.log("🔍 Processing workflow run:");
      const workflowRun = payload.workflow_run;
      const { conclusion, head_branch } = workflowRun;
      
      console.log(`🔍 Processing workflow run: ${workflowRun.name} (${conclusion})`);
      
      // Only process PR workflows
      if (workflowRun.event !== "pull_request") {
        console.log(`ℹ️ Workflow ${workflowRun.name} is not a PR event (${workflowRun.event}), skipping.`);
        return;
      }

      if (!payload.installation) {
        console.log("❌ No installation data in workflow run webhook payload");
        return;
      }

      const installationId = payload.installation.id;
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const accountId = payload.repository.owner.id;

      // Get Octokit instance for this installation
      const octokit = await getInstallationOctokit(installationId);

      // Find the PR associated with this workflow run
      const prs = await octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${head_branch}`,
        state: "open",
      });
      const pr = prs.data[0];
      if (!pr) {
        console.log(`⚠️ No open PR found for branch ${head_branch}, skipping.`);
        return;
      }

      // Now check if workflow failed and clean up if it didn't
      if (conclusion !== "failure") {
        console.log(`ℹ️ Workflow ${workflowRun.name} did not fail (${conclusion}). Cleaning up any previous failure record.`);
        // Remove the entry for this workflow from ciTestResults if it exists
        await PRAnalysis.findOneAndUpdate(
          { accountId, owner, repo, prNumber: pr.number },
          {
            $unset: { [`ciTestResults.${workflowRun.workflow_id}`]: "" }
          },
          { new: true }
        );
        return;
      }

      console.log(`🔍 Found PR #${pr.number} for workflow run`);

      // Get all jobs in this workflow run
      const { data: jobList } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: workflowRun.id,
      });

      // Process each failed job
      const failedJobs = jobList.jobs.filter(job => job.conclusion === "failure");
      let aggregatedBody = `## 🤖 CI Test Results for ${workflowRun.name}\n\n`;

      for (const job of failedJobs) {
        try {
          // Download and analyze logs for this job
          const { url: logUrl } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
          });

          const logText = await downloadAndExtractLogText(logUrl);
          const classifyData = await classifyLog(logText);

          // Add to aggregated comment
          aggregatedBody += `❌ **${job.name}** failed\n`;
          if (classifyData.explanation) {
            aggregatedBody += `   _Reason: ${classifyData.explanation}_\n`;
          }
          aggregatedBody += `\n`;

          console.log(`✅ Processed failed job: ${job.name}`);
        } catch (error) {
          console.error(`❌ Failed to process job ${job.name}:`, error);
          // Still add to comment but mark as unprocessed
          aggregatedBody += `❌ **${job.name}** failed (analysis failed)\n\n`;
        }
      }

      aggregatedBody += `---\n_Updated: ${new Date().toISOString()}_`;
      // Store the final comment for the workflow only
      await PRAnalysis.findOneAndUpdate(
        { accountId, owner, repo, prNumber: pr.number },
        {
          $set: {
            [`ciTestResults.${workflowRun.workflow_id}`]: {
              comment: aggregatedBody,
              updatedAt: new Date(),
              workflow: workflowRun.workflow_id
            }
          }
        },
        { new: true }
      );

      // Find existing CI comment
      let analysis = await findPRAnalysis(accountId, owner, repo, pr.number);
      const cicommentId = analysis?.cicommentId;

      // Create or update comment
      const newCicommentId = await createOrUpdateComment(
        octokit,
        owner,
        repo,
        pr.number,
        aggregatedBody,
        cicommentId
      );

      // Save cicommentId if new
      if (newCicommentId && newCicommentId !== cicommentId) {
        await updatePRAnalysisCICommentId(accountId, owner, repo, pr.number, newCicommentId);
        console.log(`💾 Updated CI comment ID in database: ${newCicommentId}`);
      }

      console.log(`✅ Successfully processed workflow run: ${workflowRun.name}`);
    } catch (error) {
      console.error("❌ Failed to process workflow run webhook:", error);
    }
  });
}

