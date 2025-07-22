// common.ts - Common webhook handlers and utilities
import { Webhooks } from "@octokit/webhooks";

export function setupCommonWebhooks(webhooks: Webhooks) {
  // All other events (for debug/logging)
  webhooks.onAny(({ name, payload }) => {
    console.log(`🔔 Webhook: ${name}`);
    //@ts-ignore
    console.log("Payload installation ID:", payload.installation?.id);
  });

  // Errors
  webhooks.onError((error) => {
    console.error("❌ Webhook error:", error);
  });
} 