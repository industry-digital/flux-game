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
          <code>{{ command.intent }}</code>
        </td>
        <td class="description-cell">
          {{ command.description }}
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
          typeof cmd.description === 'string'
        )
      }
    }
  }
}
</script>

<style scoped>
.command-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.command-table th,
.command-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.command-table th {
  font-weight: 600;
  background-color: var(--vp-c-bg-soft);
}

.command-cell {
  width: 40%;
  vertical-align: top;
}

.command-cell code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
  background: var(--vp-code-bg);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  white-space: nowrap;
}

.description-cell {
  width: 60%;
  vertical-align: top;
}

.command-table tr:hover {
  background-color: var(--vp-c-bg-soft);
}
</style>
