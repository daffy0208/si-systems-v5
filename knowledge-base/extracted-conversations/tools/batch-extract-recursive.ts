#!/usr/bin/env node
/**
 * Recursive Batch ChatGPT Conversation Extractor
 *
 * Processes all markdown files recursively from a directory tree.
 *
 * Usage:
 *   npx ts-node batch-extract-recursive.ts <input-dir> <output-dir> [batch-size]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseConversation, generateMarkdown, generateCatalogEntry } from './conversation-parser';

interface ExtractionResult {
  file: string;
  success: boolean;
  error?: string;
  stats?: {
    exchanges: number;
    concepts: number;
    outputFile: string;
    catalogFile: string;
  };
}

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  let results: string[] = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories
        results = results.concat(findMarkdownFiles(filePath));
      } else if (file.endsWith('.md')) {
        results.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return results;
}

/**
 * Extract a single conversation file
 */
function extractFile(
  inputPath: string,
  outputDir: string,
  baseInputDir: string
): ExtractionResult {
  const fileName = path.basename(inputPath);

  try {
    console.log(`\n🔄 Processing: ${path.relative(baseInputDir, inputPath)}`);

    // Parse conversation
    const parsed = parseConversation(inputPath);

    // Generate output paths (preserve directory structure)
    const relativeDir = path.dirname(path.relative(baseInputDir, inputPath));
    const outputSubDir = path.join(outputDir, relativeDir);

    // Create output subdirectory if needed
    if (!fs.existsSync(outputSubDir)) {
      fs.mkdirSync(outputSubDir, { recursive: true });
    }

    const baseName = path.basename(inputPath, '.md');
    const outputFile = path.join(outputSubDir, `${baseName}-extracted.md`);
    const catalogFile = path.join(outputSubDir, `${baseName}-catalog.json`);

    // Write markdown output
    const markdown = generateMarkdown(parsed);
    fs.writeFileSync(outputFile, markdown);

    // Write catalog entry
    const catalogEntry = generateCatalogEntry(inputPath, parsed);
    fs.writeFileSync(catalogFile, JSON.stringify(catalogEntry, null, 2));

    console.log(`✅ Success: ${parsed.totalExchanges} exchanges, ${parsed.conceptSummary.length} concepts`);

    return {
      file: path.relative(baseInputDir, inputPath),
      success: true,
      stats: {
        exchanges: parsed.totalExchanges,
        concepts: parsed.conceptSummary.length,
        outputFile,
        catalogFile,
      },
    };
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error);
    return {
      file: path.relative(baseInputDir, inputPath),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process files in batches
 */
async function batchExtract(
  inputDir: string,
  outputDir: string,
  batchSize: number = 10
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all markdown files recursively
  console.log(`\n🔍 Searching for markdown files in: ${inputDir}`);
  const filesToProcess = findMarkdownFiles(inputDir);

  console.log(`\n📊 Batch Extraction Report`);
  console.log(`   Input Directory: ${inputDir}`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log(`   Markdown Files Found: ${filesToProcess.length}`);
  console.log(`   Batch Size: ${batchSize}`);

  if (filesToProcess.length === 0) {
    console.error('\n❌ No markdown files found in directory tree!');
    return results;
  }

  // Process in batches
  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(filesToProcess.length / batchSize);

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 BATCH ${batchNum}/${totalBatches} (${batch.length} files)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Process batch
    for (const file of batch) {
      const result = extractFile(file, outputDir, inputDir);
      results.push(result);
    }

    console.log(`\n✅ Batch ${batchNum} complete!`);
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummaryReport(results: ExtractionResult[]): void {
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 EXTRACTION SUMMARY REPORT`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Files: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    const totalExchanges = successful.reduce((sum, r) => sum + (r.stats?.exchanges || 0), 0);
    const totalConcepts = successful.reduce((sum, r) => sum + (r.stats?.concepts || 0), 0);
    const avgExchanges = totalExchanges > 0 ? Math.round(totalExchanges / successful.length) : 0;

    // Count chat vs structured docs
    const chatFiles = successful.filter(r => (r.stats?.exchanges || 0) > 0);
    const structuredDocs = successful.filter(r => (r.stats?.exchanges || 0) === 0);

    console.log(`\n📊 Statistics:`);
    console.log(`   Total Exchanges: ${totalExchanges}`);
    console.log(`   Total Unique Concepts: ${totalConcepts}`);
    console.log(`   Average Exchanges/File: ${avgExchanges}`);
    console.log(`\n📁 Classification:`);
    console.log(`   Chat Conversations: ${chatFiles.length}`);
    console.log(`   Structured Documents: ${structuredDocs.length}`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed Files:`);
    failed.forEach(r => {
      console.log(`   - ${r.file}: ${r.error}`);
    });
  }

  console.log(`\n🎉 Extraction complete!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

/**
 * Generate master catalog
 */
function generateMasterCatalog(
  outputDir: string,
  results: ExtractionResult[]
): void {
  const catalogFiles = results
    .filter(r => r.success && r.stats)
    .map(r => r.stats!.catalogFile);

  const masterCatalog = {
    extractionDate: new Date().toISOString(),
    totalFiles: results.length,
    successfulExtractions: results.filter(r => r.success).length,
    failedExtractions: results.filter(r => !r.success).length,
    conversations: catalogFiles.map(file => {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    }),
  };

  const masterPath = path.join(outputDir, 'master-catalog.json');
  fs.writeFileSync(masterPath, JSON.stringify(masterCatalog, null, 2));

  console.log(`📚 Master catalog created: ${masterPath}`);
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx ts-node batch-extract-recursive.ts <input-dir> <output-dir> [batch-size]');
    console.error('\nExample:');
    console.error('  npx ts-node batch-extract-recursive.ts "../md_output" "../extracted/md_output" 10');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputDir = args[1];
  const batchSize = args[2] ? parseInt(args[2], 10) : 10;

  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  // Run batch extraction
  (async () => {
    const startTime = Date.now();

    const results = await batchExtract(inputDir, outputDir, batchSize);

    generateSummaryReport(results);
    generateMasterCatalog(outputDir, results);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`⏱️  Total time: ${duration} minutes\n`);
  })();
}
