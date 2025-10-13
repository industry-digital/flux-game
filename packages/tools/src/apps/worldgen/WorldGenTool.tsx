export interface WorldGenToolProps {
  // Props will be defined as we migrate from legacy
}

export function WorldGenTool({}: WorldGenToolProps) {
  return (
    <div>
      <h2>World Generator</h2>
      <p>World generation tool will be migrated from legacy implementation.</p>
      <div style={{
        padding: '2rem',
        border: '2px dashed #ccc',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>🌍 World generation interface coming soon...</p>
        <p>This will include:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Interactive canvas for world editing</li>
          <li>Generation parameter controls</li>
          <li>File import/export functionality</li>
          <li>Zoom and pan controls</li>
        </ul>
      </div>
    </div>
  );
}

// Named export only - no default export
