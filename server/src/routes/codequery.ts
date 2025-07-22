import express from "express";
import { requireAuth } from "../middleware/auth.ts";
import axios from "axios";

const router = express.Router();

router.post('/query', requireAuth, async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user!;
    const { user_query, repo, owner } = req.body;

    if (!user_query || !repo || !owner) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const accountId = user.account_id;
    const installationId = user.installation_id;

    console.log(`🔍 Code query: "${user_query}" for ${owner}/${repo}`);

    // Call Python FastAPI agent
    const response = await axios.post("http://localhost:8000/code-query", {
      user_query,
      account_id: accountId.toString(),
      repo,
      owner,
      installation_id: installationId
    });

    console.log(`✅ Code query completed for ${owner}/${repo}`);

    return res.json({ 
      success: true, 
      answer: response.data.answer 
    });

  } catch (error) {
    console.error("❌ Code query failed:", error);
    return res.status(500).json({ error: "Code query failed" });
  }
});

export default router; 