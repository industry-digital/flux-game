<template>
  <span
    class="combatant-glyph"
    :class="{ 'current-actor': isCurrentActor }"
    v-html="renderedGlyph"
  ></span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  team: {
    type: String,
    default: 'neutral'
  },
  facing: {
    type: String,
    default: null,
    validator: (value) => value === null || ['left', 'right'].includes(value)
  },
  direction: {
    type: String,
    default: null,
    validator: (value) => value === null || ['left', 'right'].includes(value)
  },
  currentActor: {
    type: String,
    default: null
  },
  colorScheme: {
    type: String,
    default: 'gruvbox',
    validator: (value) => ['default', 'debug', 'plain', 'high-contrast', 'gruvbox'].includes(value)
  },
  subjectTeam: {
    type: String,
    default: null
  },
  subscript: {
    type: Number,
    default: 1
  }
})

// Generate glyph symbol
const symbol = computed(() => {
  const firstLetter = props.name.charAt(0).toUpperCase()
  const subscriptChars = '₁₂₃₄₅₆₇₈₉'
  const subscriptChar = subscriptChars[props.subscript - 1] || '₁'
  return `${firstLetter}${subscriptChar}`
})

// Color strategies (same as BattlefieldNotation)
const colorStrategies = {
  default: {
    subject: (text) => `<span style="color: #00ffff">${text}</span>`,
    enemy: (text) => `<span style="color: #ff00ff">${text}</span>`,
    neutral: (text) => `<span style="color: #ff00ff">${text}</span>`
  },
  debug: {
    subject: (text) => `<span style="color: #00ff00">${text}</span>`,
    enemy: (text) => `<span style="color: #ff0000">${text}</span>`,
    neutral: (text) => text
  },
  plain: {
    subject: (text) => text,
    enemy: (text) => text,
    neutral: (text) => text
  },
  'high-contrast': {
    subject: (text) => `<span style="color: #00ff00; font-weight: bold">${text}</span>`,
    enemy: (text) => `<span style="color: #ff0000; font-weight: bold">${text}</span>`,
    neutral: (text) => `<span style="color: #ffffff; font-weight: bold">${text}</span>`
  },
  gruvbox: {
    subject: (text) => `<span style="color: #b8bb26">${text}</span>`,
    enemy: (text) => `<span style="color: #fb4934">${text}</span>`,
    neutral: (text) => `<span style="color: #ebdbb2">${text}</span>`
  }
}

// Determine team relationship
const getTeamRelationship = () => {
  if (!props.subjectTeam) return 'enemy'
  if (props.team === props.subjectTeam) return 'subject'
  return 'enemy'
}

// Check if this is the current actor
const isCurrentActor = computed(() => {
  return props.currentActor === props.name
})

// Render the complete glyph with optional facing/direction
const renderedGlyph = computed(() => {
  const strategy = colorStrategies[props.colorScheme]
  const relationship = getTeamRelationship()
  const coloredSymbol = strategy[relationship](symbol.value)

  // Use direction prop if provided, otherwise fall back to facing
  const facingDirection = props.direction || props.facing

  if (!facingDirection) {
    return coloredSymbol
  }

  if (facingDirection === 'left') {
    const coloredChevron = strategy[relationship]('<')
    return coloredChevron + coloredSymbol
  } else {
    const coloredChevron = strategy[relationship]('>')
    return coloredSymbol + coloredChevron
  }
})
</script>

<style scoped>
.combatant-glyph {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 1em;
  font-weight: 300;
}

/* Current actor highlighting */
.combatant-glyph.current-actor {
  font-weight: 900;
}
</style>
