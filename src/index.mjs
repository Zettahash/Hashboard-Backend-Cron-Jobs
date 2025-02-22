/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */
// import 'dotenv/config'
// const env = process.env

import { exchanges, getBitcoin, getEth } from './functions/update-records.mjs';




export default {
	async scheduled(controller, env, ctx) {
		await exchanges(env)
		await getBitcoin(env)
		await getEth(env)

		console.log(`Done`);
	},
};
