import express from "express";
import { requireAuth } from "../middleware/auth.ts";
import axios from "axios";
import { findIssueAnalysis, saveIssueAnalysis } from "../database/functions/issueAnalysis.ts";
import crypto from "crypto";

const router = express.Router();

// Get all open issues for a repository
router.get('/get-repo-issues', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user!;
    const octokit = user.octokit;
    const { owner, repo } = req.query;

    if (!repo || !owner || !octokit) {
      return res.status(400).json({ error: "Missing required parameters or auth" });
    }

    // Get all open issues for the repository (excluding PRs)
    const issuesResp = await octokit.issues.listForRepo({
      owner: owner as string,
      repo: repo as string,
      state: "open",
      per_page: 100,
      sort: "updated",
      direction: "desc"
    });

    // Filter out pull requests (GitHub API returns PRs as issues with a pull_request field)
    const issues = issuesResp.data
      .filter(issue => !issue.pull_request)
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || "",
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: {
          login: issue.user?.login,
          avatar_url: issue.user?.avatar_url
        },
        labels: issue.labels.map(label => ({
          name: label.name,
          color: label.color
        })),
        html_url: issue.html_url
      }));

    return res.json({ success: true, issues });
  } catch (error) {
    console.error("❌ Failed to fetch issues:", error);
    return res.status(500).json({ error: "Failed to fetch issues" });
  }
});

// Get AI analysis for a specific issue
router.get('/get-issue-agent', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user!;
    const octokit = user.octokit;
    const { owner, repo, issue_number } = req.query;

    if (!repo || !owner || !issue_number || !octokit) {
      return res.status(400).json({ error: "Missing required parameters or auth" });
    }

    const accountId = user.account_id;
    const ownerStr = owner as string;
    const repoStr = repo as string;
    const issueNumber = Number(issue_number);

    // Check if analysis already exists
    const existingAnalysis = await findIssueAnalysis(accountId, ownerStr, repoStr, issueNumber);
    if (existingAnalysis) {
      console.log(`✅ Found existing analysis for Issue #${issueNumber} in ${ownerStr}/${repoStr}`);
      return res.json({
        success: true,
        analysis: existingAnalysis.analysis,
        cached: true
      });
    }

    console.log(`🔄 No existing analysis found, calling Issue agent for Issue #${issueNumber} in ${ownerStr}/${repoStr}`);

    // 1. Get issue details
    const issue = await octokit.issues.get({
      owner: ownerStr,
      repo: repoStr,
      issue_number: issueNumber,
    });

    // 2. Send to Python FastAPI Issue Agent
    const response = await axios.post("http://localhost:8000/analyze-issue", {
      issue_title: issue.data.title,
      issue_body: issue.data.body || ""
    });

    // 3. Save the analysis result
    const contentToHash = JSON.stringify({ title: issue.data.title, body: issue.data.body });
    const contentHash = crypto.createHash("sha256").update(contentToHash).digest("hex");
    await saveIssueAnalysis({
      accountId,
      owner: ownerStr,
      repo: repoStr,
      issueNumber,
      issueTitle: issue.data.title,
      analysis: response.data,
      contentHash
    });

    console.log(`✅ Analysis saved for Issue #${issueNumber} in ${ownerStr}/${repoStr}`);

    return res.json({ success: true, analysis: response.data, cached: false });
  } catch (error) {
    console.error("❌ Issue Agent failed:", error);
    return res.status(500).json({ error: "Issue analysis failed" });
  }
});

export default router; 