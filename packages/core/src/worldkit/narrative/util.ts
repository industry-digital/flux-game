export function toPossessive(name: string) {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}
