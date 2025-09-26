<template>
  <div class="battlefield-notation">
    <div class="notation-display">
      <template v-for="(segment, index) in notationSegments" :key="index">
        <span v-if="segment.type === 'structure'" class="structure" v-html="segment.content"></span>
        <CombatantGlyph
          v-else-if="segment.type === 'glyph'"
          :name="segment.combatant.name"
          :team="segment.combatant.team"
          :facing="segment.combatant.facing"
          :currentActor="currentActor"
          :colorScheme="selectedColorScheme"
          :subjectTeam="subjectTeam"
          :subscript="segment.subscript"
        />
        <span v-else-if="segment.type === 'space'" class="facing-separator"> </span>
      </template>
    </div>
    <div v-if="showControls" class="notation-controls">
      <label>
        Color Scheme:
        <select v-model="selectedColorScheme" @change="updateNotation">
          <option value="default">Default</option>
          <option value="debug">Debug</option>
          <option value="plain">Plain</option>
          <option value="high-contrast">High Contrast</option>
          <option value="gruvbox">Gruvbox</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CombatantGlyph from './CombatantGlyph.vue'

const props = defineProps({
  combatants: {
    type: Array,
    required: true,
    validator: (combatants) => {
      return combatants.every(c =>
        typeof c.name === 'string' &&
        typeof c.position === 'number' &&
        ['left', 'right'].includes(c.facing) &&
        typeof c.team === 'string'
      )
    }
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
  showControls: {
    type: Boolean,
    default: false
  },
  subjectTeam: {
    type: String,
    default: null
  },
  boundaries: {
    type: Array,
    default: () => [],
    validator: (boundaries) => {
      return boundaries.every(b =>
        typeof b.position === 'number' &&
        ['left', 'right'].includes(b.side)
      )
    }
  }
})

const selectedColorScheme = ref(props.colorScheme)

// Generate segments for rendering
const notationSegments = computed(() => {
  const segments = []
  const symbols = generateActorSymbols(props.combatants)

  // Sort combatants by position, then by facing (for same position)
  const sortedCombatants = [...props.combatants].sort(
    (a, b) => {
      if (a.position !== b.position) return a.position - b.position
      return a.facing === 'left' ? -1 : (b.facing === 'left' ? 1 : 0)
    }
  )

  let currentPosition = null
  let hasLeftFacing = false
  let hasRightFacing = false

  for (const combatant of sortedCombatants) {
    // Handle position changes
    if (currentPosition !== null && combatant.position !== currentPosition) {
      // Close bracket
      segments.push({ type: 'structure', content: ' ]' })

      // Add distance
      const distance = combatant.position - currentPosition
      segments.push({
        type: 'structure',
        content: `─<span class="distance-number">${distance}</span>─`
      })

      // Reset for new position
      hasLeftFacing = false
      hasRightFacing = false
    }

    // Open bracket for new position
    if (currentPosition === null || combatant.position !== currentPosition) {
      segments.push({ type: 'structure', content: '[ ' })
    }

    // Handle facing transitions
    if (combatant.facing === 'left') {
      hasLeftFacing = true
    } else {
      if (hasLeftFacing && !hasRightFacing) {
        segments.push({ type: 'space' })
      }
      hasRightFacing = true
    }

    // Add the combatant glyph
    const subscriptNumber = getSubscriptNumber(combatant.name, symbols)
    segments.push({
      type: 'glyph',
      combatant,
      subscript: subscriptNumber
    })

    currentPosition = combatant.position
  }

  // Close final bracket
  if (currentPosition !== null) {
    segments.push({ type: 'structure', content: ' ]' })
  }

  // Add left boundaries (before combatants)
  const leftBoundaries = props.boundaries.filter(b => b.side === 'left')
  for (const boundary of leftBoundaries) {
    segments.unshift({ type: 'structure', content: '▌' })
    if (sortedCombatants.length > 0) {
      const firstPosition = Math.min(...sortedCombatants.map(c => c.position))
      const distance = firstPosition - boundary.position
      if (distance > 0) {
        segments.unshift({
          type: 'structure',
          content: `─<span class="distance-number">${distance}</span>─`
        })
      }
    }
  }

  // Add right boundaries (after combatants)
  const rightBoundaries = props.boundaries.filter(b => b.side === 'right')
  for (const boundary of rightBoundaries) {
    // Add distance to boundary
    const distance = boundary.position - (currentPosition || 0)
    if (distance > 0) {
      segments.push({
        type: 'structure',
        content: `─<span class="distance-number">${distance}</span>─`
      })
    }
    // Add boundary marker
    segments.push({ type: 'structure', content: '▌' })
  }

  return segments
})

// Helper functions
const generateActorSymbols = (combatants) => {
  const symbolMap = new Map()
  const letterCounts = new Map()

  combatants.forEach(combatant => {
    const firstLetter = combatant.name.charAt(0).toUpperCase()
    const count = letterCounts.get(firstLetter) || 0
    letterCounts.set(firstLetter, count + 1)
    symbolMap.set(combatant.name, `${firstLetter}₁`.replace('₁', `₁₂₃₄₅₆₇₈₉`[count] || `₁`))
  })

  return symbolMap
}

const getSubscriptNumber = (name, symbols) => {
  const symbol = symbols.get(name)
  const subscript = symbol?.slice(-1) || '₁'
  return '₁₂₃₄₅₆₇₈₉'.indexOf(subscript) + 1 || 1
}

const updateNotation = () => {
  // Force reactivity update
}
</script>

<style scoped>
.battlefield-notation {
  margin: 1rem 0;
}

.notation-display {
  font-family: 'Inconsolata', 'Courier New', monospace;
  font-size: 1.1rem;
  line-height: 1.5;
  padding: 1rem;
  background-color: #1a1a1a;
  border-radius: 4px;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.structure {
  color: #665c54; /* Gruvbox bg4 but slightly brighter */
  opacity: 0.8;
}

.facing-separator {
  display: inline-block;
  width: 0.5em;
}

/* Distance number spacing */
:deep(.distance-number) {
  margin: 0 2px;
  display: inline-block;
  color: #928374; /* Override faint structure color */
  opacity: 1;
  filter: brightness(1.4);
}

.notation-controls {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.notation-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.notation-controls select {
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 3px;
}
</style>
