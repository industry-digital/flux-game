import { ReactNode } from 'react';
import type { TerminalEntry } from '~/types';

/**
 * Utility functions for creating different types of terminal entries
 * These preserve the ability to render arbitrary React elements while
 * providing convenient helpers for common entry types
 */

export function createTextEntry(
  id: string,
  text: string,
  metadata?: TerminalEntry['metadata']
): TerminalEntry {
  return {
    id,
    type: 'text',
    content: text,
    timestamp: Date.now(),
    metadata,
  };
}

export function createInputEntry(
  id: string,
  input: string,
  metadata?: TerminalEntry['metadata']
): TerminalEntry {
  return {
    id,
    type: 'input',
    content: input,
    timestamp: Date.now(),
    metadata,
  };
}

export function createSystemEntry(
  id: string,
  message: string,
  metadata?: TerminalEntry['metadata']
): TerminalEntry {
  return {
    id,
    type: 'system',
    content: message,
    timestamp: Date.now(),
    metadata,
  };
}

export function createErrorEntry(
  id: string,
  error: string,
  metadata?: TerminalEntry['metadata']
): TerminalEntry {
  return {
    id,
    type: 'error',
    content: error,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Creates a terminal entry with an arbitrary React element
 * This preserves the full flexibility to render any React component
 *
 * @param id - Unique identifier for the entry
 * @param element - Any React component or element
 * @param metadata - Optional metadata for the entry
 * @param height - Optional height hint for virtualization
 */
export function createElementEntry(
  id: string,
  element: ReactNode,
  metadata?: TerminalEntry['metadata'],
  height?: number
): TerminalEntry {
  return {
    id,
    type: 'element',
    content: element,
    timestamp: Date.now(),
    metadata,
    height,
  };
}

/**
 * Creates a terminal entry from a WorldEvent with embedded narrative
 * This is the adapter function that transforms domain objects to presentation
 */
export function createWorldEventEntry(
  worldEvent: {
    id: string;
    narrative?: {
      self?: string;
      observer?: string;
    };
    actor?: string;
    trace?: string;
    type?: string;
    ts?: number;
  },
  currentActor?: string
): TerminalEntry {
  // Extract appropriate narrative based on perspective
  const narrative = worldEvent.actor === currentActor
    ? worldEvent.narrative?.self
    : worldEvent.narrative?.observer;

  return {
    id: worldEvent.id,
    type: 'text',
    content: narrative || '[No narrative available]',
    timestamp: worldEvent.ts || Date.now(),
    metadata: {
      actor: worldEvent.actor,
      trace: worldEvent.trace,
      eventType: worldEvent.type,
    },
  };
}

/**
 * Example usage for creating React element entries:
 *
 * // Simple React component
 * const customComponent = <div>Custom content</div>;
 * const entry = createElementEntry('custom-1', customComponent);
 *
 * // Complex interactive component
 * const interactiveEntry = createElementEntry(
 *   'interactive-1',
 *   <InteractiveWidget onAction={handleAction} />,
 *   { actor: 'player-123' },
 *   100 // height hint for virtualization
 * );
 *
 * // Rich content with styling
 * const richEntry = createElementEntry(
 *   'rich-1',
 *   <div className="custom-terminal-content">
 *     <h3>Combat Results</h3>
 *     <ProgressBar value={75} />
 *     <button onClick={handleContinue}>Continue</button>
 *   </div>
 * );
 */

// Export height calculation utilities
export * from './utils/heightCalculation';
