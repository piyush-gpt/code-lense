import express from "express";
import { verifySessionToken, createSecureCookie, createSessionToken } from "../auth/auth.ts";
import { findInstallationByIdOrAccountId } from "../database/functions/installation.ts";
import { getGitHubAppInstallUrl } from "../config/config.ts";

const router = express.Router();

// GET /api/user/me - Get current user session info
router.get("/me", async (req, res) => {
  const token = req.cookies.devdash_session;
  
  if (!token) {
    console.log('❌ No token found');
    return res.status(401).json({
      success: false,
      error: "Not logged in",
      redirectTo: getGitHubAppInstallUrl()
    });
  }

  try {
    const payload = verifySessionToken(token);
    
    // Get full installation info from database - try by installation ID first, then account ID
    const installation = await findInstallationByIdOrAccountId(payload.installation_id);
    
    if (!installation) {
      console.log('Installation not found');
      return res.status(404).json({
        success: false,
        error: "Installation not found",
        redirectTo: getGitHubAppInstallUrl()
      });
    }

    return res.json({
      success: true,
      user: {
        account_login: installation.accountLogin,
        installation_id: installation.installationId,
        account_type: installation.accountType,
        account_id: installation.accountId,
        permissions: installation.permissions,
        repositories: installation.repositories,
        created_at: installation.createdAt,
        updated_at: installation.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return res.status(403).json({
      success: false,
      error: "Invalid token",
      redirectTo: getGitHubAppInstallUrl()
    });
  }
});

// POST /api/user/logout - Clear session
router.post("/logout", (req, res) => {
  res.clearCookie('devdash_session');
  res.clearCookie('devdash_installation_id');
  res.json({
    success: true,
    message: "Logged out successfully"
  });
});

// POST /api/user/session/set-token - Set session token from frontend
router.post("/session/set-token", async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    console.log('❌ No token provided to set-token endpoint');
    return res.status(400).json({
      success: false,
      error: "No token provided"
    });
  }

  try {
    console.log('🔧 Setting session token from frontend');
    
    // Verify the token is valid
    const payload = verifySessionToken(token as string);
    console.log('🔍 Token payload:', payload);
    console.log('✅ Token verified, setting cookie for:', payload.account_login);
    
    // Get full installation info from database
    const installation = await findInstallationByIdOrAccountId(payload.installation_id);
    
    if (!installation) {
      console.log('❌ Installation not found for token');
      return res.status(404).json({
        success: false,
        error: "Installation not found"
      });
    }
    
    // Set the session token cookie
    createSecureCookie(res, token as string);
    
    // Set installation ID as a separate cookie for refresh purposes
    res.cookie('devdash_installation_id', installation.installationId.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (longer than session token)
      path: '/',
    });
    
    // Return user data for Zustand store
    res.json({
      success: true,
      message: "Session token set successfully",
      user: {
        account_login: installation.accountLogin,
        installation_id: installation.installationId,
        account_type: installation.accountType,
        account_id: installation.accountId,
        permissions: installation.permissions,
        repositories: installation.repositories,
        created_at: installation.createdAt,
        updated_at: installation.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Failed to set session token:", error);
    res.status(400).json({
      success: false,
      error: "Invalid token"
    });
  }
});

// POST /api/user/refresh-token - Refresh session token using installation ID
router.post("/refresh-token", async (req, res) => {
  const installationId = req.cookies.devdash_installation_id;
  
  if (!installationId) {
    console.log('❌ No installation ID found for token refresh');
    return res.status(401).json({
      success: false,
      error: "No installation ID found"
    });
  }

  try {
    console.log('🔄 Refreshing token for installation:', installationId);
    
    // Get installation from database
    const installation = await findInstallationByIdOrAccountId(Number(installationId));
    
    if (!installation) {
      console.log('❌ Installation not found for refresh');
      return res.status(404).json({
        success: false,
        error: "Installation not found"
      });
    }
    
    // Create new session token
    const newToken = createSessionToken({
      account_login: installation.accountLogin,
      installation_id: installation.installationId,
      account_type: installation.accountType,
      account_id: installation.accountId,
    });
    
    // Set the new session token cookie
    createSecureCookie(res, newToken);
    
    console.log('✅ Token refreshed for:', installation.accountLogin);
    
    // Return user data
    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: {
        account_login: installation.accountLogin,
        installation_id: installation.installationId,
        account_type: installation.accountType,
        account_id: installation.accountId,
        permissions: installation.permissions,
        repositories: installation.repositories,
        created_at: installation.createdAt,
        updated_at: installation.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Failed to refresh token:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh token"
    });
  }
});

export default router; 