<template>
  <div class="command-list">
    <div v-for="(command, index) in commands" :key="index" class="command-item">
      <div class="command-description">
        <template v-if="typeof command.description === 'function'">
          <span v-html="command.description(getArgsObject(command.args))"></span>
        </template>
        <template v-else>
          {{ command.description }}
        </template>
      </div>

      <CommandSyntax :command="command" />
    </div>
  </div>
</template>

<script>
import CommandSyntax from './CommandSyntax.vue'

export default {
  name: 'CommandListAlt',
  components: {
    CommandSyntax
  },
  props: {
    commands: {
      type: Array,
      required: true,
      validator: (commands) => {
        return commands.every(cmd =>
          typeof cmd.intent === 'string' &&
          (typeof cmd.description === 'string' || typeof cmd.description === 'function')
        )
      }
    }
  },
  methods: {
    getArgsObject(args) {
      if (!args) return {};
      const argsObj = {};
      args.forEach(arg => {
        argsObj[arg.symbol] = `<span class="command-arg">&lt;${arg.symbol}&gt;</span>`;
      });
      return argsObj;
    }
  }
}
</script>

<style scoped>
.command-list {
  margin: 1rem 0;
}

.command-item {
  margin-bottom: 2rem;
}

.command-item:last-child {
  margin-bottom: 0;
}

.command-description {
  font-size: 24px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
  /* Removed left margin/padding */
}


.command-description :deep(.command-arg) {
  color: var(--vp-c-brand);
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
}
</style>
