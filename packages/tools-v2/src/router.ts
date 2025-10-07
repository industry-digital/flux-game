import { createRouter, createWebHistory } from 'vue-router';

// Lazy load combat app for better performance
const CombatApp = () => import('~/apps/combat/CombatApp.vue');

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/combat'
    },
    {
      path: '/combat',
      name: 'combat',
      component: CombatApp,
      meta: {
        title: 'Combat Sandbox',
        description: 'Interactive combat simulation and testing tool'
      }
    },
    // Future routes for other tools
    // {
    //   path: '/worldgen',
    //   name: 'worldgen',
    //   component: () => import('~/apps/worldgen/WorldGenApp.vue'),
    //   meta: {
    //     title: 'World Generator',
    //     description: 'Procedural world generation tool'
    //   }
    // },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/combat'
    }
  ]
});

// Global navigation guards for title updates
router.beforeEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - Flux Tools`;
  }
});

export default router;
