#!/usr/bin/env node
/**
 * Archon RAG Knowledge Base Upload Tool
 *
 * Uploads the complete SI Systems knowledge base (718 files) to Archon MCP RAG server.
 *
 * Usage:
 *   npx ts-node upload-to-archon-rag.ts <unified-catalog> [batch-size]
 */

import * as fs from 'fs';
import * as path from 'path';

interface ArchonDocument {
  id: string;
  type: 'conversation' | 'documentation';
  title: string;
  content: string;
  metadata: {
    source: string;
    category?: string;
    subcategory?: string;
    exchanges?: number;
    concepts?: string[];
    created?: string;
    updated?: string;
    size: number;
    depth?: number;
  };
  tags: string[];
  embedding_ready: boolean;
}

interface ArchonUploadBatch {
  batch_id: string;
  source: 'SI Systems Knowledge Base';
  version: '1.0';
  upload_date: string;
  documents: ArchonDocument[];
}

/**
 * Load unified catalog
 */
function loadUnifiedCatalog(catalogPath: string): any {
  console.log(`📂 Loading unified catalog: ${catalogPath}`);
  const content = fs.readFileSync(catalogPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load extracted file content
 */
function loadExtractedContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Convert catalog entry to Archon document format
 */
function convertToArchonDocument(entry: any, extractedContent: string): ArchonDocument {
  // Extract title from metadata or filename
  const title = entry.metadata?.title || path.basename(entry.sourceFile, '.md');

  // Build tags from concepts and category
  const tags: string[] = [];
  if (entry.category) tags.push(entry.category);
  if (entry.subcategory) tags.push(entry.subcategory);

  // Add top concepts as tags
  const topConcepts = entry.concepts
    ?.sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)
    .map((c: any) => c.concept);

  if (topConcepts) {
    tags.push(...topConcepts);
  }

  // Build metadata
  const metadata: ArchonDocument['metadata'] = {
    source: entry.sourceFile,
    size: extractedContent.length,
  };

  if (entry.category) metadata.category = entry.category;
  if (entry.subcategory) metadata.subcategory = entry.subcategory;
  if (entry.stats?.totalExchanges) metadata.exchanges = entry.stats.totalExchanges;
  if (topConcepts) metadata.concepts = topConcepts;
  if (entry.metadata?.created) metadata.created = entry.metadata.created;
  if (entry.metadata?.updated) metadata.updated = entry.metadata.updated;
  if (entry.depth) metadata.depth = entry.depth;

  return {
    id: entry.id,
    type: entry.type,
    title,
    content: extractedContent,
    metadata,
    tags: Array.from(new Set(tags)), // Remove duplicates
    embedding_ready: true,
  };
}

/**
 * Create upload batches
 */
function createUploadBatches(
  catalog: any,
  batchSize: number
): ArchonUploadBatch[] {
  console.log(`\n📦 Creating upload batches (size: ${batchSize})...`);

  const batches: ArchonUploadBatch[] = [];
  const entries = catalog.entries || [];

  for (let i = 0; i < entries.length; i += batchSize) {
    const batchEntries = entries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    console.log(`  Creating batch ${batchNum}/${Math.ceil(entries.length / batchSize)} (${batchEntries.length} documents)...`);

    const documents: ArchonDocument[] = [];

    for (const entry of batchEntries) {
      // Load extracted content
      const extractedContent = loadExtractedContent(entry.extractedFile);

      if (extractedContent) {
        const archonDoc = convertToArchonDocument(entry, extractedContent);
        documents.push(archonDoc);
      }
    }

    batches.push({
      batch_id: `batch_${batchNum}`,
      source: 'SI Systems Knowledge Base',
      version: '1.0',
      upload_date: new Date().toISOString(),
      documents,
    });
  }

  console.log(`✅ Created ${batches.length} upload batches\n`);
  return batches;
}

/**
 * Generate upload summary
 */
function generateUploadSummary(batches: ArchonUploadBatch[], outputDir: string): void {
  const summary = {
    generatedDate: new Date().toISOString(),
    totalBatches: batches.length,
    totalDocuments: batches.reduce((sum, b) => sum + b.documents.length, 0),
    documentsByType: {
      conversations: batches.reduce(
        (sum, b) => sum + b.documents.filter(d => d.type === 'conversation').length,
        0
      ),
      documentation: batches.reduce(
        (sum, b) => sum + b.documents.filter(d => d.type === 'documentation').length,
        0
      ),
    },
    totalSize: batches.reduce(
      (sum, b) => sum + b.documents.reduce((s, d) => s + d.metadata.size, 0),
      0
    ),
    batches: batches.map(b => ({
      batch_id: b.batch_id,
      documentCount: b.documents.length,
      size: b.documents.reduce((sum, d) => sum + d.metadata.size, 0),
    })),
  };

  const summaryPath = path.join(outputDir, 'upload-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 UPLOAD SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Batches: ${summary.totalBatches}`);
  console.log(`Total Documents: ${summary.totalDocuments}`);
  console.log(`  - Conversations: ${summary.documentsByType.conversations}`);
  console.log(`  - Documentation: ${summary.documentsByType.documentation}`);
  console.log(`Total Size: ${(summary.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nSummary saved: ${summaryPath}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Save batches to disk
 */
function saveBatches(batches: ArchonUploadBatch[], outputDir: string): void {
  console.log(`💾 Saving batches to: ${outputDir}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const batch of batches) {
    const batchPath = path.join(outputDir, `${batch.batch_id}.json`);
    fs.writeFileSync(batchPath, JSON.stringify(batch, null, 2));
    console.log(`  ✅ Saved: ${batch.batch_id}.json`);
  }

  console.log(`\n✅ All batches saved to: ${outputDir}\n`);
}

/**
 * Generate Archon MCP upload instructions
 */
function generateUploadInstructions(outputDir: string): void {
  const instructions = `# Archon RAG Upload Instructions

## Automated Upload (Recommended)

Use Archon MCP tools to upload all batches:

\`\`\`bash
# Using Archon MCP server
mcp__archon__rag_upload_batch("./archon-upload/batch_1.json")
mcp__archon__rag_upload_batch("./archon-upload/batch_2.json")
# ... repeat for all batches
\`\`\`

## Batch Upload Script

Or use this script to upload all batches:

\`\`\`typescript
import { mcp__archon__rag_upload_batch } from '@archon/mcp';

async function uploadAllBatches() {
  const batchFiles = fs.readdirSync('./archon-upload')
    .filter(f => f.startsWith('batch_') && f.endsWith('.json'));

  for (const batchFile of batchFiles) {
    console.log(\`Uploading \${batchFile}...\`);
    const batch = JSON.parse(fs.readFileSync(\`./archon-upload/\${batchFile}\`, 'utf-8'));
    await mcp__archon__rag_upload_batch(batch);
    console.log(\`✅ \${batchFile} uploaded\`);
  }
}

uploadAllBatches();
\`\`\`

## Manual Upload via Archon MCP

1. Open Archon MCP interface
2. Navigate to RAG Knowledge Base section
3. Select "Upload Batch"
4. Upload each batch file from \`./archon-upload/\`

## Verify Upload

After upload, verify with test queries:

\`\`\`typescript
// Test conversation retrieval
mcp__archon__rag_search_knowledge_base({
  query: "What is BrainFrameOS?",
  match_count: 5
});

// Test documentation retrieval
mcp__archon__rag_search_knowledge_base({
  query: "CLISA AI risk framework",
  match_count: 3
});

// Test concept search
mcp__archon__rag_search_knowledge_base({
  query: "Sapien Intelligence architecture",
  match_count: 5
});
\`\`\`

## Configuration

Recommended RAG settings:
- Embedding Model: text-embedding-3-small or text-embedding-3-large
- Chunk Size: 1000 tokens (already chunked by conversation parser)
- Similarity Threshold: 0.7
- Max Results: 10

## Next Steps

1. Upload all batches
2. Wait for embedding generation (may take 10-30 minutes for 718 files)
3. Verify retrieval with test queries
4. Enable semantic search in your application
`;

  const instructionsPath = path.join(outputDir, 'UPLOAD-INSTRUCTIONS.md');
  fs.writeFileSync(instructionsPath, instructions);
  console.log(`📖 Upload instructions: ${instructionsPath}\n`);
}

/**
 * Main preparation function
 */
function prepareArchonUpload(
  catalogPath: string,
  outputDir: string,
  batchSize: number = 50
): void {
  console.log('\n🚀 Archon RAG Upload Preparation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load catalog
  const catalog = loadUnifiedCatalog(catalogPath);
  console.log(`✅ Loaded ${catalog.totalFiles} files from catalog\n`);

  // Create batches
  const batches = createUploadBatches(catalog, batchSize);

  // Save batches
  saveBatches(batches, outputDir);

  // Generate summary
  generateUploadSummary(batches, outputDir);

  // Generate instructions
  generateUploadInstructions(outputDir);

  console.log('✅ Archon RAG upload preparation complete!');
  console.log(`\n📁 Output directory: ${outputDir}`);
  console.log('📖 Read UPLOAD-INSTRUCTIONS.md for next steps\n');
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx ts-node upload-to-archon-rag.ts <unified-catalog> [batch-size]');
    console.error('\nExample:');
    console.error('  npx ts-node upload-to-archon-rag.ts "../extracted/unified-catalog.json" 50');
    process.exit(1);
  }

  const catalogPath = args[0];
  const batchSize = args[1] ? parseInt(args[1], 10) : 50;
  const outputDir = path.join(path.dirname(catalogPath), 'archon-upload');

  if (!fs.existsSync(catalogPath)) {
    console.error(`Error: Unified catalog not found: ${catalogPath}`);
    process.exit(1);
  }

  prepareArchonUpload(catalogPath, outputDir, batchSize);
}
