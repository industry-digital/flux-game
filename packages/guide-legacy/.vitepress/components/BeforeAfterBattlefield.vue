<template>
  <div class="before-after-battlefield">
    <div class="battlefield-row">
      <div class="section-header before-header">
        <span class="section-label">Before</span>
      </div>
      <div class="battlefield-content">
        <slot name="before"></slot>
      </div>
    </div>

    <div class="battlefield-row">
      <div class="section-header after-header">
        <span class="section-label">After</span>
      </div>
      <div class="battlefield-content">
        <slot name="after"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.before-after-battlefield {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.battlefield-row {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  flex-shrink: 0;
  padding: 1rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 100px;
  text-align: center;
}

.before-header {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.after-header {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-dark);
}

.battlefield-content {
  flex: 1;
  padding: 0;
  background-color: #1a1a1a;
  display: flex;
  align-items: center;
}

/* Remove margin from BattlefieldNotation component */
.battlefield-content :deep(.battlefield-notation) {
  margin: 0;
}
</style>
