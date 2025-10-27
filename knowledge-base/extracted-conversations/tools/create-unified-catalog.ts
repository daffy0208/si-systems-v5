#!/usr/bin/env node
/**
 * Unified Master Catalog Generator
 *
 * Combines conversation and documentation catalogs into a single unified knowledge base index.
 *
 * Usage:
 *   npx ts-node create-unified-catalog.ts <conversations-dir> <docs-dir> <output-file>
 */

import * as fs from 'fs';
import * as path from 'path';

interface UnifiedEntry {
  id: string;
  type: 'conversation' | 'documentation';
  sourceFile: string;
  relativePath: string;
  category: string;
  metadata: any;
  stats: {
    totalExchanges: number;
    totalSections?: number;
    totalTables?: number;
    totalLists?: number;
  };
  concepts: Array<{
    concept: string;
    count: number;
    locations?: number[];
  }>;
  extractedFile: string;
  catalogFile: string;
}

interface UnifiedCatalog {
  generatedDate: string;
  totalFiles: number;
  conversations: {
    count: number;
    totalExchanges: number;
    topConcepts: Array<{ concept: string; count: number }>;
  };
  documentation: {
    count: number;
    categories: Array<{ category: string; count: number }>;
  };
  entries: UnifiedEntry[];
  conceptIndex: {
    [concept: string]: {
      conversationMentions: number;
      documentationMentions: number;
      totalMentions: number;
      files: string[];
    };
  };
}

/**
 * Load catalog from directory
 */
function loadCatalog(catalogPath: string): any {
  const content = fs.readFileSync(catalogPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Categorize documentation file
 */
function categorizeDoc(relativePath: string): string {
  if (relativePath.includes('CLISA')) return 'CLISA';
  if (relativePath.includes('Philosophy')) return 'SI Systems - Philosophy';
  if (relativePath.includes('Purpose')) return 'SI Systems - Purpose';
  if (relativePath.includes('BrainFrameOS')) return 'BrainFrameOS';
  if (relativePath.includes('BrainFrame')) return 'BrainFrame';
  return 'Other';
}

/**
 * Process conversations directory
 */
function processConversations(conversationsDir: string): UnifiedEntry[] {
  const masterCatalogPath = path.join(conversationsDir, 'master-catalog.json');

  if (!fs.existsSync(masterCatalogPath)) {
    console.error(`Master catalog not found: ${masterCatalogPath}`);
    return [];
  }

  const catalog = loadCatalog(masterCatalogPath);
  const entries: UnifiedEntry[] = [];

  for (const conv of catalog.conversations) {
    entries.push({
      id: `conv_${entries.length}`,
      type: 'conversation',
      sourceFile: conv.sourceFile,
      relativePath: conv.sourceFile,
      category: 'Chat Conversation',
      metadata: conv.metadata,
      stats: conv.stats,
      concepts: conv.concepts || [],
      extractedFile: path.join(conversationsDir, `${path.basename(conv.sourceFile, '.md')}-extracted.md`),
      catalogFile: path.join(conversationsDir, `${path.basename(conv.sourceFile, '.md')}-catalog.json`),
    });
  }

  return entries;
}

/**
 * Process documentation directory recursively
 */
function processDocumentation(docsDir: string, baseDir: string = ''): UnifiedEntry[] {
  const masterCatalogPath = path.join(docsDir, 'master-catalog.json');

  if (!fs.existsSync(masterCatalogPath)) {
    console.error(`Master catalog not found: ${masterCatalogPath}`);
    return [];
  }

  const catalog = loadCatalog(masterCatalogPath);
  const entries: UnifiedEntry[] = [];

  for (const doc of catalog.conversations) { // Note: still called "conversations" in the catalog
    const relativePath = doc.sourceFile;

    entries.push({
      id: `doc_${entries.length}`,
      type: 'documentation',
      sourceFile: doc.sourceFile,
      relativePath: relativePath,
      category: categorizeDoc(relativePath),
      metadata: doc.metadata,
      stats: doc.stats,
      concepts: doc.concepts || [],
      extractedFile: path.join(docsDir, relativePath.replace(/\.md$/, '-extracted.md')),
      catalogFile: path.join(docsDir, relativePath.replace(/\.md$/, '-catalog.json')),
    });
  }

  return entries;
}

/**
 * Build concept index
 */
function buildConceptIndex(entries: UnifiedEntry[]): UnifiedCatalog['conceptIndex'] {
  const conceptIndex: UnifiedCatalog['conceptIndex'] = {};

  for (const entry of entries) {
    for (const conceptData of entry.concepts) {
      const concept = conceptData.concept;

      if (!conceptIndex[concept]) {
        conceptIndex[concept] = {
          conversationMentions: 0,
          documentationMentions: 0,
          totalMentions: 0,
          files: [],
        };
      }

      conceptIndex[concept].totalMentions += conceptData.count;
      conceptIndex[concept].files.push(entry.sourceFile);

      if (entry.type === 'conversation') {
        conceptIndex[concept].conversationMentions += conceptData.count;
      } else {
        conceptIndex[concept].documentationMentions += conceptData.count;
      }
    }
  }

  return conceptIndex;
}

/**
 * Generate unified catalog
 */
function generateUnifiedCatalog(
  conversationsDir: string,
  docsDir: string,
  outputFile: string
): void {
  console.log('\n📊 Unified Master Catalog Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Process conversations
  console.log('🔄 Processing conversations...');
  const conversationEntries = processConversations(conversationsDir);
  console.log(`✅ Loaded ${conversationEntries.length} conversations`);

  // Process documentation
  console.log('\n🔄 Processing documentation...');
  const docEntries = processDocumentation(docsDir);
  console.log(`✅ Loaded ${docEntries.length} documentation files`);

  // Combine entries
  const allEntries = [...conversationEntries, ...docEntries];

  // Calculate statistics
  const totalExchanges = conversationEntries.reduce(
    (sum, e) => sum + (e.stats.totalExchanges || 0),
    0
  );

  // Build concept index
  console.log('\n🔄 Building concept index...');
  const conceptIndex = buildConceptIndex(allEntries);
  console.log(`✅ Indexed ${Object.keys(conceptIndex).length} unique concepts`);

  // Get top concepts
  const topConcepts = Object.entries(conceptIndex)
    .map(([concept, data]) => ({ concept, count: data.totalMentions }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Categorize documentation
  const docCategories = new Map<string, number>();
  for (const entry of docEntries) {
    docCategories.set(
      entry.category,
      (docCategories.get(entry.category) || 0) + 1
    );
  }

  // Create unified catalog
  const unifiedCatalog: UnifiedCatalog = {
    generatedDate: new Date().toISOString(),
    totalFiles: allEntries.length,
    conversations: {
      count: conversationEntries.length,
      totalExchanges,
      topConcepts: topConcepts.slice(0, 10),
    },
    documentation: {
      count: docEntries.length,
      categories: Array.from(docCategories.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    },
    entries: allEntries,
    conceptIndex,
  };

  // Write output
  console.log('\n🔄 Writing unified catalog...');
  fs.writeFileSync(outputFile, JSON.stringify(unifiedCatalog, null, 2));
  console.log(`✅ Unified catalog saved: ${outputFile}`);

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 UNIFIED CATALOG SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Files: ${allEntries.length}`);
  console.log(`  - Conversations: ${conversationEntries.length}`);
  console.log(`  - Documentation: ${docEntries.length}`);
  console.log(`\nTotal Exchanges: ${totalExchanges}`);
  console.log(`Unique Concepts: ${Object.keys(conceptIndex).length}`);
  console.log(`\nTop 10 Concepts:`);
  topConcepts.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.concept}: ${c.count} mentions`);
  });
  console.log(`\nDocumentation Categories:`);
  Array.from(docCategories.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count} files`);
    });
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ==================== CLI ====================

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: npx ts-node create-unified-catalog.ts <conversations-dir> <docs-dir> <output-file>');
    console.error('\nExample:');
    console.error('  npx ts-node create-unified-catalog.ts "../extracted/conversations" "../extracted/md_output_all" "../extracted/unified-catalog.json"');
    process.exit(1);
  }

  const [conversationsDir, docsDir, outputFile] = args;

  if (!fs.existsSync(conversationsDir)) {
    console.error(`Error: Conversations directory not found: ${conversationsDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(docsDir)) {
    console.error(`Error: Documentation directory not found: ${docsDir}`);
    process.exit(1);
  }

  generateUnifiedCatalog(conversationsDir, docsDir, outputFile);
}
