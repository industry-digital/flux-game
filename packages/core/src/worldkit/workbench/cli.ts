export const SHELL_CLI_USAGE = `
  \`shell diff\` to view pending changes
  \`shell commit\` to apply pending changes
  \`shell undo\` to discard pending changes
`.trim();

export const createCliMessage = (message: string) => {
  return `
    ${message}
    ${SHELL_CLI_USAGE}
  `.trim();
};
