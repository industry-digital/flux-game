#!/usr/bin/env tsx
/**
 * Automated Date.now() Replacement Script
 *
 * This script identifies and replaces Date.now() usage patterns with the optimized
 * timestamp generator throughout the codebase.
 *
 * Usage: npx tsx scripts/replace-date-now.ts [--dry-run] [--pattern=<pattern>]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ReplacementRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  requiresImport: boolean;
  description: string;
  // Optional: only apply to files matching this pattern
  filePattern?: RegExp;
  // Optional: exclude files matching this pattern
  excludePattern?: RegExp;
}

interface ReplacementResult {
  file: string;
  rule: string;
  matches: number;
  preview: string[];
}

const REPLACEMENT_RULES: ReplacementRule[] = [
  // Pattern 1: Factory default dependencies - timestamp: () => Date.now()
  {
    name: 'factory-timestamp-deps',
    pattern: /timestamp:\s*\(\)\s*=>\s*Date\.now\(\)/g,
    replacement: 'timestamp',
    requiresImport: true,
    description: 'Factory default dependencies with timestamp: () => Date.now()',
    excludePattern: /\.(spec|test|benchmark)\.ts$/,
  },

  // Pattern 2: Function default parameters - now = Date.now()
  {
    name: 'function-default-param',
    pattern: /(\w+):\s*number\s*=\s*Date\.now\(\)/g,
    replacement: '$1: number = timestamp()',
    requiresImport: true,
    description: 'Function default parameters with Date.now()',
    excludePattern: /\.(spec|test|benchmark)\.ts$/,
  },

  // Pattern 3: Variable assignments - const now = Date.now()
  {
    name: 'variable-assignment',
    pattern: /const\s+(\w+)\s*=\s*Date\.now\(\)/g,
    replacement: 'const $1 = timestamp()',
    requiresImport: true,
    description: 'Variable assignments with Date.now()',
    excludePattern: /\.(spec|test|benchmark)\.ts$/,
  },

  // Pattern 4: Object property assignments - ts: Date.now()
  {
    name: 'object-property',
    pattern: /(\s+)ts:\s*Date\.now\(\)/g,
    replacement: '$1ts: timestamp()',
    requiresImport: true,
    description: 'Object property assignments with Date.now()',
    excludePattern: /\.(spec|test|benchmark)\.ts$/,
  },

  // Pattern 5: Direct calls in expressions (selective)
  {
    name: 'expression-call',
    pattern: /(?<!\/\/.*)(?<!\*\s)Date\.now\(\)(?!\s*[;,)])/g,
    replacement: 'timestamp()',
    requiresImport: true,
    description: 'Direct Date.now() calls in expressions',
    excludePattern: /\.(spec|test|benchmark)\.ts$/,
  },
];

const IMPORT_STATEMENT = "import { timestamp } from '~/lib/timestamp';";

class DateNowReplacer {
  private dryRun: boolean;
  private results: ReplacementResult[] = [];
  private targetPattern?: RegExp;

  constructor(options: { dryRun?: boolean; pattern?: string } = {}) {
    this.dryRun = options.dryRun ?? false;
    this.targetPattern = options.pattern ? new RegExp(options.pattern) : undefined;
  }

  private findTsFiles(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentDir: string) => {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry)) {
            traverse(fullPath);
          }
        } else if (extname(entry) === '.ts' && !entry.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  private hasTimestampImport(content: string): boolean {
    // Check for various import patterns
    const patterns = [
      /import\s*{[^}]*timestamp[^}]*}\s*from\s*['"]~\/lib\/timestamp['"]/,
      /import\s*{\s*timestamp\s*}\s*from\s*['"]~\/lib\/timestamp['"]/,
      /import\s*{[^}]*,\s*timestamp[^}]*}\s*from\s*['"]~\/lib\/timestamp['"]/,
      /import\s*{[^}]*timestamp\s*,\s*[^}]*}\s*from\s*['"]~\/lib\/timestamp['"]/,
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private addTimestampImport(content: string): string {
    if (this.hasTimestampImport(content)) {
      return content;
    }

    // Find the best place to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;
    let inMultiLineImport = false;

    // Look for existing imports from ~/lib/
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if we're entering or exiting a multi-line import
      if (line.startsWith('import') && line.includes('{') && !line.includes('}')) {
        inMultiLineImport = true;
      } else if (inMultiLineImport && line.includes('}')) {
        inMultiLineImport = false;
        insertIndex = i + 1;
        continue;
      } else if (inMultiLineImport) {
        // Skip lines inside multi-line imports
        continue;
      }

      if (line.startsWith('import') && line.includes('~/lib/')) {
        insertIndex = i + 1;
      } else if (line.startsWith('import')) {
        insertIndex = i + 1;
      } else if (trimmedLine === '' && insertIndex > 0) {
        // Found end of import block
        break;
      } else if (!line.startsWith('import') && !line.startsWith('//') && !line.startsWith('/*') && trimmedLine !== '') {
        // Found first non-import, non-comment line
        break;
      }
    }

    lines.splice(insertIndex, 0, IMPORT_STATEMENT);
    return lines.join('\n');
  }

  private applyRule(content: string, rule: ReplacementRule, filePath: string): { content: string; matches: number; preview: string[] } {
    const matches: string[] = [];
    let matchCount = 0;

    const newContent = content.replace(rule.pattern, (match, ...args) => {
      matches.push(`Line: ${match.trim()}`);
      matchCount++;

      // Handle replacement with capture groups
      let replacement = rule.replacement;
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          replacement = replacement.replace(new RegExp(`\\$${index + 1}`, 'g'), arg);
        }
      });

      return replacement;
    });

    return {
      content: newContent,
      matches: matchCount,
      preview: matches.slice(0, 3), // Show first 3 matches
    };
  }

  private shouldProcessFile(filePath: string, rule: ReplacementRule): boolean {
    if (this.targetPattern && !this.targetPattern.test(filePath)) {
      return false;
    }

    if (rule.filePattern && !rule.filePattern.test(filePath)) {
      return false;
    }

    if (rule.excludePattern && rule.excludePattern.test(filePath)) {
      return false;
    }

    return true;
  }

  public processFile(filePath: string): void {
    const originalContent = readFileSync(filePath, 'utf-8');
    let content = originalContent;
    let needsImport = false;
    let totalMatches = 0;

    for (const rule of REPLACEMENT_RULES) {
      if (!this.shouldProcessFile(filePath, rule)) {
        continue;
      }

      const result = this.applyRule(content, rule, filePath);

      if (result.matches > 0) {
        content = result.content;
        totalMatches += result.matches;

        if (rule.requiresImport) {
          needsImport = true;
        }

        this.results.push({
          file: filePath,
          rule: rule.name,
          matches: result.matches,
          preview: result.preview,
        });
      }
    }

    // Add import if needed and changes were made
    if (needsImport && totalMatches > 0) {
      content = this.addTimestampImport(content);
    }

    // Write file if changes were made and not in dry-run mode
    if (content !== originalContent && !this.dryRun) {
      writeFileSync(filePath, content, 'utf-8');
    }
  }

  public processDirectory(dir: string): void {
    console.log(`🔍 Scanning ${dir} for TypeScript files...`);
    const files = this.findTsFiles(dir);

    console.log(`📁 Found ${files.length} TypeScript files`);
    console.log(`${this.dryRun ? '🧪 DRY RUN MODE - No files will be modified' : '✏️  WRITE MODE - Files will be modified'}\n`);

    for (const file of files) {
      this.processFile(file);
    }
  }

  public printResults(): void {
    console.log('\n📊 REPLACEMENT RESULTS');
    console.log('='.repeat(80));

    if (this.results.length === 0) {
      console.log('No replacements found.');
      return;
    }

    // Group results by rule
    const resultsByRule = new Map<string, ReplacementResult[]>();
    for (const result of this.results) {
      if (!resultsByRule.has(result.rule)) {
        resultsByRule.set(result.rule, []);
      }
      resultsByRule.get(result.rule)!.push(result);
    }

    let totalReplacements = 0;
    const affectedFiles = new Set<string>();

    for (const [ruleName, results] of resultsByRule) {
      const rule = REPLACEMENT_RULES.find(r => r.name === ruleName)!;
      const ruleTotal = results.reduce((sum, r) => sum + r.matches, 0);
      totalReplacements += ruleTotal;

      console.log(`\n🔧 ${rule.description}`);
      console.log(`   Matches: ${ruleTotal} across ${results.length} files`);

      for (const result of results.slice(0, 5)) { // Show first 5 files
        affectedFiles.add(result.file);
        const relativePath = result.file.replace(process.cwd(), '.');
        console.log(`   📄 ${relativePath} (${result.matches} matches)`);

        for (const preview of result.preview) {
          console.log(`      ${preview}`);
        }
      }

      if (results.length > 5) {
        console.log(`   ... and ${results.length - 5} more files`);
      }
    }

    console.log('\n📈 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total replacements: ${totalReplacements}`);
    console.log(`Files affected: ${affectedFiles.size}`);
    console.log(`Rules applied: ${resultsByRule.size}`);

    if (this.dryRun) {
      console.log('\n💡 Run without --dry-run to apply these changes');
    } else {
      console.log('\n✅ All changes have been applied!');
      console.log('🧪 Run tests to verify everything still works:');
      console.log('   npm test');
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');
const patternArg = args.find(arg => arg.startsWith('--pattern='));
const pattern = patternArg ? patternArg.split('=')[1] : undefined;

const replacer = new DateNowReplacer({ dryRun, pattern });

// Process the src directory
const srcDir = join(process.cwd(), 'src');

if (testMode) {
  // Test mode: only process a few specific files
  const testFiles = [
    'src/intent/factory.ts',
    'src/lib/intent.ts',
    'src/worldkit/entity/actor/weapon.ts',
  ];

  console.log('🧪 TEST MODE - Processing only test files:');
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  for (const file of testFiles) {
    const fullPath = join(process.cwd(), file);
    try {
      replacer.processFile(fullPath);
    } catch (error) {
      console.log(`❌ Error processing ${file}: ${error.message}`);
    }
  }
} else {
  replacer.processDirectory(srcDir);
}

replacer.printResults();
