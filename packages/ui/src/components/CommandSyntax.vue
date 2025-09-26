<template>
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
</template>

<script>
export default {
  name: 'CommandSyntax',
  props: {
    command: {
      type: Object,
      required: true,
      validator: (command) => {
        return typeof command.intent === 'string' &&
               (!command.args || Array.isArray(command.args))
      }
    }
  }
}
</script>

<style scoped>
.command-syntax {
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
</style>
