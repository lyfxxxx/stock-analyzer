/**
 * Dependency Direction Checker
 *
 * Enforces architectural dependency rules defined in docs/ARCHITECTURE.md.
 * Scans all .ts and .vue files in src/ and validates import directions.
 *
 * Forbidden dependencies:
 * - utils/ cannot import from stores/, api/, views/, components/
 * - db/ cannot import from stores/, api/, views/, components/
 * - api/ cannot import from stores/, views/, components/
 * - stores/ cannot import from other stores (no cross-store)
 * - views/ cannot import directly from api/ (must go through stores)
 *
 * Exit 0 if no violations, exit 1 with error messages if violations found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_DIR = join(process.cwd(), 'src')

// Forbidden dependency rules: [fromDir, cannotImportFromDirs[]]
const FORBIDDEN_RULES: { from: string; cannotImport: string[] }[] = [
  { from: 'utils', cannotImport: ['stores', 'api', 'views', 'components'] },
  { from: 'db', cannotImport: ['stores', 'api', 'views', 'components'] },
  { from: 'api', cannotImport: ['stores', 'views', 'components'] },
  { from: 'views', cannotImport: ['api'] },
]

// Extract import paths from file content
function extractImports(content: string): string[] {
  const importRegex = /(?:import\s+.*?from\s+['"]|import\s+['"])([^'"]+)['"]/g
  const imports: string[] = []
  let match

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

// Determine which src/ directory a file belongs to
function getFileDir(filePath: string): string | null {
  const relPath = relative(SRC_DIR, filePath)
  const parts = relPath.split(/[/\\]/)
  return parts.length > 1 ? parts[0] : null
}

// Resolve import path to a src/ directory
function resolveImportDir(importPath: string, sourceFileDir: string): string | null {
  // Skip external packages and type-only imports
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null
  }

  // Handle @/ alias
  let resolved = importPath
  if (resolved.startsWith('@/')) {
    resolved = resolved.slice(2)
  } else if (resolved.startsWith('./') || resolved.startsWith('../')) {
    // Resolve relative imports based on source file directory
    const parts = sourceFileDir.split('/')
    const importParts = resolved.split('/')

    for (const part of importParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }
    resolved = parts.join('/')
  }

  // Get the top-level directory under src/
  const firstPart = resolved.split(/[/\\]/)[0]
  const knownDirs = ['types', 'validation', 'utils', 'db', 'api', 'stores', 'composables', 'components', 'views', 'router']

  return knownDirs.includes(firstPart) ? firstPart : null
}

// Get all .ts and .vue files recursively
function getAllFiles(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip __tests__ directories
      if (entry === '__tests__' || entry === 'node_modules') continue
      files.push(...getAllFiles(fullPath))
    } else if (entry.endsWith('.ts') || entry.endsWith('.vue') || entry.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

// Check for cross-store imports
function checkCrossStore(sourceFile: string, importDir: string): string | null {
  if (getFileDir(sourceFile) !== 'stores') return null
  if (importDir !== 'stores') return null

  // Both source and import are in stores/ - this is a cross-store violation
  return `Cross-store import detected`
}

// Main validation
function checkDependencies(): string[] {
  const violations: string[] = []
  const files = getAllFiles(SRC_DIR)

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const imports = extractImports(content)
    const sourceDir = getFileDir(file)

    if (!sourceDir) continue

    for (const importPath of imports) {
      const importDir = resolveImportDir(importPath, sourceDir)
      if (!importDir) continue

      // Check cross-store
      const crossStoreViolation = checkCrossStore(file, importDir)
      if (crossStoreViolation) {
        const relFile = relative(process.cwd(), file)
        violations.push(`${relFile} -> ${importPath}: ${crossStoreViolation}`)
        continue
      }

      // Check forbidden rules
      for (const rule of FORBIDDEN_RULES) {
        if (sourceDir === rule.from && rule.cannotImport.includes(importDir)) {
          const relFile = relative(process.cwd(), file)
          violations.push(
            `${relFile} -> ${importPath}: ${rule.from}/ cannot import from ${importDir}/`
          )
        }
      }
    }
  }

  return violations
}

// Run
const violations = checkDependencies()

if (violations.length > 0) {
  console.error(`\n❌ Found ${violations.length} dependency violation(s):\n`)
  for (const v of violations) {
    console.error(`  ${v}`)
  }
  console.error(`\nFix these violations to maintain clean architecture.`)
  console.error(`See docs/ARCHITECTURE.md for dependency rules.\n`)
  process.exit(1)
} else {
  console.log('✅ All dependency directions are valid.')
  process.exit(0)
}
