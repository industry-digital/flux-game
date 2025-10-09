// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { resolve } from 'path';

// https://astro.build/config
export default defineConfig({
	vite: {
		resolve: {
			alias: {
				'@flux/core': resolve(new URL('../core/dist/esm', import.meta.url).pathname),
				'@flux/ui': resolve(new URL('../ui/dist', import.meta.url).pathname),
			},
		},
	},
	integrations: [
		starlight({
			title: 'FSP Player Guide',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
