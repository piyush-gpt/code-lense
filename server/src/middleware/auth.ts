import type { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../auth/auth.ts';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { config } from '../config/config.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    account_login: string;
    installation_id: number;
    account_type: 'User' | 'Organization';
    octokit?: any;
  };
}

export async function getInstallationOctokit(installation_id: number) {

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_PRIVATE_KEY,
      installationId: installation_id,
    },
  });

              return octokit;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.devdash_session;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }

  try {
    const payload = verifySessionToken(token);
    
   
    const octokit = await getInstallationOctokit(payload.installation_id);

    // Attach user info to request
    req.user = {
      ...payload,
      octokit
    };

    next();
  } catch (error) {
    console.error("❌ Auth middleware failed:", error);
    return res.status(403).json({
      success: false,
      error: "Invalid session"
    });
  }
}; 
