// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { resolve } from 'path';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
	},
	vite: {
		resolve: {
			alias: {
				'@flux/core': resolve(new URL('../core/dist/esm', import.meta.url).pathname),
				'@flux/ui': resolve(new URL('../ui/dist', import.meta.url).pathname),
			},
		},
	},
	integrations: [
		react(),
		starlight({
			title: 'FSP Player Guide',
			description: 'Comprehensive guide to the FSP tactical combat system',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			customCss: [
				'./src/styles/custom.css',
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Player Guide', slug: 'index' },
						{ label: 'Core Concepts', slug: 'concept/character' },
					],
				},
				{
					label: 'Combat System',
					items: [
						{ label: 'Combat Overview', slug: 'combat' },
						{ label: 'Notation', slug: 'combat/notation' },
					],
				},
				{
					label: 'Combat Actions',
					autogenerate: { directory: 'combat/actions' },
				},
				{
					label: 'Character System',
					items: [
						{ label: 'Characters', slug: 'character' },
						{ label: 'Party Management', slug: 'party' },
					],
				},
			],
		}),
	],
});
