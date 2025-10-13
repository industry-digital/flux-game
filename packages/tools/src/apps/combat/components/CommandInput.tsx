import { useState, type KeyboardEvent } from 'react';

export interface CommandInputProps {
  onCommand: (command: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Command input component with history navigation and theming
 */
export function CommandInput({
  onCommand,
  disabled = false,
  placeholder = "Enter command (e.g., target alice, reposition 150, attack)"
}: CommandInputProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const command = input.trim();

      // Add to history
      setCommandHistory(prev => [command, ...prev.slice(0, 19)]); // Keep last 20 commands
      setHistoryIndex(-1);

      // Execute command
      onCommand(command);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div
      className="command-input rounded-lg p-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)'
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-transparent border rounded"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 'var(--font-size-sm)',
          backgroundColor: 'transparent',
          outline: 'none'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-border-focus)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border)';
        }}
      />

      {commandHistory.length > 0 && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)'
        }}>
          ↑↓ Navigate history ({commandHistory.length} commands)
        </div>
      )}
    </div>
  );
}
