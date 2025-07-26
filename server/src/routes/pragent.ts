import express from "express";
import { requireAuth } from "../middleware/auth.ts";
import axios from "axios";
import { findPRAnalysis, savePRAnalysis } from "../database/functions/prAnalysis.ts";
import { PRAnalysis } from "../models/PRAnalysis.ts";
import crypto from "crypto";

const router = express.Router();

// Get all PRs for a repository
router.get('/get-repo-prs', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user!;
    const octokit = user.octokit;
    const { owner, repo } = req.query;

    if (!repo || !owner || !octokit) {
      return res.status(400).json({ error: "Missing required parameters or auth" });
    }

    // Get all PRs for the repository
    const prsResp = await octokit.pulls.list({
      owner: owner as string,
      repo: repo as string,
      state: "open",
      per_page: 100,
      sort: "updated",
      direction: "desc"
    });

    const prs = prsResp.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body || "",
      state: pr.state,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      user: {
        login: pr.user?.login,
        avatar_url: pr.user?.avatar_url
      },
      labels: pr.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
      draft: pr.draft,
      html_url: pr.html_url
    }));

    return res.json({ success: true, prs });
  } catch (error) {
    console.error("❌ Failed to fetch PRs:", error);
    return res.status(500).json({ error: "Failed to fetch PRs" });
  }
});

router.get('/get-pr-agent', requireAuth, async (req, res) => {
    try {
        //@ts-ignore
      const user = req.user!;
      const octokit = user.octokit;
      const { owner, repo, pr_number } = req.query;
  
      if (!repo || !owner || !pr_number || !octokit) {
        return res.status(400).json({ error: "Missing required parameters or auth" });
      }

      const accountId = user.account_id;
      const ownerStr = owner as string;
      const repoStr = repo as string;
      const prNumber = Number(pr_number);

      // Check if analysis already exists
      const existingAnalysis = await findPRAnalysis(accountId, ownerStr, repoStr, prNumber);
      
      if (existingAnalysis) {
        console.log(`✅ Found existing analysis for PR #${prNumber} in ${ownerStr}/${repoStr}`);
        return res.json({ 
          success: true, 
          analysis: existingAnalysis.analysis,
          cached: true 
        });
      }

      console.log(`🔄 No existing analysis found, calling PR agent for PR #${prNumber} in ${ownerStr}/${repoStr}`);
  
      // 1. Get PR details
      const pr = await octokit.pulls.get({
        owner: ownerStr,
        repo: repoStr,
        pull_number: prNumber,
      });
  
      // 2. Get changed files and their patches (trimmed)
      const filesResp = await octokit.pulls.listFiles({
        owner: ownerStr,
        repo: repoStr,
        pull_number: prNumber,
      });
  
      const changedFiles = filesResp.data
        .slice(0, 10)  // Limit to top 10 files to reduce token cost
        .map(f => ({
            filename: f.filename,
            patch: f.patch ? f.patch.split("\n").slice(0, 100).join("\n") : "(no patch)", // Limit patch lines
        }));

      // 3. Send to Python FastAPI PR Agent
      const response = await axios.post("http://localhost:8000/analyze-pr", {
        pr_title: pr.data.title,
        pr_body: pr.data.body || "",
        changed_files: changedFiles,
      });

      // 5. Save the analysis result
      const contentToHash = JSON.stringify({ prTitle: pr.data.title, prBody: pr.data.body, changedFiles });
      const contentHash = crypto.createHash("sha256").update(contentToHash).digest("hex");
      await savePRAnalysis({
        accountId,
        owner: ownerStr,
        repo: repoStr,
        prNumber,
        prTitle: pr.data.title,
        analysis: response.data,
        contentHash
      });

      console.log(`✅ Analysis saved for PR #${prNumber} in ${ownerStr}/${repoStr}`);

      return res.json({ success: true, analysis: response.data, cached: false });
    } catch (error) {
      console.error("❌ PR Agent failed:", error);
      return res.status(500).json({ error: "PR analysis failed" });
    }
  });


router.get('/ci-test-results', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user!;
    const accountId = user.account_id;
    const { owner, repo, prNumber } = req.query;
    if (!accountId || !owner || !repo || !prNumber) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const analysis = await PRAnalysis.findOne({ accountId, owner, repo, prNumber: Number(prNumber) });
    if (!analysis || !analysis.ciTestResults) {
      console.log(`❌ No CI test results found for PR #${prNumber} in ${owner}/${repo}`);
      return res.json({ success: true, ciTestResults: {} });
    }
    // Fetch latest workflow run for this PR
    const octokit = user.octokit;
    const pr = await octokit.pulls.get({ owner, repo, pull_number: Number(prNumber) });
    const headSha = pr.data.head.sha;
    const workflowRuns = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      head_sha: headSha,
      event: 'pull_request',
      per_page: 1,
      status: 'completed'
    });
    const latestRun = workflowRuns.data.workflow_runs[0];
    if (!latestRun) {
      console.log(`❌ No latest workflow run found for PR #${prNumber} in ${owner}/${repo}`);
      return res.json({ success: true, ciTestResults: {} });
    }
    const jobsResp = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: latestRun.id
    });
    const validKeys = new Set(jobsResp.data.jobs.map(
      job => `${latestRun.workflow_id}:${job.name}`
    ));
    // Filter ciTestResults - convert Map to plain object
    const ciTestResultsObj = analysis.ciTestResults instanceof Map ? Object.fromEntries(analysis.ciTestResults) : analysis.ciTestResults;
    console.log(`🔄 Valid keys types: ${Array.from(validKeys).map(k => typeof k)}`);
    console.log(`🔄 CI test results keys types: ${Object.keys(ciTestResultsObj).map(k => typeof k)}`);
    console.log(`🔄 Valid keys: ${Array.from(validKeys)}`);
    console.log(`🔄 CI test results: ${JSON.stringify(ciTestResultsObj)}`);
    const filtered = {};
    for (const [key, value] of Object.entries(ciTestResultsObj)) {
      console.log(`🔍 Checking key: "${key}" - exists in validKeys: ${validKeys.has(key)}`);
      if (validKeys.has(key)) filtered[key] = value;
    }
    console.log(`✅ Found ${Object.keys(filtered).length} CI test results for PR #${prNumber} in ${owner}/${repo}`);
    return res.json({ success: true, ciTestResults: filtered });
  } catch (error) {
    console.error("❌ Failed to fetch CI test results:", error);
    return res.status(500).json({ error: "Failed to fetch CI test results" });
  }
});
  
export default router;