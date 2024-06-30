				import worker, * as OTHER_EXPORTS from "/Users/edsin/Workspace/APP/Zettahash/hashboard_cron/src/index.mjs";
				import * as __MIDDLEWARE_0__ from "/Users/edsin/Workspace/APP/Zettahash/hashboard_cron/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/Users/edsin/Workspace/APP/Zettahash/hashboard_cron/node_modules/wrangler/templates/middleware/middleware-scheduled.ts";
import * as __MIDDLEWARE_2__ from "/Users/edsin/Workspace/APP/Zettahash/hashboard_cron/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";
				
				worker.middleware = [
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default,__MIDDLEWARE_2__.default,
					...(worker.middleware ?? []),
				].filter(Boolean);
				
				export * from "/Users/edsin/Workspace/APP/Zettahash/hashboard_cron/src/index.mjs";
				export default worker;