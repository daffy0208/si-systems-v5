#!/usr/bin/env ts-node
/**
 * Extract documents from si-systems-v5 GitHub repository
 *
 * Usage:
 *   ts-node extract-from-github.ts --url <github-raw-url> --output <local-path>
 *   ts-node extract-from-github.ts --batch <config-file>
 */

interface ExtractionConfig {
  url: string
  outputPath: string
  layer: number
  title: string
  category: string
}

interface CatalogEntry {
  id: string
  title: string
  layer: number
  category: string
  sourcePath: string
  sourceUrl: string
  extractedAt: string
  wordCount: number
  concepts: string[]
}

async function fetchGitHubContent(url: string): Promise<string> {
  console.log(`Fetching: ${url}`)

  // Note: In production, use actual fetch. For now, this is a template.
  // The WebFetch tool will be used in Claude Code to actually fetch content

  throw new Error('Use WebFetch tool in Claude Code to fetch GitHub content')
}

function parseMarkdown(content: string): {
  title: string
  concepts: string[]
  wordCount: number
  cleaned: string
} {
  // Extract title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : 'Untitled'

  // Extract concepts (could be improved with NLP)
  const concepts: string[] = []
  const headingRegex = /^#{2,3}\s+(.+)$/gm
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    concepts.push(match[1].toLowerCase().trim())
  }

  // Count words
  const wordCount = content.split(/\s+/).length

  // Clean and format
  const cleaned = content.trim()

  return { title, concepts, wordCount, cleaned }
}

async function saveDocument(
  content: string,
  outputPath: string,
  metadata: Partial<CatalogEntry>
): Promise<void> {
  const parsed = parseMarkdown(content)

  // Add metadata header
  const documentWithMetadata = `---
title: ${parsed.title}
layer: ${metadata.layer}
category: ${metadata.category}
source: ${metadata.sourceUrl}
extracted: ${new Date().toISOString()}
word_count: ${parsed.wordCount}
concepts: ${parsed.concepts.join(', ')}
---

${parsed.cleaned}
`

  // Save to file (would use Write tool in Claude Code)
  console.log(`Would save to: ${outputPath}`)
  console.log(`Metadata:`, metadata)
}

async function buildCatalogEntry(config: ExtractionConfig): Promise<CatalogEntry> {
  const id = config.outputPath
    .replace(/^.*\//, '')
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')

  return {
    id,
    title: config.title,
    layer: config.layer,
    category: config.category,
    sourcePath: config.outputPath,
    sourceUrl: config.url,
    extractedAt: new Date().toISOString(),
    wordCount: 0, // Will be updated after extraction
    concepts: [], // Will be populated during extraction
  }
}

// Example batch configuration
const CLISA_EXTRACTION_BATCH: ExtractionConfig[] = [
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/00_Field_Definition.md',
    outputPath: 'extracted/0-clisa/00-field-definition.md',
    layer: 0,
    title: 'CLISA Field Definition',
    category: 'ontology'
  },
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/01_Activation_Conditions/Activation_Root.md',
    outputPath: 'extracted/0-clisa/01-activation-conditions.md',
    layer: 0,
    title: 'CLISA Activation Conditions',
    category: 'ontology'
  },
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/02_Field_Architecture/Dimensional_Reflection_Principle.md',
    outputPath: 'extracted/0-clisa/02-dimensional-reflection-principle.md',
    layer: 0,
    title: 'Dimensional Reflection Principle',
    category: 'architecture'
  },
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/02_Field_Architecture/Ontological_Framework.md',
    outputPath: 'extracted/0-clisa/03-ontological-framework.md',
    layer: 0,
    title: 'CLISA Ontological Framework',
    category: 'architecture'
  },
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/02_Field_Architecture/Signal_Properties.md',
    outputPath: 'extracted/0-clisa/04-signal-properties.md',
    layer: 0,
    title: 'Signal Properties',
    category: 'architecture'
  },
  {
    url: 'https://raw.githubusercontent.com/daffy0208/si-systems-v5/main/00%20-%20CLISA/02_Field_Architecture/Structural_Rules.md',
    outputPath: 'extracted/0-clisa/05-structural-rules.md',
    layer: 0,
    title: 'Structural Rules',
    category: 'architecture'
  },
]

// Export for use in Claude Code
export { CLISA_EXTRACTION_BATCH, ExtractionConfig, CatalogEntry }

console.log('Extraction script loaded. Use CLISA_EXTRACTION_BATCH for Phase 1 extraction.')
