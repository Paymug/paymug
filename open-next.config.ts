import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig({
	// Uncomment to enable R2 cache,
	// It should be imported as:
	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache,
});

export default {
	...cloudflareConfig,
	// Keep the framework build separate from `npm run build`, which produces
	// the complete OpenNext artifact used by Cloudflare's deploy phase.
	buildCommand: "npm run build:next",
};
