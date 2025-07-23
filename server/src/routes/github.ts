import express from "express";
import { findInstallationByIdOrAccountId, getAllInstallations } from "../database/functions/installation.ts";
import { createSessionToken } from "../auth/auth.ts";

const router = express.Router();

router.get("/github/callback", async (req, res) => {
  const installationId = req.query.installation_id;

  if (!installationId) return res.status(400).json({ error: "Missing installation_id" });

  try {
    const existingInstallation = await findInstallationByIdOrAccountId(Number(installationId));
    
    if (existingInstallation) {
      const token = createSessionToken({
        account_login: existingInstallation.accountLogin,
        installation_id: existingInstallation.installationId,
        account_type: existingInstallation.accountType,
        account_id: existingInstallation.accountId,
      });

      return res.status(200).json({ token });
    } else {
      // Return a temporary response indicating the installation is being set up
      return res.status(202).json({ 
        message: "Installation is being set up. Please wait for webhook data.",
        installation_id: installationId,
        status: "pending"
      });
    }
  } catch (err) {
    console.error("❌ Callback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
