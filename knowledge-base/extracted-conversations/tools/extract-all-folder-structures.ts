#!/usr/bin/env node
/**
 * Extract All Folder Structures from Conversations
 *
 * Systematically extracts every folder tree structure from all conversations,
 * preserves variations, and builds a comparison matrix for validation.
 *
 * Usage:
 *   npx ts-node extract-all-folder-structures.ts <conversations-dir> <output-file>
 */

import * as fs from 'fs';
import * as path from 'path';

interface FolderStructure {
  conversationFile: string;
  conversationTitle: string;
  rootFolder: string;
  version?: string;
  tiers: Map<string, TierInfo>;
  rawTreeLines: string[];
  metadata: {
    totalLines: number;
    deepestLevel: number;
    fileCount: number;
    folderCount: number;
  };
}

interface TierInfo {
  tierNumber: string;
  tierName: string;
  subfolders: string[];
  files: string[];
  depth: number;
  comments?: string; // e.g., "# Mirror Pyramid: Above"
}

interface ComparisonMatrix {
  allTiers: Set<string>;
  tierOccurrences: Map<string, string[]>; // tier -> conversation files
  tierVariations: Map<string, Set<string>>; // tier number -> different names
  conflictingFiles: Map<string, Set<string>>; // file path -> different conversations with different versions
  structures: FolderStructure[];
}

/**
 * Extract folder tree lines from conversation file
 */
function extractTreeLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const treeLines: string[] = [];
  let inTree = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect tree start patterns
    if (
      /Sapien_Intelligence.*v\d+\.\d+/.test(line) ||
      /\d{2}_Sapien_Field_Definition/.test(line) ||
      /00_Sapien_Field_Definition/.test(line) ||
      /0_Origin_Field/.test(line) ||
      line.trim().match(/^├──|^│|^└──/)
    ) {
      inTree = true;
    }

    // Detect tree end patterns
    if (inTree && (
      line.trim() === '' ||
      line.startsWith('---') ||
      line.startsWith('**Sections') ||
      line.startsWith('**Concepts') ||
      line.startsWith('###')
    )) {
      // Don't exit tree immediately on empty lines - could be indentation
      if (treeLines.length > 0 && line.trim() === '') {
        continue;
      }
      if (line.startsWith('---') || line.startsWith('**') || line.startsWith('###')) {
        inTree = false;
      }
    }

    if (inTree && line.trim().length > 0) {
      treeLines.push(line);
    }
  }

  return treeLines;
}

/**
 * Parse tree lines into structured format
 */
function parseTreeStructure(conversationFile: string, treeLines: string[]): FolderStructure | null {
  if (treeLines.length === 0) {
    return null;
  }

  const structure: FolderStructure = {
    conversationFile,
    conversationTitle: path.basename(conversationFile, '-extracted.md'),
    rootFolder: '',
    tiers: new Map(),
    rawTreeLines: treeLines,
    metadata: {
      totalLines: treeLines.length,
      deepestLevel: 0,
      fileCount: 0,
      folderCount: 0,
    },
  };

  // Extract root folder and version
  const rootMatch = treeLines[0].match(/(Sapien_Intelligence[^/]*)/);
  if (rootMatch) {
    structure.rootFolder = rootMatch[1];
    const versionMatch = structure.rootFolder.match(/v(\d+\.\d+\.\d+|\d+\.\d+)/);
    if (versionMatch) {
      structure.version = versionMatch[1];
    }
  }

  let currentTier: TierInfo | null = null;
  let currentPath: string[] = [];

  for (const line of treeLines) {
    // Calculate depth based on tree characters
    const depth = (line.match(/│/g) || []).length + (line.match(/├──|└──/g) || []).length;
    structure.metadata.deepestLevel = Math.max(structure.metadata.deepestLevel, depth);

    // Extract tier folder (e.g., "00_Sapien_Field_Definition/")
    const tierMatch = line.match(/(\d{1,2}_[A-Za-z_]+)\/?\s*(#.*)?$/);
    if (tierMatch) {
      const tierFull = tierMatch[1];
      const comment = tierMatch[2];
      const tierNum = tierFull.match(/^(\d{1,2})_/)?.[1] || '';

      if (!structure.tiers.has(tierNum)) {
        currentTier = {
          tierNumber: tierNum,
          tierName: tierFull,
          subfolders: [],
          files: [],
          depth,
          comments: comment,
        };
        structure.tiers.set(tierNum, currentTier);
        structure.metadata.folderCount++;
      }
      continue;
    }

    // Extract regular folders
    const folderMatch = line.match(/[├└]──\s*([A-Za-z_][A-Za-z0-9_]*)\//);
    if (folderMatch) {
      structure.metadata.folderCount++;
      if (currentTier) {
        currentTier.subfolders.push(folderMatch[1]);
      }
      continue;
    }

    // Extract files
    const fileMatch = line.match(/[├└]──\s*([A-Za-z0-9_][A-Za-z0-9_.-]+\.[a-z]+)/);
    if (fileMatch) {
      structure.metadata.fileCount++;
      if (currentTier) {
        currentTier.files.push(fileMatch[1]);
      }
      continue;
    }
  }

  return structure;
}

/**
 * Build comparison matrix from all structures
 */
function buildComparisonMatrix(structures: FolderStructure[]): ComparisonMatrix {
  const matrix: ComparisonMatrix = {
    allTiers: new Set(),
    tierOccurrences: new Map(),
    tierVariations: new Map(),
    conflictingFiles: new Map(),
    structures,
  };

  for (const structure of structures) {
    for (const [tierNum, tierInfo] of structure.tiers.entries()) {
      // Track all unique tiers
      matrix.allTiers.add(tierNum);

      // Track which conversations have this tier
      if (!matrix.tierOccurrences.has(tierNum)) {
        matrix.tierOccurrences.set(tierNum, []);
      }
      matrix.tierOccurrences.get(tierNum)!.push(structure.conversationFile);

      // Track tier name variations
      if (!matrix.tierVariations.has(tierNum)) {
        matrix.tierVariations.set(tierNum, new Set());
      }
      matrix.tierVariations.get(tierNum)!.add(tierInfo.tierName);
    }
  }

  return matrix;
}

/**
 * Generate comparison report
 */
function generateComparisonReport(matrix: ComparisonMatrix): string {
  let report = '# Folder Structure Comparison Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += `**Total Conversations with Structures**: ${matrix.structures.length}\n`;
  report += `**Total Unique Tiers Found**: ${matrix.allTiers.size}\n\n`;

  report += '---\n\n';
  report += '## 1. Tier Overview\n\n';
  report += '| Tier | Name Variations | Found In (Conversations) |\n';
  report += '|------|----------------|---------------------------|\n';

  const sortedTiers = Array.from(matrix.allTiers).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });

  for (const tierNum of sortedTiers) {
    const variations = Array.from(matrix.tierVariations.get(tierNum) || []);
    const conversations = matrix.tierOccurrences.get(tierNum) || [];

    report += `| ${tierNum} | ${variations.join(', ')} | ${conversations.length} files |\n`;
  }

  report += '\n---\n\n';
  report += '## 2. Tier Name Conflicts\n\n';

  for (const tierNum of sortedTiers) {
    const variations = matrix.tierVariations.get(tierNum);
    if (variations && variations.size > 1) {
      report += `### ⚠️ Tier ${tierNum} has ${variations.size} different names:\n\n`;
      for (const name of variations) {
        const convs = matrix.structures
          .filter(s => s.tiers.get(tierNum)?.tierName === name)
          .map(s => path.basename(s.conversationFile));
        report += `- **${name}** (in ${convs.length} conversations)\n`;
        report += `  - ${convs.slice(0, 5).join(', ')}${convs.length > 5 ? '...' : ''}\n`;
      }
      report += '\n';
    }
  }

  report += '---\n\n';
  report += '## 3. Structure Details by Conversation\n\n';

  for (const structure of matrix.structures) {
    report += `### ${structure.conversationTitle}\n\n`;
    report += `- **Root**: ${structure.rootFolder}\n`;
    report += `- **Version**: ${structure.version || 'N/A'}\n`;
    report += `- **Tiers**: ${structure.tiers.size}\n`;
    report += `- **Total Folders**: ${structure.metadata.folderCount}\n`;
    report += `- **Total Files**: ${structure.metadata.fileCount}\n`;
    report += `- **Max Depth**: ${structure.metadata.deepestLevel}\n\n`;

    if (structure.tiers.size > 0) {
      report += '**Tiers found:**\n';
      const tiersList = Array.from(structure.tiers.keys()).sort((a, b) => parseInt(a) - parseInt(b));
      report += tiersList.map(t => `- Tier ${t}: ${structure.tiers.get(t)?.tierName}`).join('\n');
      report += '\n\n';
    }
  }

  return report;
}

/**
 * Main extraction function
 */
function extractAllFolderStructures(conversationsDir: string, outputFile: string): void {
  console.log('\n🔍 Extracting Folder Structures from All Conversations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find all conversation files
  const allFiles = fs.readdirSync(conversationsDir)
    .filter(f => f.endsWith('-extracted.md'))
    .map(f => path.join(conversationsDir, f));

  console.log(`📂 Found ${allFiles.length} conversation files\n`);

  const structures: FolderStructure[] = [];
  let filesWithStructures = 0;

  for (const file of allFiles) {
    const treeLines = extractTreeLines(file);

    if (treeLines.length > 0) {
      console.log(`  ✓ ${path.basename(file)}: ${treeLines.length} tree lines`);
      const structure = parseTreeStructure(file, treeLines);
      if (structure && structure.tiers.size > 0) {
        structures.push(structure);
        filesWithStructures++;
      }
    }
  }

  console.log(`\n✅ Extracted structures from ${filesWithStructures} conversations\n`);

  // Build comparison matrix
  console.log('🔄 Building comparison matrix...');
  const matrix = buildComparisonMatrix(structures);
  console.log(`✅ Matrix complete: ${matrix.allTiers.size} unique tiers found\n`);

  // Generate report
  console.log('📝 Generating comparison report...');
  const report = generateComparisonReport(matrix);

  // Write outputs
  const reportPath = outputFile.replace('.json', '-report.md');
  fs.writeFileSync(outputFile, JSON.stringify(matrix, (key, value) => {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else if (value instanceof Set) {
      return Array.from(value);
    }
    return value;
  }, 2));

  fs.writeFileSync(reportPath, report);

  console.log(`✅ Comparison matrix saved: ${outputFile}`);
  console.log(`✅ Comparison report saved: ${reportPath}\n`);

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Conversations: ${allFiles.length}`);
  console.log(`Conversations with Structures: ${filesWithStructures}`);
  console.log(`Unique Tiers Found: ${matrix.allTiers.size}`);
  console.log(`\nNext Step: Review ${reportPath} to validate tier variations\n`);
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx ts-node extract-all-folder-structures.ts <conversations-dir> <output-file>');
    console.error('\nExample:');
    console.error('  npx ts-node extract-all-folder-structures.ts "../extracted/conversations" "../analysis/folder-structures-comparison.json"');
    process.exit(1);
  }

  const [conversationsDir, outputFile] = args;

  if (!fs.existsSync(conversationsDir)) {
    console.error(`Error: Conversations directory not found: ${conversationsDir}`);
    process.exit(1);
  }

  extractAllFolderStructures(conversationsDir, outputFile);
}
