import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental cache binding, so ISR pages (`revalidate = 60`
// on /eval) render on request instead of from a shared cache.
export default defineCloudflareConfig();
