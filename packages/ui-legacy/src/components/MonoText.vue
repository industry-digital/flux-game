<template>
  <span class="mono-text">
    <slot></slot>
  </span>
</template>

<script>
export default {
  name: 'MonoText'
}
</script>

<style scoped>
.mono-text {
  font-family: 'Inconsolata', 'Courier New', monospace;
  font-size: 1.1rem;
  background-color: #1a1a1a;
  color: #ebdbb2; /* Gruvbox light foreground */
  padding: 0.2em 0.4em;
  border-radius: 3px;
  white-space: nowrap;
}

/* Light mode adjustments */
@media (prefers-color-scheme: light) {
  .mono-text {
    background-color: #f5f5f5;
    color: #3c3836; /* Gruvbox dark foreground */
  }
}

/* VitePress theme integration */
html.dark .mono-text {
  background-color: #1a1a1a;
  color: #ebdbb2;
}

html:not(.dark) .mono-text {
  background-color: #f5f5f5;
  color: #3c3836;
}
</style>
