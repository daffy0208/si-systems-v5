#!/usr/bin/env node
/**
 * Structured Documentation Analyzer
 *
 * Analyzes the 496 structured documentation files to create a taxonomy and prepare for specialized processing.
 *
 * Usage:
 *   npx ts-node analyze-structured-docs.ts <docs-dir> <output-file>
 */

import * as fs from 'fs';
import * as path from 'path';

interface DocumentAnalysis {
  sourceFile: string;
  relativePath: string;
  category: string;
  subcategory: string;
  depth: number;
  size: number;
  lines: number;
  sections: number;
  hasCode: boolean;
  hasTable: boolean;
  hasList: boolean;
  keywords: string[];
}

interface Taxonomy {
  generatedDate: string;
  totalDocuments: number;
  categories: {
    [category: string]: {
      count: number;
      subcategories: {
        [subcategory: string]: {
          count: number;
          files: string[];
        };
      };
      avgSize: number;
      avgDepth: number;
    };
  };
  documents: DocumentAnalysis[];
  recommendations: {
    category: string;
    processingMethod: string;
    priority: string;
    reason: string;
  }[];
}

/**
 * Determine category from path
 */
function categorizeDocument(relativePath: string): { category: string; subcategory: string } {
  if (relativePath.includes('CLISA')) {
    return { category: 'CLISA', subcategory: 'AI Risk Framework' };
  }

  if (relativePath.includes('Philosophy')) {
    return { category: 'SI Systems', subcategory: 'Philosophy' };
  }

  if (relativePath.includes('Purpose')) {
    return { category: 'SI Systems', subcategory: 'Purpose' };
  }

  if (relativePath.includes('System Structure')) {
    return { category: 'BrainFrameOS', subcategory: 'System Structure' };
  }

  if (relativePath.includes('Core Components')) {
    return { category: 'BrainFrameOS', subcategory: 'Core Components' };
  }

  if (relativePath.includes('Philosophy')) {
    return { category: 'BrainFrameOS', subcategory: 'Philosophy' };
  }

  if (relativePath.includes('Advanced Capabilities')) {
    return { category: 'BrainFrameOS', subcategory: 'Advanced Capabilities' };
  }

  if (relativePath.includes('Applications')) {
    return { category: 'BrainFrameOS', subcategory: 'Applications' };
  }

  if (relativePath.includes('Management Tools')) {
    return { category: 'BrainFrameOS', subcategory: 'Management Tools' };
  }

  if (relativePath.includes('Documentation')) {
    return { category: 'BrainFrameOS', subcategory: 'User Documentation' };
  }

  if (relativePath.includes('Sandbox')) {
    return { category: 'BrainFrameOS', subcategory: 'Sandbox' };
  }

  if (relativePath.includes('BrainFrame')) {
    return { category: 'BrainFrameOS', subcategory: 'General' };
  }

  return { category: 'Other', subcategory: 'Miscellaneous' };
}

/**
 * Analyze a single document
 */
function analyzeDocument(filePath: string, relativePath: string): DocumentAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const { category, subcategory } = categorizeDocument(relativePath);
  const depth = relativePath.split('/').length - 1;

  // Detect content features
  const hasCode = /```/.test(content);
  const hasTable = /\|.*\|/.test(content);
  const hasList = /^[\*\-\+]\s/m.test(content);
  const sections = (content.match(/^#{1,6}\s/gm) || []).length;

  // Extract keywords (simple approach - top words)
  const words = content
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);

  const wordCounts = new Map<string, number>();
  words.forEach(w => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));

  const keywords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return {
    sourceFile: path.basename(filePath),
    relativePath,
    category,
    subcategory,
    depth,
    size: content.length,
    lines: lines.length,
    sections,
    hasCode,
    hasTable,
    hasList,
    keywords,
  };
}

/**
 * Build taxonomy from analyses
 */
function buildTaxonomy(analyses: DocumentAnalysis[]): Taxonomy {
  const categories: Taxonomy['categories'] = {};

  for (const analysis of analyses) {
    const { category, subcategory } = analysis;

    if (!categories[category]) {
      categories[category] = {
        count: 0,
        subcategories: {},
        avgSize: 0,
        avgDepth: 0,
      };
    }

    if (!categories[category].subcategories[subcategory]) {
      categories[category].subcategories[subcategory] = {
        count: 0,
        files: [],
      };
    }

    categories[category].count++;
    categories[category].subcategories[subcategory].count++;
    categories[category].subcategories[subcategory].files.push(analysis.relativePath);
  }

  // Calculate averages
  for (const [catName, catData] of Object.entries(categories)) {
    const catDocs = analyses.filter(a => a.category === catName);
    catData.avgSize = Math.round(
      catDocs.reduce((sum, a) => sum + a.size, 0) / catDocs.length
    );
    catData.avgDepth = Math.round(
      catDocs.reduce((sum, a) => sum + a.depth, 0) / catDocs.length
    );
  }

  // Generate recommendations
  const recommendations: Taxonomy['recommendations'] = [
    {
      category: 'CLISA',
      processingMethod: 'Semantic Indexing',
      priority: 'High',
      reason: 'AI risk framework - critical for compliance and validation queries',
    },
    {
      category: 'SI Systems - Philosophy',
      processingMethod: 'Concept Extraction',
      priority: 'High',
      reason: 'Core principles - foundational concepts for system understanding',
    },
    {
      category: 'BrainFrameOS - System Structure',
      processingMethod: 'Hierarchical Indexing',
      priority: 'High',
      reason: 'System architecture - critical for technical understanding',
    },
    {
      category: 'BrainFrameOS - Core Components',
      processingMethod: 'Component Mapping',
      priority: 'High',
      reason: 'Large volume (likely ~400 files) - needs efficient component-based indexing',
    },
    {
      category: 'BrainFrameOS - User Documentation',
      processingMethod: 'Task-Based Indexing',
      priority: 'Medium',
      reason: 'User guides - optimize for "how to" queries',
    },
    {
      category: 'BrainFrameOS - Management Tools',
      processingMethod: 'Tool Documentation',
      priority: 'Medium',
      reason: 'Operational tools - index for workflow queries',
    },
  ];

  return {
    generatedDate: new Date().toISOString(),
    totalDocuments: analyses.length,
    categories,
    documents: analyses,
    recommendations,
  };
}

/**
 * Main analysis function
 */
function analyzeStructuredDocuments(docsDir: string, outputFile: string): void {
  console.log('\n📊 Structured Documentation Analyzer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load master catalog to get file list
  const masterCatalogPath = path.join(docsDir, 'master-catalog.json');
  if (!fs.existsSync(masterCatalogPath)) {
    console.error(`Master catalog not found: ${masterCatalogPath}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(masterCatalogPath, 'utf-8'));

  console.log(`🔄 Analyzing ${catalog.conversations.length} documents...\n`);

  const analyses: DocumentAnalysis[] = [];

  for (const doc of catalog.conversations) {
    const relativePath = doc.sourceFile;
    const fullPath = path.join(docsDir, relativePath);

    if (fs.existsSync(fullPath)) {
      const analysis = analyzeDocument(fullPath, relativePath);
      analyses.push(analysis);

      if (analyses.length % 50 === 0) {
        console.log(`  Analyzed ${analyses.length}/${catalog.conversations.length} files...`);
      }
    }
  }

  console.log(`✅ Analysis complete: ${analyses.length} documents\n`);

  // Build taxonomy
  console.log('🔄 Building taxonomy...');
  const taxonomy = buildTaxonomy(analyses);
  console.log(`✅ Taxonomy generated\n`);

  // Write output
  console.log('🔄 Writing taxonomy report...');
  fs.writeFileSync(outputFile, JSON.stringify(taxonomy, null, 2));
  console.log(`✅ Taxonomy saved: ${outputFile}\n`);

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TAXONOMY SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Documents: ${taxonomy.totalDocuments}\n`);
  console.log('Categories:');

  const sortedCats = Object.entries(taxonomy.categories).sort((a, b) => b[1].count - a[1].count);

  for (const [catName, catData] of sortedCats) {
    console.log(`\n  ${catName} (${catData.count} files)`);
    console.log(`    Avg Size: ${catData.avgSize} bytes`);
    console.log(`    Avg Depth: ${catData.avgDepth} levels`);
    console.log(`    Subcategories:`);

    const sortedSubcats = Object.entries(catData.subcategories).sort((a, b) => b[1].count - a[1].count);
    for (const [subName, subData] of sortedSubcats) {
      console.log(`      - ${subName}: ${subData.count} files`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 PROCESSING RECOMMENDATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const rec of taxonomy.recommendations) {
    console.log(`${rec.category}:`);
    console.log(`  Method: ${rec.processingMethod}`);
    console.log(`  Priority: ${rec.priority}`);
    console.log(`  Reason: ${rec.reason}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx ts-node analyze-structured-docs.ts <docs-dir> <output-file>');
    console.error('\nExample:');
    console.error('  npx ts-node analyze-structured-docs.ts "../extracted/md_output_all" "../analysis/structured-docs-taxonomy.json"');
    process.exit(1);
  }

  const [docsDir, outputFile] = args;

  if (!fs.existsSync(docsDir)) {
    console.error(`Error: Documentation directory not found: ${docsDir}`);
    process.exit(1);
  }

  analyzeStructuredDocuments(docsDir, outputFile);
}
