const SECOND = 1_000;
const MINUTE = 60 * 1_000;
const HOUR = 60 * 60 * 1_000;
const DAY = 24 * 60 * 60 * 1_000;

/**
 * Return a human-readable description of the age of an object.
 * Examples:
 *   - 1 day ago
 *   - 2 hours ago
 *   - 30 minutes ago
 *   - 10 seconds ago
 *   - just now
 */
export const describeAge = (age: number, now = Date.now()): string => {
  const diff = now - age;

  if (diff < 0) {
    return 'in the future';
  }

  if (diff < SECOND) {
    return 'just now';
  }

  const seconds = Math.floor(diff / SECOND);
  if (diff < MINUTE) {
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }

  const minutes = Math.floor(diff / MINUTE);
  if (diff < HOUR) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(diff / HOUR);
  if (diff < DAY) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(diff / DAY);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};
