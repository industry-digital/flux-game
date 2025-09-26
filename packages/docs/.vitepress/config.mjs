import { defineConfig } from 'vitepress'
import { resolve } from 'path'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Player Guide',
  description: 'Complete guide to Flux MUD mechanics and systems',

  // Site configuration
  base: '/',
  srcDir: 'src',
  outDir: 'dist',

  // Head configuration for fonts and meta
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }],
    ['link', {
      href: 'https://fonts.googleapis.com/css2?family=Zilla+Slab:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap',
      rel: 'stylesheet'
    }]
  ],

  // Theme configuration
  themeConfig: {
    nav: [
      { text: 'Player Guide', link: '/' },
      { text: 'Combat', link: '/combat/' }
    ],

            sidebar: {
              '/': [
                {
                  text: 'Combat',
                  items: [
                    { text: 'Overview', link: '/combat/' },
                    { text: 'Encounters', link: '/combat/encounters' },
                    { text: 'Actions', link: '/combat/actions/' },
                    { text: 'Planning System', link: '/combat/planning' },
                    { text: 'Battlefield Notation', link: '/combat/notation' },
                    { text: 'Action Points', link: '/combat/action-points' },
                    { text: 'Movement', link: '/combat/movement' },
                    { text: 'Hit Resolution', link: '/combat/hit-resolution' }
                  ]
                }
              ]
            },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo/flux' }
    ],

    search: {
      provider: 'local'
    }
  },

  // Markdown configuration
  markdown: {
    math: true,
    lineNumbers: false
  },

  // Mermaid configuration
  mermaid: {
    // Refer to https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults
  },

  // Vite configuration
  vite: {
    resolve: {
      alias: {
        '@vitepress': resolve(__dirname)
      }
    }
  }
}))
