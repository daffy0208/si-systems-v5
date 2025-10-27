#!/usr/bin/env node
/**
 * Batch ChatGPT Conversation Extractor
 *
 * Processes multiple conversation files in parallel batches.
 *
 * Usage:
 *   npx ts-node batch-extract.ts <input-dir> <output-dir> [batch-size]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseConversation, generateMarkdown, generateCatalogEntry } from './conversation-parser';

// High-value files from analysis (Top 15 for optimal extraction)
const HIGH_VALUE_FILES = [
  'ChatGPT-AI Risks - Is CLISA & SI Systems Validated!.md',
  'ChatGPT-BrainFrameOS Development Kickoff.md',
  'ChatGPT-BrainFrameOS vs Digital Twin.md',
  'ChatGPT-BrainFrameOS_Collated Information.md',
  'ChatGPT-Base Settings & Installs.md',
  'ChatGPT-SI Systems - File Contents.md',
  'ChatGPT-Sapien_Intelligence Folder Structure.md',
  'ChatGPT-BrainFrameOS Residency Design.md',
  'ChatGPT-AI Risk Overview.md',
  'ChatGPT-Prime Law Structure.md',
  'ChatGPT-Documenting BrainFrame Process.md',
  'ChatGPT-Free Tools for Why and How.md',
  'ChatGPT-AI Ethics and Axioms.md',
  'ChatGPT-BrainFrame Diagnostic Review.md',
  'ChatGPT-SI_Identity_Infra_IDEM_Stack.md',
];

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
 * Extract a single conversation file
 */
function extractFile(
  inputPath: string,
  outputDir: string
): ExtractionResult {
  const fileName = path.basename(inputPath);

  try {
    console.log(`\n🔄 Processing: ${fileName}`);

    // Parse conversation
    const parsed = parseConversation(inputPath);

    // Generate output paths
    const baseName = path.basename(inputPath, '.md');
    const outputFile = path.join(outputDir, `${baseName}-extracted.md`);
    const catalogFile = path.join(outputDir, `${baseName}-catalog.json`);

    // Write markdown output
    const markdown = generateMarkdown(parsed);
    fs.writeFileSync(outputFile, markdown);

    // Write catalog entry
    const catalogEntry = generateCatalogEntry(inputPath, parsed);
    fs.writeFileSync(catalogFile, JSON.stringify(catalogEntry, null, 2));

    console.log(`✅ Success: ${parsed.totalExchanges} exchanges, ${parsed.conceptSummary.length} concepts`);

    return {
      file: fileName,
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
      file: fileName,
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
  batchSize: number = 5
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find ALL markdown files in input directory
  const filesToProcess = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));

  console.log(`\n📊 Batch Extraction Report`);
  console.log(`   Input Directory: ${inputDir}`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log(`   Markdown Files Found: ${filesToProcess.length}`);
  console.log(`   Batch Size: ${batchSize}`);

  if (filesToProcess.length === 0) {
    console.error('\n❌ No markdown files found in input directory!');
    console.error('   Make sure the input directory contains .md files.');
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
      const inputPath = path.join(inputDir, file);
      const result = extractFile(inputPath, outputDir);
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
    const avgExchanges = Math.round(totalExchanges / successful.length);

    console.log(`\n📊 Statistics:`);
    console.log(`   Total Exchanges: ${totalExchanges}`);
    console.log(`   Total Unique Concepts: ${totalConcepts}`);
    console.log(`   Average Exchanges/File: ${avgExchanges}`);
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
    console.error('Usage: npx ts-node batch-extract.ts <input-dir> <output-dir> [batch-size]');
    console.error('\nExample:');
    console.error('  npx ts-node batch-extract.ts "../Historical/Chats" "../extracted/conversations" 5');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputDir = args[1];
  const batchSize = args[2] ? parseInt(args[2], 10) : 5;

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
