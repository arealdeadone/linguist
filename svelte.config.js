import adapter from '@sveltejs/adapter-node';
// import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Default: adapter-node for K8s/self-hosted deploys.
		// For Vercel deploys: install @sveltejs/adapter-vercel and switch to adapter: adapterVercel().
		adapter: adapter(),
		csrf: {
			trustedOrigins: ['*']
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
