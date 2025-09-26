#!/usr/bin/env bash
set -euo pipefail

# Configuration
MONOREPO_ROOT="$(pwd)"
GAME_SOURCE="$HOME/var/flux/game"
SERVER_SOURCE="$HOME/var/flux/server"
FORCE_MODE=false

log() {
    echo "[$(date +'%H:%M:%S')] $1"
}

success() {
    echo "✓ $1"
}

error() {
    echo "✗ $1"
    exit 1
}

# Phase 1: Setup monorepo structure
setup_monorepo() {
    log "Phase 1: Setting up monorepo structure..."

    # Clean existing structure if force mode
    if [[ "$FORCE_MODE" == "true" ]]; then
        log "Force mode: removing existing packages directory..."
        rm -rf packages
        rm -f package.json package-lock.json
    fi

    # Create directory structure
    mkdir -p packages/{core,ui,docs,server,client}

    # Create root package.json
    cat > package.json << 'EOF'
{
  "name": "flux-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "dev:docs": "npm run dev --workspace=@flux/docs",
    "dev:client": "npm run tauri:dev --workspace=@flux/client",
    "clean": "npm run clean --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

    success "Monorepo structure created"
}

# Phase 2: Migrate core package
migrate_core() {
    log "Phase 2: Migrating core package..."

    cd "$MONOREPO_ROOT/packages/core"

    # Copy all source files
    cp -r "$GAME_SOURCE/src" .
    cp -r "$GAME_SOURCE/scripts" .
    cp "$GAME_SOURCE"/tsconfig*.json .
    cp "$GAME_SOURCE/vitest.config.ts" .

    # Create package.json (preserve build system exactly)
    cp "$GAME_SOURCE/package.json" .

    # Update package name and remove docs scripts
    node -e "
        const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
        pkg.name = '@flux/core';
        delete pkg.scripts['dev:doc'];
        delete pkg.scripts['docs:build'];
        delete pkg.scripts['docs:preview'];
        require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "

    # Install dependencies and test build
    npm install

    # Note: If you encounter TypeScript errors about inferred types not being portable
    # (referencing .pnpm paths), this is due to how typia generates validation functions
    # with npm's dependency resolution. This is a known limitation when using typia
    # with npm workspaces vs pnpm.
    npm run build
    npm run test

    success "Core package migrated and verified"
}

# Phase 3: Create UI package
create_ui_package() {
    log "Phase 3: Creating UI package..."

    cd "$MONOREPO_ROOT/packages/ui"

    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "@flux/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./style.css": "./dist/style.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch"
  },
  "peerDependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "vite": "^4.0.0",
    "vue": "^3.3.0",
    "typescript": "^5.0.0"
  }
}
EOF

    # Create source structure
    mkdir -p src/components

    # Copy shared components
    cp "$GAME_SOURCE/docs/guide/.vitepress/components/CommandSyntax.vue" src/components/
    cp "$GAME_SOURCE/docs/guide/.vitepress/components/BattlefieldNotation.vue" src/components/
    cp "$GAME_SOURCE/docs/guide/.vitepress/components/CombatantGlyph.vue" src/components/
    cp "$GAME_SOURCE/docs/guide/.vitepress/components/MonoText.vue" src/components/
    cp "$GAME_SOURCE/docs/guide/.vitepress/components/CleanList.vue" src/components/

    # Create index.ts
    cat > src/index.ts << 'EOF'
export { default as CommandSyntax } from './components/CommandSyntax.vue'
export { default as BattlefieldNotation } from './components/BattlefieldNotation.vue'
export { default as CombatantGlyph } from './components/CombatantGlyph.vue'
export { default as MonoText } from './components/MonoText.vue'
export { default as CleanList } from './components/CleanList.vue'
EOF

    # Create vite.config.ts
    cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FluxUI',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
EOF

    # Install and build
    npm install
    npm run build

    success "UI package created and built"
}

# Phase 4: Migrate docs
migrate_docs() {
    log "Phase 4: Migrating documentation..."

    cd "$MONOREPO_ROOT/packages/docs"

    # Copy docs
    cp -r "$GAME_SOURCE/docs"/* .

    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "@flux/docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vitepress dev .",
    "build": "vitepress build .",
    "preview": "vitepress preview ."
  },
  "dependencies": {
    "@flux/ui": "file:../ui",
    "@flux/core": "file:../core"
  },
  "devDependencies": {
    "vitepress": "^1.0.0",
    "vue": "^3.3.0"
  }
}
EOF

    # Update VitePress config to use shared components
    # (This would need manual adjustment based on your config)

    npm install

    success "Documentation migrated"
}

# Phase 5: Update server project (external)
update_server_external() {
    log "Phase 5: Updating external server project..."

    # The server remains external but we'll update its dependency
    # to use the published @flux/core package instead of the local file reference

    log "Server project remains at: $SERVER_SOURCE"
    log "After publishing @flux/core to npm, update server's package.json:"
    log "  Change: \"flux-game\": \"file:~/var/flux/game\""
    log "  To:     \"@flux/core\": \"^1.0.0\""

    success "Server project guidance provided"
}

# Phase 6: Create client package
create_client() {
    log "Phase 6: Creating client package..."

    cd "$MONOREPO_ROOT/packages"

    # Create Tauri app
    npm create tauri-app@latest client -- --template vue-ts

    cd client

    # Add workspace dependencies
    npm install ../core ../ui

    success "Client package created"
}

# Phase 7: Final verification
verify_monorepo() {
    log "Phase 7: Final verification..."

    cd "$MONOREPO_ROOT"

    # Install all dependencies
    npm install

    # Build everything
    npm run build

    # Run tests
    npm run test

    success "Monorepo migration completed successfully!"

    echo ""
    log "Next steps:"
    echo "  1. cd $MONOREPO_ROOT"
    echo "  2. npm run dev:docs    # Start documentation"
    echo "  3. npm run dev:client  # Start desktop client"
    echo ""
    log "Server project remains separate at: $SERVER_SOURCE"
    echo "After publishing @flux/core, update server to use the published package."
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_MODE=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--force] [--help]"
                echo ""
                echo "Options:"
                echo "  --force    Destructively overwrite existing monorepo contents"
                echo "  --help     Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

# Check for existing monorepo content
check_existing_content() {
    if [[ "$FORCE_MODE" != "true" ]] && [[ -d "packages" || -f "package.json" ]]; then
        error "Monorepo content already exists. Use --force to overwrite or run from an empty directory."
    fi
}

# Main execution
main() {
    log "Starting Flux monorepo migration..."

    # Parse command line arguments
    parse_args "$@"

    # Verify source directories exist
    [[ -d "$GAME_SOURCE" ]] || error "Game source directory not found: $GAME_SOURCE"
    [[ -d "$SERVER_SOURCE" ]] || error "Server source directory not found: $SERVER_SOURCE"

    # Check if we're in the right directory
    if [[ ! -f "migration.sh" ]]; then
        error "Please run this script from the monorepo directory (where migration.sh is located)"
    fi

    # Check for existing content
    check_existing_content

    # Execute migration phases
    setup_monorepo
    migrate_core
    create_ui_package
    migrate_docs
    update_server_external
    create_client
    verify_monorepo
}

# Run main function
main "$@"
