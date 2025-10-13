import type { TerminalEntry } from '~/types/terminal';

/**
 * Configuration for height calculation
 */
export interface HeightCalculationConfig {
  /** Base line height in pixels */
  baseLineHeight: number;
  /** Average characters per line (used for estimation) */
  charactersPerLine: number;
  /** Minimum height for any entry */
  minHeight: number;
  /** Maximum height for any entry (prevents runaway heights) */
  maxHeight: number;
  /** Additional padding per entry */
  entryPadding: number;
}

export const DEFAULT_HEIGHT_CONFIG: HeightCalculationConfig = {
  baseLineHeight: 20,
  charactersPerLine: 80, // Reasonable estimate for terminal width
  minHeight: 32,
  maxHeight: 200,
  entryPadding: 12, // 0.375rem top + 0.375rem bottom + margin
};

/**
 * Estimates the height of a terminal entry based on its content
 *
 * This provides a reasonable approximation without requiring DOM measurement,
 * making it suitable for virtualization systems that need height before rendering.
 */
export function estimateEntryHeight(
  entry: TerminalEntry,
  config: HeightCalculationConfig = DEFAULT_HEIGHT_CONFIG
): number {
  // If entry already has a height hint, use it
  if (entry.height && entry.height > 0) {
    return Math.max(config.minHeight, Math.min(config.maxHeight, entry.height));
  }

  let estimatedLines = 1;

  if (typeof entry.content === 'string') {
    const text = entry.content;

    // Count explicit line breaks
    const explicitLines = (text.match(/\n/g) || []).length + 1;

    // Estimate wrapped lines based on character count
    const wrappedLines = Math.ceil(text.length / config.charactersPerLine);

    // Use the maximum of explicit and wrapped line estimates
    estimatedLines = Math.max(explicitLines, wrappedLines);
  } else {
    // For React elements, use a conservative estimate
    // Could be enhanced with more sophisticated logic based on element type
    estimatedLines = 2;
  }

  const calculatedHeight = (estimatedLines * config.baseLineHeight) + config.entryPadding;

  return Math.max(config.minHeight, Math.min(config.maxHeight, calculatedHeight));
}

/**
 * Creates a height calculation function for use with virtualization
 *
 * This function can be passed to the virtualization system to provide
 * dynamic height calculation based on entry content.
 */
export function createHeightCalculator(
  entries: TerminalEntry[],
  config: HeightCalculationConfig = DEFAULT_HEIGHT_CONFIG
): (index: number) => number {
  return (index: number): number => {
    const entry = entries[index];
    if (!entry) {
      return config.minHeight;
    }

    return estimateEntryHeight(entry, config);
  };
}

/**
 * Updates terminal entries with calculated heights
 *
 * This mutates the entries array to add height properties,
 * which can then be used by the virtualization system.
 */
export function updateEntriesWithHeights(
  entries: TerminalEntry[],
  config: HeightCalculationConfig = DEFAULT_HEIGHT_CONFIG
): void {
  for (const entry of entries) {
    if (!entry.height) {
      entry.height = estimateEntryHeight(entry, config);
    }
  }
}
