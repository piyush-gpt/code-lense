// webhooks.ts - Main webhook setup and handler
import { Webhooks } from "@octokit/webhooks";
import dotenv from "dotenv";
import { 
  setupInstallationWebhooks, 
  setupPullRequestWebhooks, 
  setupIssueWebhooks,
  setupCommonWebhooks, 
  setupCITestWebhooks 
} from "./index.ts";

dotenv.config();

console.log("Using secret:", process.env.GITHUB_WEBHOOK_SECRET);
const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!
});

// Setup all webhook handlers
setupInstallationWebhooks(webhooks);
setupPullRequestWebhooks(webhooks);
setupIssueWebhooks(webhooks);
setupCommonWebhooks(webhooks);
setupCITestWebhooks(webhooks);

export default (req, res) => {
  // Verify and process the webhook
  webhooks.verifyAndReceive({
    id: req.headers['x-github-delivery'],
    name: req.headers['x-github-event'],
    payload: req.body.toString("utf8"),
    signature: req.headers['x-hub-signature-256']
  })
    .then(() => res.status(200).send('Webhook processed ✅'))
    .catch(err => {
      console.error('❌ Webhook error:', err);
      res.status(400).send('Invalid webhook');
    });
};