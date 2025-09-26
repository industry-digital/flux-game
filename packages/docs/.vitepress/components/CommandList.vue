<template>
  <div class="command-list">
    <div v-for="(command, index) in commands" :key="index" class="command-item">
      <div class="command-syntax">
        <code>
          {{ command.intent }}
          <template v-if="command.args">
            <span v-for="(arg, argIndex) in command.args" :key="argIndex" class="command-arg">
              &lt;{{ arg.symbol }}&gt;
            </span>
          </template>
        </code>
      </div>

      <div class="command-description">
        <template v-if="typeof command.description === 'function'">
          <span v-html="command.description(getArgsObject(command.args))"></span>
        </template>
        <template v-else>
          {{ command.description }}
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommandList',
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

.command-syntax {
  margin-bottom: 0.5rem;
  margin-left: 1rem;
}

.command-syntax code {
  font-family: var(--vp-font-family-mono);
  font-size: 20px;
  background: var(--vp-code-bg);
  padding: 0.5em 0.75em;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid var(--vp-c-border);
}

.command-arg {
  color: var(--vp-c-brand);
  font-weight: 600;
  margin-left: 0.3em;
  font-family: var(--vp-font-family-mono);
}

.command-description {
  font-size: 24px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  margin-left: 0.75em;
}

.command-description :deep(.command-arg) {
  color: var(--vp-c-brand);
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
}
</style>
