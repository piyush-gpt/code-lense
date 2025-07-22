import express from "express";
import { requireAuth } from "../middleware/auth.ts";
import { getRepoStats } from "../services/repoStatsService.ts";

const router = express.Router();

router.get('/repo-stats', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user=req.user!;

    const octokit = user.octokit;

    // 1. List repos user has installed the app on
    const reposRes = await octokit.rest.apps.listReposAccessibleToInstallation();
    const repos = reposRes.data.repositories;

    const statsPromises = repos.map(repo =>
      getRepoStats(octokit, repo.owner.login, repo.name)
    );

    const repoStats = await Promise.all(statsPromises);

    res.json({ success: true, data: repoStats });
  } catch (err) {
    console.error("❌ Failed to fetch repo stats", err);
    res.status(500).json({ success: false, error: "Failed to fetch repo stats" });
  }
});

export default router;