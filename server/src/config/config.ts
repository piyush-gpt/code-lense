import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // GitHub App Configuration
  GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
  GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY!,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
  
  // GitHub App URLs (replace with your actual app slug)
  GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG!,
  
  // Server Configuration
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET!,
  
  MONGODB_URI: process.env.MONGODB_URI!,
  
  // Frontend URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'https://localhost:4000',
};

// Helper function to get GitHub App installation URL
export const getGitHubAppInstallUrl = () => {
  return `https://github.com/apps/${config.GITHUB_APP_SLUG}/installations/new`;
};

// Validate required environment variables
const requiredEnvVars = [
  'GITHUB_APP_ID',
  'GITHUB_PRIVATE_KEY', 
  'GITHUB_WEBHOOK_SECRET',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
} 
