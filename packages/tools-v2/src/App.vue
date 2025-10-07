<template>
  <div class="app-container">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue';
</script>

<style>
/* Import fonts first to avoid CSS import order issues */
@import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@300;400;500;600;700&display=swap');

/* Global app styles using theme system */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--color-background);
  color: var(--color-text);
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
