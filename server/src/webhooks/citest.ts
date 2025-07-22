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

const MAX_RERUNS = 2;
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
    
    const zip = await unzipper.Open.buffer(await response.buffer());
    let logText = "";
    
    for (const file of zip.files) {
      if (!file.path.endsWith(".txt")) continue;
      const content = await file.buffer();
      logText += content.toString();
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

async function rerunJob(octokit: Octokit, owner: string, repo: string, jobId: number): Promise<void> {
  try {
    await octokit.request("POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun", {
      owner,
      repo,
      job_id: jobId,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    console.log(`🔄 Successfully reran job ${jobId}`);
  } catch (error) {
    console.error("❌ Failed to rerun job:", error);
    throw error;
  }
}

export function setupCITestWebhooks(webhooks: Webhooks) {
  webhooks.on("check_run.completed", async ({ payload }) => {
    try {
      const checkRun = payload.check_run;
      const { conclusion, name: checkName } = checkRun;
      const pr = checkRun.pull_requests[0];
      
      console.log(`🔍 Processing check run: ${checkName} (${conclusion})`);
      
      if (!pr) {
        console.log(`⚠️ No PR associated with job ${checkName}, skipping.`);
        return;
      }
      
      if (conclusion !== "failure") {
        console.log(`ℹ️ Check run ${checkName} did not fail (${conclusion}), skipping.`);
        return;
      }

      if (!payload.installation) {
        console.log("❌ No installation data in check run webhook payload");
        return;
      }

      const installationId = payload.installation.id;
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const accountId = payload.repository.owner.id;
      const runId = (checkRun.check_suite as any)?.workflow_run?.id;
      
      if (typeof runId !== "number") {
        console.log(`⚠️ No valid run ID found for check run ${checkName}`);
        return;
      }

      console.log(`🔍 Processing failed job: ${checkName} in ${owner}/${repo}#${pr.number}`);

      // Get Octokit instance for this installation
      const octokit = await getInstallationOctokit(installationId);

      // Step 1: List all jobs in the workflow run
      const { data: jobList } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });

      const job = await findJobByName(jobList.jobs, checkName);
      if (!job) {
        console.log(`⚠️ Could not find job for check name: ${checkName}`);
        return;
      }

      // Step 2: Download and extract logs
      const { url: logUrl } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: job.id,
      });

      const logText = await downloadAndExtractLogText(logUrl);
      
      // Step 3: Use Python agent to classify
      const classifyData = await classifyLog(logText);

      // Get workflow name (human-readable) and job name
      const workflowName = (checkRun.check_suite as any)?.workflow_name || 'unknown-workflow';
      const workflowKey = `${workflowName}:${job.name}`;

      // Only store CI test result in PRAnalysis for failed/flaky jobs
      let status: string;
      if (classifyData.is_flaky) {
        status = 'flaky';
      } else {
        status = 'failure';
      }
      await PRAnalysis.findOneAndUpdate(
        { accountId, owner, repo, prNumber: pr.number },
        {
          $set: {
            [`ciTestResults.${workflowKey}`]: {
              status,
              explanation: classifyData.explanation,
              updatedAt: new Date(),
              workflow: workflowName,
              jobName: job.name
            }
          }
        },
        { new: true }
      );

      // Find PRAnalysis to get cicommentId and rerunCount
      let analysis = await findPRAnalysis(accountId, owner, repo, pr.number);
      if (!analysis) {
        analysis = await PRAnalysis.create({
          accountId,
          owner,
          repo,
          prNumber: pr.number,
          prTitle: "",
          analysis: {},
        });
      }
      const cicommentId = analysis?.cicommentId;
      const rerunCount = analysis?.rerunCount || 0;

      // Determine comment body based on classification
      let body: string;
      if (classifyData.is_flaky && analysis) {
        if (rerunCount >= MAX_RERUNS) {
          body = `🤖 Detected a flaky test in **${job.name}**, but the maximum number of automatic reruns (${MAX_RERUNS}) has been reached. Please investigate manually.\n\n_Reason: ${classifyData.explanation}_`;
        } else {
          body = `🤖 Detected a flaky test in **${job.name}**. Re-running the job automatically.\n\n_Reason: ${classifyData.explanation}_`;
        }
      } else if (classifyData.is_flaky) {
        body = `🤖 Detected a flaky test in **${job.name}**, but no PR analysis found. Please investigate manually.\n\n_Reason: ${classifyData.explanation}_`;
      } else {
        body = `🤖 CI job **${job.name}** failed due to a real issue. No rerun triggered.\n\n_Reason: ${classifyData.explanation}_`;
      }

      // Update or create CI comment
      const newCicommentId = await createOrUpdateComment(
        octokit,
        owner,
        repo,
        pr.number,
        body,
        cicommentId
      );

      // Save cicommentId if new
      if (newCicommentId && newCicommentId !== cicommentId) {
        await updatePRAnalysisCICommentId(accountId, owner, repo, pr.number, newCicommentId);
        console.log(`💾 Updated CI comment ID in database: ${newCicommentId}`);
      }

      if (classifyData.is_flaky && analysis && rerunCount < MAX_RERUNS) {
        // Atomically increment rerunCount in DB before rerun
        const updated = await PRAnalysis.findOneAndUpdate(
          { accountId, owner, repo, prNumber: pr.number },
          { $inc: { rerunCount: 1 } },
          { new: true }
        );
        if (updated && updated.rerunCount <= MAX_RERUNS) {
          await rerunJob(octokit, owner, repo, job.id);
        } else {
          console.log(`⚠️ Maximum reruns (${MAX_RERUNS}) reached for job ${job.name} (atomic check)`);
        }
      } else if (classifyData.is_flaky && analysis && rerunCount >= MAX_RERUNS) {
        console.log(`⚠️ Maximum reruns (${MAX_RERUNS}) reached for job ${job.name}`);
      }

      console.log(`✅ Successfully processed CI failure for job: ${job.name}`);
    } catch (error) {
      console.error("❌ Failed to process CI test webhook:", error);
    }
  });
}

