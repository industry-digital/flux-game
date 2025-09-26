<template>
  <table class="command-table">
    <thead>
      <tr>
        <th>Command</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(command, index) in commands" :key="index">
        <td class="command-cell">
          <code>
            {{ command.intent }}
            <template v-if="command.args">
              <span v-for="(arg, argIndex) in command.args" :key="argIndex" class="command-arg">
                &lt;{{ arg.symbol }}&gt;
              </span>
            </template>
          </code>
        </td>
        <td class="description-cell">
          <template v-if="typeof command.description === 'function'">
            <span v-html="command.description(getArgsObject(command.args))"></span>
          </template>
          <template v-else>
            {{ command.description }}
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'CommandSyntaxTable',
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
.command-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  table-layout: fixed;
}

.command-table th,
.command-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 18px;
  line-height: 32px;
}

.command-table th {
  font-weight: 600;
  background-color: var(--vp-c-bg-soft);
}

.command-cell {
  width: 300px;
  vertical-align: top;
}

.command-cell code {
  font-family: var(--vp-font-family-mono);
  font-size: 20px;
  background: var(--vp-code-bg);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  white-space: nowrap;
}

:deep(.command-arg) {
  color: var(--vp-c-brand);
  font-weight: 600;
  margin-left: 0.3em;
  font-family: var(--vp-font-family-mono);
}

.command-arg {
  color: var(--vp-c-brand);
  font-weight: 600;
  margin-left: 0.3em;
  font-family: var(--vp-font-family-mono);
}

.description-cell :deep(.command-arg) {
  margin-left: 0;
  margin-right: 0;
}

.description-cell {
  vertical-align: top;
}

.command-table tr:hover {
  background-color: var(--vp-c-bg-soft);
}
</style>
