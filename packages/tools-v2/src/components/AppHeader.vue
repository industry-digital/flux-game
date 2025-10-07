<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo/Brand -->
      <div class="brand">
        <h1 class="brand-title">⚡ Flux Tools</h1>
        <span class="brand-subtitle">Game Development Suite</span>
      </div>

      <!-- Navigation -->
      <nav class="navigation">
        <RouterLink
          to="/combat"
          class="nav-link"
          :class="{ active: $route.name === 'combat' }"
        >
          ⚔️ Combat Sandbox
        </RouterLink>

        <!-- Future navigation items -->
        <!--
        <RouterLink
          to="/worldgen"
          class="nav-link"
          :class="{ active: $route.name === 'worldgen' }"
        >
          🌍 World Generator
        </RouterLink>
        -->
      </nav>

      <!-- Tool Info -->
      <div class="tool-info">
        <div class="current-tool">
          <span class="tool-name">{{ currentToolName }}</span>
          <span class="tool-description">{{ currentToolDescription }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const currentToolName = computed(() => {
  return route.meta?.title || 'Unknown Tool';
});

const currentToolDescription = computed(() => {
  return route.meta?.description || '';
});
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
  border-bottom: 2px solid var(--color-border);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.brand-title {
  font-family: 'Zilla Slab', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.brand-subtitle {
  font-family: 'Zilla Slab', serif;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.navigation {
  display: flex;
  gap: 1rem;
}

.nav-link {
  font-family: 'Zilla Slab', serif;
  padding: 0.5rem 1rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: var(--color-text);
  background-color: var(--color-hover);
  border-color: var(--color-border);
}

.nav-link.active {
  color: var(--color-text);
  background-color: var(--color-active);
  border-color: var(--color-border-focus);
  font-weight: 500;
}

.tool-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.current-tool {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tool-name {
  font-family: 'Zilla Slab', serif;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
}

.tool-description {
  font-family: 'Zilla Slab', serif;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  max-width: 200px;
}

/* Responsive design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .tool-info {
    align-items: flex-start;
    text-align: left;
  }

  .navigation {
    width: 100%;
    justify-content: center;
  }
}
</style>
