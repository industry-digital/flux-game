# Flux Game Client: A Literary Interface Vision

## Core Philosophy: The Mind's Eye First

Our game client reimagines the traditional MUD interface as a **literary reading experience** where story emerges naturally from the world's systems. Numbers serve the narrative, never the reverse. We design primarily for the mind's eye—the most powerful visualization engine ever created—while ensuring complete accessibility for visually impaired players.

## Open Source by Design

**Complete Transparency**: In alignment with our first principles of trust and transparency, both our literary game client and the entire `flux-game` package are **fully open source** under the MIT license. This isn't just about technical openness—it's about building trust through transparency and empowering the community to build the game experiences they want.

**Why Open Source Matters**:
- **Trust Through Transparency**: Players can see exactly how their client works
- **Community Innovation**: Developers can learn from, improve, and extend our implementations
- **Accessibility First**: Open source enables specialized accessibility tools and improvements
- **Protocol Evolution**: Community contributions help evolve the Facts system
- **Security Assurance**: Public code review ensures robust security practices

## Design Principles

### 1. E-Book Reading Experience
- **Wide margins** create breathing room and focus attention on the text
- **Crisp, highly legible serif typography** using Zilla Slab for warmth and readability
- **Generous line spacing** (1.6-1.8) for comfortable reading
- **Optimal line length** (45-75 characters) prevents eye strain
- **Typewriter effect** reveals text progressively, creating anticipation and rhythm

### 2. Accessibility as Core Design
- **Screen reader optimized** with proper ARIA labels and semantic HTML
- **High contrast mode** with customizable color schemes
- **Scalable typography** from 12pt to 32pt without breaking layout
- **Keyboard-first navigation** with intuitive shortcuts
- **Audio narration** with natural speech synthesis
- **Voice command recognition** for hands-free interaction
- **Haptic feedback** for supported devices

### 3. Narrative Enrichment
Raw player commands are transformed into literary prose through client-side enrichment:

```
Player types: say "give me ur ration"
Client displays: Cassius says, "I hunger, Darrow. Give me some bread."

Player types: n
Client displays: You walk north through the cobblestone streets,
                 your footsteps echoing off the narrow walls.

Player types: look
Client displays: The marketplace spreads before you, alive with
                 the chatter of merchants and the sweet smell of
                 fresh bread from the baker's stall.
```

### 4. Transparent Mechanics: The Combat Log
While the default experience prioritizes narrative immersion, **every calculation is mathematically precise and discoverable**. The Combat Log provides complete transparency for those who want to understand the mechanics:

**Narrative View (Default):**
```
The goblin swings wildly at you, but you deftly sidestep the crude blade.
Your riposte finds its mark, and the goblin staggers backward, clutching
its wounded shoulder.
```

**Combat Log (Optional):**
```
═══ COMBAT LOG ═══
[Turn 1] Goblin attacks Player
  • Base Attack: 1d20 + 2 (STR) = 14 + 2 = 16
  • Player AC: 18 (10 + 5 armor + 2 DEX + 1 dodge)
  • Result: MISS (16 < 18)

[Turn 1] Player riposte triggered (missed by ≤2)
  • Riposte Attack: 1d20 + 4 (DEX) + 2 (weapon) = 11 + 4 + 2 = 17
  • Goblin AC: 15 (10 + 3 leather + 2 DEX)
  • Result: HIT (17 ≥ 15)
  • Damage: 1d6 + 2 (STR) = 4 + 2 = 6 piercing
  • Location: Right shoulder (rolled 73/100)
  • Goblin HP: 22 → 16
═══════════════════
```

**Key Features:**
- **Hidden by default** to maintain narrative immersion
- **Toggle accessible** via keyboard shortcut (`Ctrl+M`) or voice command
- **Retroactive detail** - view mechanics for any past action
- **Mathematical precision** with every die roll, modifier, and calculation shown
- **Accessible formatting** with clear headings and structured data
- **Educational value** helps players understand the underlying systems

## Interface Layout: Two Distinct Experiences

### E-Book Mode: Literary Immersion

**The Reading View** - Default experience designed for narrative immersion:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────┐    │
│    │                                                             │    │
│    │  The sun climbs toward its zenith as you emerge from        │    │
│    │  the shadowed alleyway into the bustling marketplace.       │    │
│    │  Merchants call out their wares while children dart         │    │
│    │  between the stalls. The air carries the mingled scents     │    │
│    │  of spices, fresh bread, and the distant sea.               │    │
│    │                                                             │    │
│    │  > You say, "Good morning, baker."                          │    │
│    │                                                             │    │
│    │  The baker looks up from his work, flour dusting his        │    │
│    │  weathered hands. "Ah, a traveler! Welcome to our          │    │
│    │  humble market. The bread is fresh from the ovens."         │    │
│    │                                                             │    │
│    │  ▊                                                          │    │
│    │                                                             │    │
│    └─────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  [Status: Healthy] [Location: Millhaven Market] [Time: Mid-morning]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**E-Book Mode Features:**
- **Central text column** with 4-6em margins on each side
- **Subtle status bar** at bottom with essential information
- **Cursor indicator** (▊) shows input position
- **Progressive text revelation** with typewriter effect
- **Smooth scrolling** to maintain reading flow
- **Literary typography** with Zilla Slab serif font
- **Immersive narrative** with client-side enrichment

### Terminal Compatibility Mode: Classic MUD Experience

**The Terminal View** - Traditional interface for MUD veterans and efficiency-focused players:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ The Prancing Pony                                                      │
│ A cozy tavern with wooden tables and flickering candles. The air is    │
│ thick with the scent of ale and conversation.                          │
│                                                                         │
│ Exits: north to Main Street, east to Kitchen                           │
│                                                                         │
│ Gandalf is here.                                                        │
│ A gleaming sword lies on the bar.                                       │
│                                                                         │
│ > say Good morning, baker                                               │
│ You say, "Good morning, baker."                                         │
│                                                                         │
│ The baker looks up from his work, flour dusting his weathered hands.   │
│ The baker says, "Ah, a traveler! Welcome to our humble market. The     │
│ bread is fresh from the ovens."                                         │
│                                                                         │
│ > ▊                                                                     │
│                                                                         │
│ [HP: 100/100] [MP: 50/50] [Location: Millhaven Market] [10:23 AM]      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Terminal Compatibility Mode Features:**

**Monospace Font Options** with traditional formatting:
- **Consolas**: Microsoft's programming font with excellent readability
- **SF Mono**: Apple's system monospace font for macOS
- **Cascadia Code**: Microsoft's modern terminal font with ligatures
- **System Default**: Respects user's terminal font preferences
- **Customizable sizing**: 10-16pt with pixel-perfect rendering

**Immediate Text Display** without animation delays:
- **Zero latency**: Text appears instantly for maximum efficiency
- **No typewriter effect**: Removes all animation delays
- **Bulk rendering**: Large text blocks appear immediately
- **Scrollback buffer**: Efficient handling of large amounts of text

**Compact Information Density** with minimal visual decoration:
- **Maximum text per screen**: Optimized for information throughput
- **Minimal margins**: Uses full terminal width
- **Dense formatting**: Traditional MUD-style layout
- **Structured output**: Clear separation between game elements

**Full Keyboard Navigation** with extensive shortcut support:
- **Classic MUD shortcuts**: Tab completion, command history (↑/↓)
- **Power user commands**: Ctrl+R (repeat), Ctrl+L (clear), Ctrl+U (clear line)
- **Window management**: Alt+Tab (switch windows), Ctrl+PageUp/Down (scroll)
- **Accessibility shortcuts**: All functions keyboard-accessible

**Raw Command Input** without client-side modification:
- **Direct command transmission**: No enrichment or modification
- **Aliases and triggers**: User-defined automation without forced enhancements
- **Command history**: Intelligent recall with fuzzy matching
- **Tab completion**: Server-provided completion suggestions

**Traditional MUD Formatting** with familiar status indicators:
- **Status bars**: HP/MP/Location in familiar format
- **Prompt customization**: User-defined prompt styles
- **Color support**: ANSI colors and terminal themes
- **Compatibility**: Works with existing MUD muscle memory

**Vim-Style Modal Commands** (optional feature):
- **Modal editing paradigm**: Switch between command and insert modes
- **Normal mode**: Navigate history, execute commands, manage buffers
- **Insert mode**: Standard text input for commands and chat
- **Command mode**: Execute meta-commands (`:alias`, `:trigger`, `:settings`)
- **Visual mode**: Select and manipulate text blocks
- **Familiar keybindings**: `hjkl` navigation, `dd` delete line, `yy` copy
- **Buffer management**: Multiple command buffers with `:b1`, `:b2`, etc.
- **Search and replace**: `/pattern` search, `:%s/old/new/g` replace
- **Macro recording**: `q` to record, `@` to replay command sequences
- **Split windows**: `:split` horizontal, `:vsplit` vertical panes
- **Tab management**: `:tabnew`, `:tabnext` for multiple sessions

**Vim Mode Benefits for Power Users**:
```typescript
// Example Vim-style commands in terminal mode
Normal mode:
  k/j           - Navigate command history up/down
  dd            - Delete current command line
  yy            - Copy current command to clipboard
  /pattern      - Search command history
  :alias gn go north  - Create alias
  :trigger "You are hungry" "eat bread"  - Create trigger

Insert mode:
  i             - Enter insert mode for command input
  ESC           - Return to normal mode

Command mode:
  :w            - Save current session
  :q            - Quit gracefully
  :settings     - Open settings panel
  :plugins      - Manage plugins
  :help vim     - Vim keybindings reference
```

**Optional Activation**:
- **Disabled by default**: Maintains familiar MUD experience
- **Easy toggle**: `:set vim` to enable, `:set novim` to disable
- **Per-profile setting**: Can be enabled in specific user profiles
- **Learning curve**: Gentle introduction with helpful hints
- **Fallback mode**: Always falls back to standard editing if needed

### Mode Switching

**Seamless Transition**: Players can switch between modes instantly:
- **Keyboard shortcut**: `Ctrl+Alt+M` toggles between modes
- **Voice command**: "Switch to terminal mode" or "Switch to e-book mode"
- **Settings menu**: Persistent preference with mode-specific customizations
- **Context-aware**: Some players prefer e-book for exploration, terminal for combat

**Shared Functionality**: Both modes use the same underlying Facts system:
- **Same game data**: Identical access to world information
- **Same XMPP connection**: No reconnection required
- **Same accessibility features**: Screen readers work in both modes
- **Same command processing**: All commands available in both interfaces

### Mode Comparison

| Feature | E-Book Mode | Terminal Compatibility Mode |
|---------|-------------|-------------|
| **Target Audience** | New players, narrative focus | MUD veterans, efficiency focus |
| **Typography** | Zilla Slab serif, 16-18pt | Monospace options, 12-14pt |
| **Layout** | Centered column, wide margins | Full-width, minimal margins |
| **Text Reveal** | Typewriter effect, paced | Immediate display, zero latency |
| **Command Input** | Enriched ("say hello" → literary prose) | Raw input ("say hello" → "You say, 'hello'") |
| **Visual Style** | Warm paper, book-like | Terminal, high contrast |
| **Information Density** | Atmospheric, descriptive | Compact, structured |
| **Keyboard Navigation** | Reading-focused shortcuts | Extensive MUD shortcuts + optional Vim modes |
| **Animation Delays** | Optional typewriter effects | None, instant display |
| **Modal Editing** | Not applicable | Optional Vim-style modal commands |
| **Accessibility** | Reading-focused, immersive | Efficiency-focused, structured |

### Best of Both Worlds

**Unified Experience**: The same Facts system powers both modes, ensuring:
- **Consistent game state** across all interfaces
- **Fair play** - no advantage for either mode
- **Accessible design** - both modes support screen readers
- **Player choice** - switch based on mood, context, or preference

**Technical Implementation**: Mode switching is purely client-side:
```typescript
// Single Facts processing, multiple presentation modes
interface PresentationMode {
  renderFacts(facts: Fact[]): string;
  getInputStyle(): InputStyle;
  getTypography(): Typography;
}

const ebookMode: PresentationMode = {
  renderFacts: (facts) => enrichedNarrativeRenderer(facts),
  getInputStyle: () => ({ typewriter: true, enrichment: true }),
  getTypography: () => ({ font: 'Zilla Slab', size: '18px' })
};

const terminalMode: PresentationMode = {
  renderFacts: (facts) => traditionalMudRenderer(facts),
  getInputStyle: () => ({ typewriter: false, enrichment: false }),
  getTypography: () => ({ font: 'monospace', size: '14px' })
};
```

## Typography & Visual Design

### Font Hierarchy
- **Body text**: Zilla Slab Regular, 16-18pt
- **Player actions**: Zilla Slab Medium, 16-18pt, distinct color
- **System messages**: Zilla Slab Light, 14-16pt, muted
- **Emphasis**: Zilla Slab SemiBold for important information

### Color Scheme (Accessibility First)
```css
/* Default Theme: Warm Paper */
--bg-primary: #faf8f5;        /* Warm paper white */
--text-primary: #2d2d2d;      /* Rich charcoal */
--text-secondary: #666666;    /* Medium gray */
--accent: #8b4513;            /* Warm brown */
--player-action: #1a472a;     /* Deep forest green */

/* High Contrast Theme */
--bg-primary: #000000;        /* Pure black */
--text-primary: #ffffff;      /* Pure white */
--text-secondary: #cccccc;    /* Light gray */
--accent: #ffff00;            /* Bright yellow */
--player-action: #00ff00;     /* Bright green */

/* Dark Theme */
--bg-primary: #1a1a1a;        /* Deep gray */
--text-primary: #e8e8e8;      /* Warm white */
--text-secondary: #b0b0b0;    /* Medium gray */
--accent: #d4a574;            /* Warm gold */
--player-action: #7fb069;     /* Sage green */
```

## Accessibility Features

### Screen Reader Support
- **Semantic HTML structure** with proper headings and landmarks
- **Live regions** for dynamic content updates
- **Descriptive alt text** for all visual elements
- **Skip navigation** links for efficient browsing
- **Reading order optimization** for logical flow

### Visual Accessibility
- **WCAG AAA compliance** for color contrast ratios
- **Scalable UI** that works from 12pt to 32pt text
- **High contrast mode** toggle
- **Reduced motion** option for users with vestibular disorders
- **Focus indicators** that are clearly visible

### Audio Features
- **Natural speech synthesis** for text-to-speech
- **Audio cues** for different types of content:
  - Soft chime for new messages
  - Distinct sound for player actions
  - Ambient audio for atmospheric immersion
- **Reading speed control** (0.5x to 2x)
- **Voice selection** with different narrator voices

### Input Methods
- **Keyboard shortcuts** for all functions:
  - `Tab` / `Shift+Tab`: Navigate elements
  - `Ctrl+L`: Focus command line
  - `Ctrl+R`: Repeat last command
  - `Ctrl+H`: Access help
  - `Ctrl+S`: Toggle speech
  - `Ctrl+Plus/Minus`: Adjust font size
- **Voice commands** for hands-free play
- **Switch navigation** support for assistive devices

## Technical Implementation

### Tauri + React 19: The Perfect Foundation

**Standalone Desktop Application**: Our literary game client is built as a **Tauri application** combining React 19 frontend with Rust backend - delivering a native desktop experience with web technologies.

**Incredibly Lightweight**: Download size of approximately **10MB** - smaller than most mobile apps, yet more powerful than browser-based clients.

**Why Tauri + React 19?**
- **Native Performance**: Rust backend provides system-level capabilities
- **Modern UI**: React 19 with concurrent features for smooth animations
- **Cross-Platform**: Single codebase runs on Windows, macOS, and Linux
- **Secure by Default**: Tauri's security model prevents many web vulnerabilities
- **System Integration**: Deep OS integration that web clients simply cannot achieve

### Rust Backend Capabilities: What Other MMOs Can't Do

**System-Level Audio Processing**:
```rust
// Real-time audio processing for immersive soundscapes
use cpal::traits::StreamTrait;

pub fn create_spatial_audio_stream(facts: &[Fact]) -> Result<Stream, AudioError> {
    // Process atmospheric data into 3D positioned audio
    // Apply real-time filters based on environment
    // Mix multiple audio sources with hardware acceleration
}
```

**Advanced Accessibility Features**:
```rust
// Native screen reader integration
use windows::Win32::UI::Accessibility::*;

pub fn register_accessibility_hooks() {
    // Direct integration with Windows Narrator, macOS VoiceOver
    // Custom TTS voices with emotional inflection
    // Hardware-accelerated text rendering for high contrast modes
}
```

**Intelligent Caching & Offline Support**:
```rust
// SQLite-based local world state caching
use sqlx::sqlite::SqlitePool;

pub async fn cache_world_state(facts: &[Fact]) -> Result<(), CacheError> {
    // Intelligent caching of world state for offline review
    // Predictive pre-loading of likely content
    // Efficient diff-based updates to minimize bandwidth
}
```

**Hardware Integration**:
```rust
// Direct hardware access for immersive feedback
use gilrs::{Gilrs, GamepadId};

pub fn initialize_haptic_feedback() -> Result<HapticController, HardwareError> {
    // Game controller rumble for combat feedback
    // Custom haptic patterns for different events
    // Integration with specialized accessibility hardware
}
```

### Capabilities That Web Clients Simply Cannot Match

**🔊 Real-Time Audio Processing**
- **Spatial Audio**: 3D positioned sound based on world coordinates
- **Dynamic Mixing**: Real-time audio filters based on environment (echo in caves, muffled in water)
- **Custom Voice Synthesis**: Emotional inflection in TTS based on character mood
- **Hardware Acceleration**: Native audio APIs for zero-latency processing

**♿ Advanced Accessibility**
- **Native Screen Reader Integration**: Direct API access to Windows Narrator, macOS VoiceOver
- **System-Level Keyboard Hooks**: Global hotkeys that work even when app isn't focused
- **Hardware Device Support**: Direct integration with specialized accessibility hardware
- **High-Performance Text Rendering**: GPU-accelerated text scaling without quality loss

**💾 Intelligent Local Storage**
- **SQLite Integration**: Efficient local caching of world state and command history
- **Predictive Pre-loading**: Anticipate likely content based on player patterns
- **Offline Mode**: Review past sessions and prepare commands while disconnected
- **Encrypted Storage**: Secure local storage of sensitive game data

**🎮 System Integration**
- **Game Controller Support**: Native gamepad integration with custom haptic feedback
- **OS Notifications**: System-level notifications for important game events
- **File System Access**: Import/export of game logs, screenshots, and configurations
- **Power Management**: Smart battery optimization for laptop gaming

**⚡ Performance Advantages**
- **Native Multithreading**: Rust's fearless concurrency for smooth UI updates
- **Zero-Copy Parsing**: Efficient processing of large Facts batches
- **GPU Acceleration**: Hardware-accelerated text rendering and effects
- **Memory Safety**: Rust prevents crashes that plague other native clients

### Client-Side Enrichment Engine
```typescript
interface EnrichmentEngine {
  // Transform raw commands into literary prose
  enrichCommand(raw: string, context: GameContext): string;

  // Add atmospheric details based on world state
  addAtmosphere(location: Location, weather: Weather, time: Time): string;

  // Convert system messages to natural language
  humanizeSystem(message: SystemMessage): string;

  // Maintain narrative consistency
  maintainVoice(text: string, character: Character): string;
}
```

### Enhanced Typewriter Effect
- **Hardware-Accelerated Rendering**: Smooth animations even with large text blocks
- **Configurable Speed** (10-100 WPM) with per-character timing control
- **Intelligent Pausing**: Natural rhythm based on punctuation and sentence structure
- **Accessibility Integration**: Seamless screen reader synchronization
- **Audio Synchronization**: Coordinate with TTS for perfect timing

### Advanced State Management
- **Persistent Settings**: Encrypted local storage for accessibility preferences
- **Intelligent Command History**: SQLite-based history with full-text search
- **Session Restoration**: Resume interrupted games with complete context
- **Offline Mode**: Review past sessions and prepare commands while disconnected
- **Predictive Caching**: Pre-load likely content based on player patterns

## Advanced Features: Aliases, Triggers, and Plugin System

### Complete Alias and Trigger Support

**Hardcore MUD Enthusiast Features**: We provide full support for the power-user features that make clients like Mudlet so popular, implemented with modern type safety and performance.

**Aliases**: Transform simple keystrokes into complex commands
```typescript
// Simple text replacement
addAlias("gn", "go north");
addAlias("k", "kill");

// Variable substitution
addAlias("k %1", "kill $1");
addAlias("tell %1 %2", "tell $1 $2");

// Multi-line aliases with scripting
addAlias("heal", `
  if (health < 50) {
    cast('heal');
    drink('health potion');
  }
`);
```

**Triggers**: React to specific game events automatically
```typescript
// Text pattern triggers
addTrigger("^You are hungry", "eat bread");
addTrigger("^(.+) enters the room", "say Welcome, $1!");

// Fact-based triggers (leveraging our rich data)
addTrigger((fact) => {
  if (fact.kind === 'event' && fact.subject?.type === 'COMBAT_ATTACK') {
    if (fact.subject.target === myActor.id) {
      return "dodge"; // Auto-dodge when attacked
    }
  }
});

// Complex conditional triggers
addTrigger((facts) => {
  const combatFacts = facts.filter(f => f.kind === 'event' && f.subject?.type?.includes('COMBAT'));
  if (combatFacts.length > 0) {
    enableCombatMode();
    return "wield sword";
  }
});
```

**Advanced Trigger Features**:
- **Regex support**: Full regular expression pattern matching
- **Fact-based triggers**: React to structured game events, not just text
- **Conditional logic**: Complex if/then/else scenarios
- **Rate limiting**: Prevent spam with cooldown timers
- **Priority system**: Control trigger execution order
- **State management**: Maintain trigger-specific variables

### Type-Safe Client Plugin System

**Modern Plugin Architecture**: Unlike traditional MUD clients, our plugin system is built with TypeScript for complete type safety and IDE support.

```typescript
// Plugin interface with full type safety
interface FluxPlugin {
  name: string;
  version: string;
  author: string;

  // Lifecycle hooks
  onInitialize?(context: PluginContext): void;
  onFactsReceived?(facts: Fact[], context: PluginContext): void;
  onCommandSent?(command: string, context: PluginContext): string | void;
  onModeChanged?(mode: 'ebook' | 'terminal', context: PluginContext): void;

  // UI extensions
  renderUI?(container: HTMLElement): void;

  // Custom triggers and aliases
  triggers?: TriggerDefinition[];
  aliases?: AliasDefinition[];
}

// Plugin context with rich API access
interface PluginContext {
  // Game state access
  getWorldState(): WorldState;
  getPlayerState(): PlayerState;

  // Command execution
  sendCommand(command: string): void;

  // UI manipulation
  displayMessage(message: string, style?: MessageStyle): void;
  createNotification(text: string, type: 'info' | 'warning' | 'error'): void;

  // Storage
  getPluginData<T>(key: string): T | undefined;
  setPluginData<T>(key: string, value: T): void;

  // Event system
  on<T>(event: string, handler: (data: T) => void): void;
  emit<T>(event: string, data: T): void;
}
```

**Plugin Examples**:

```typescript
// Combat Assistant Plugin
const CombatAssistant: FluxPlugin = {
  name: "Combat Assistant",
  version: "1.0.0",
  author: "Community",

  onFactsReceived(facts, context) {
    const combatFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type?.includes('COMBAT')
    );

    if (combatFacts.length > 0) {
      this.analyzeCombat(combatFacts, context);
    }
  },

  analyzeCombat(facts, context) {
    // Auto-heal when health is low
    const healthFact = facts.find(f => f.subject?.health);
    if (healthFact?.subject?.health < 30) {
      context.sendCommand('cast heal');
    }
  }
};

// Map Plugin
const AutoMapper: FluxPlugin = {
  name: "Auto Mapper",
  version: "1.0.0",
  author: "Community",

  onFactsReceived(facts, context) {
    const movementFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type === 'ACTOR_DID_MOVE'
    );

    movementFacts.forEach(fact => {
      this.updateMap(fact.subject, context);
    });
  },

  renderUI(container) {
    // Render interactive map widget
    const mapDiv = document.createElement('div');
    mapDiv.className = 'minimap';
    container.appendChild(mapDiv);
  }
};
```

**Plugin Distribution**:
- **Built-in Plugin Manager**: Install/uninstall with simple UI
- **Community Repository**: Share plugins with other players
- **Version Management**: Automatic updates and dependency resolution
- **Security Sandboxing**: Plugins run in isolated contexts
- **Performance Monitoring**: Track plugin resource usage

### Optional Features and Customization

**Fully Configurable Experience**: Every enhancement is optional and can be tailored to player preferences.

#### Typewriter Text Effect
```typescript
interface TypewriterSettings {
  enabled: boolean;           // Default: true in e-book mode, false in terminal
  speed: number;              // 10-100 WPM, default: 60
  pauseOnPunctuation: boolean; // Default: true
  skipOnScroll: boolean;      // Default: true
  audioCues: boolean;         // Default: false
}
```

**Typewriter Customization**:
- **Speed Control**: From 10 WPM (dramatic) to 100 WPM (efficient)
- **Punctuation Pauses**: Natural rhythm or consistent speed
- **Skip Triggers**: Scroll, click, or keypress to skip animation
- **Audio Synchronization**: Coordinate with TTS for perfect timing
- **Accessibility Override**: Automatically disabled for screen readers

#### Input Enrichment via LLM
```typescript
interface EnrichmentSettings {
  enabled: boolean;           // Default: false (opt-in)
  model: 'gpt-4' | 'claude' | 'local'; // Default: 'local'
  creativityLevel: number;    // 0-100, default: 50
  preserveIntent: boolean;    // Default: true
  contextWindow: number;      // Lines of context, default: 10
}
```

**Input Enrichment Features**:
- **Completely Optional**: Disabled by default, explicit opt-in
- **Preserves Intent**: Never changes the meaning of commands
- **Context-Aware**: Uses recent conversation for better enrichment
- **Multiple Models**: Support for different AI providers or local models
- **Creativity Control**: Dial between efficiency and literary flair

**Example Enrichment**:
```typescript
// Without enrichment (default)
Input: "say hello"
Output: "You say, 'hello'"

// With enrichment (optional)
Input: "say hello"
Context: [Previous conversation about being tired after a long journey]
Output: "You manage a weary but genuine smile. 'Hello there,' you say,
         your voice carrying the fatigue of your recent travels."
```

### Configuration and Preferences

**Granular Control**: Every feature can be configured independently:

```typescript
interface ClientPreferences {
  // Mode settings
  defaultMode: 'ebook' | 'terminal';

  // Text presentation
  typewriter: TypewriterSettings;
  enrichment: EnrichmentSettings;

  // Accessibility
  accessibility: AccessibilitySettings;

  // Advanced features
  aliases: AliasDefinition[];
  triggers: TriggerDefinition[];
  plugins: PluginConfiguration[];

  // Combat log
  combatLog: CombatLogSettings;
}
```

**Profile System**: Save different configurations for different play styles:
- **Immersive Profile**: E-book mode, full typewriter, optional enrichment
- **Efficient Profile**: Terminal mode, minimal animations, extensive aliases
- **Power User Profile**: Terminal mode with Vim commands, advanced triggers, plugin extensions
- **Accessible Profile**: Optimized for screen readers and assistive technology
- **Combat Profile**: Triggers enabled, combat log visible, fast response

## Content Strategy

### Narrative Voice
- **Consistent third-person perspective** maintains immersion
- **Rich sensory details** engage multiple senses
- **Emotional resonance** in character interactions
- **Environmental storytelling** through atmospheric descriptions

### Information Architecture
- **Essential information** remains easily accessible
- **Progressive disclosure** prevents cognitive overload
- **Contextual help** provides assistance when needed
- **Graceful degradation** ensures core functionality works everywhere

## User Experience Flows

### First-Time Player
1. **Accessibility preferences** setup during onboarding
2. **Tutorial integration** with narrative context
3. **Gentle introduction** to enrichment features
4. **Customization guidance** for optimal experience

### Returning Player
1. **Seamless session restoration** with context reminder
2. **Preference synchronization** across devices
3. **Progressive enhancement** of new features
4. **Familiar interaction patterns** maintain muscle memory

## Success Metrics

### Accessibility Metrics
- **Screen reader compatibility** testing scores
- **Keyboard navigation** efficiency measurements
- **User preference adoption** rates
- **Accessibility feedback** satisfaction scores

### Engagement Metrics
- **Session duration** and depth of engagement
- **Text-to-action ratio** measuring narrative richness
- **Player retention** across different accessibility needs
- **Community feedback** on immersion quality

## Custom Client Development: An Open Ecosystem

### Universal Protocol Enables Player Innovation

One of the most powerful aspects of our Facts system is that it creates a **universal protocol** that enables players to build their own custom game clients. The architecture is designed to be completely open and extensible while maintaining security and narrative consistency.
