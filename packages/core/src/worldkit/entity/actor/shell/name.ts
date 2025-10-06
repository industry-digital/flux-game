const SHELL_NAME_ADJECTIVES = [
  'Impetuous',
  'Nimble',
  'Rapid',
  'Swift',
  'Agile',
  'Lethal',
  'Deadly',
  'Ruthless',
  'Ferocious',
  'Violent',
  'Ruthless',
  'Ferocious',
  'Violent',
  'Ruthless',
];

const SHELL_NAME_NOUNS = [
  'Bolt',
  'Bullet',
  'Eagle',
  'Falcon',
  'Hawk',
  'Jackdaw',
  'Osprey',
  'Otter',
  'Owl',
  'Vulture',
  'Wolf',
  'Bear',
  'Lion',
  'Tiger',
  'Leopard',
  'Panther',
  'Jaguar',
  'Cheetah',
  'Fox',
  'Dog',
  'Cat',
  'Mouse',
  'Rat',
  'Squirrel',
];

export const generateRandomShellName = (
  random = () => Math.random(),
): string => {
  const randomNumber = Math.floor(random() * 1000);
  const adjective = SHELL_NAME_ADJECTIVES[Math.floor(random() * SHELL_NAME_ADJECTIVES.length)];
  const noun = SHELL_NAME_NOUNS[Math.floor(random() * SHELL_NAME_NOUNS.length)];
  return `${adjective}${noun}${randomNumber}`;
};
