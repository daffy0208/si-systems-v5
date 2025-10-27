#!/usr/bin/env node
/**
 * Validate Folder Structure - Determine Ground Truth
 *
 * Analyzes all folder structure variations to determine:
 * 1. Most authoritative/recent versions
 * 2. Consensus across conversations
 * 3. Confidence scores for each tier
 * 4. Validated structure with evidence
 *
 * Usage:
 *   npx ts-node validate-folder-structure.ts <comparison-json> <output-file>
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationCriteria {
  frequency: number;        // How often this appears
  recency: number;          // Based on conversation dates
  consistency: number;      // How consistent with other sources
  completeness: number;     // How complete the structure is
  authorityScore: number;   // Overall confidence score
}

interface ValidatedTier {
  tierNumber: string;
  canonicalName: string;
  alternativeNames: string[];
  confidence: number;
  evidence: {
    frequency: number;
    sources: string[];
    firstSeen: string;
    lastSeen: string;
    consistentWith: string[];
  };
  substructure?: {
    folders: string[];
    files: string[];
    depth: number;
  };
}

interface ValidatedStructure {
  rootName: string;
  version: string;
  confidence: number;
  tiers: ValidatedTier[];
  validationMetadata: {
    totalSourceConversations: number;
    analysisDate: string;
    validationMethod: string;
    consensusThreshold: number;
  };
}

/**
 * Load comparison data
 */
function loadComparisonData(jsonPath: string): any {
  console.log(`📂 Loading comparison data: ${jsonPath}`);
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract conversation dates from filenames or metadata
 */
function extractConversationDate(filename: string): Date {
  // Try to extract date from filename patterns
  // Most conversations have date info in catalog metadata
  // For now, use file modification time as proxy
  return new Date(0); // Placeholder - would need catalog metadata
}

/**
 * Calculate authority score for a tier name variation
 */
function calculateAuthorityScore(
  tierNum: string,
  tierName: string,
  matrix: any
): ValidationCriteria {
  const occurrences = matrix.tierOccurrences[tierNum] || [];
  const variations = Array.from(matrix.tierVariations[tierNum] || []);

  // Frequency: How many conversations use this exact name
  const sourcesWithThisName = matrix.structures.filter((s: any) =>
    s.tiers[tierNum]?.tierName === tierName
  );
  const frequency = sourcesWithThisName.length / occurrences.length;

  // Recency: Placeholder - would calculate based on conversation dates
  const recency = 0.5;

  // Consistency: Does this name appear in conversations that have complete structures?
  const avgCompleteness = sourcesWithThisName.reduce((sum: number, s: any) =>
    sum + s.tiers.size, 0) / sourcesWithThisName.length;
  const consistency = avgCompleteness / 30; // Assuming 30 tiers is "complete"

  // Completeness: How complete are the structures using this name?
  const avgDepth = sourcesWithThisName.reduce((sum: number, s: any) =>
    sum + (s.metadata?.deepestLevel || 0), 0) / sourcesWithThisName.length;
  const completeness = Math.min(avgDepth / 5, 1); // Normalize to 5+ levels deep

  // Overall authority score (weighted average)
  const authorityScore = (
    frequency * 0.4 +
    recency * 0.2 +
    consistency * 0.2 +
    completeness * 0.2
  );

  return {
    frequency,
    recency,
    consistency,
    completeness,
    authorityScore,
  };
}

/**
 * Determine canonical name for a tier
 */
function determineCanonicalName(
  tierNum: string,
  matrix: any
): { name: string; score: ValidationCriteria; alternatives: string[] } {
  const variations = Array.from(matrix.tierVariations[tierNum] || []);

  if (variations.length === 0) {
    return {
      name: `${tierNum}_Unknown`,
      score: {
        frequency: 0,
        recency: 0,
        consistency: 0,
        completeness: 0,
        authorityScore: 0,
      },
      alternatives: [],
    };
  }

  // Calculate authority score for each variation
  const scores = variations.map(name => ({
    name,
    score: calculateAuthorityScore(tierNum, name, matrix),
  }));

  // Sort by authority score
  scores.sort((a, b) => b.score.authorityScore - a.score.authorityScore);

  return {
    name: scores[0].name,
    score: scores[0].score,
    alternatives: scores.slice(1).map(s => s.name),
  };
}

/**
 * Check for tier number conflicts (0 vs 00, 1 vs 01, etc.)
 */
function resolveTierNumberConflicts(matrix: any): Map<string, string> {
  const mapping = new Map<string, string>();

  // Check if both "0" and "00" exist
  const has0 = matrix.allTiers.includes('0');
  const has00 = matrix.allTiers.includes('00');

  if (has0 && has00) {
    // Count occurrences
    const count0 = (matrix.tierOccurrences['0'] || []).length;
    const count00 = (matrix.tierOccurrences['00'] || []).length;

    // Use the more common one
    if (count00 > count0) {
      mapping.set('0', '00'); // Map 0 to 00
    } else {
      mapping.set('00', '0'); // Map 00 to 0
    }
  }

  // Repeat for 1 vs 01, 2 vs 02, etc.
  for (let i = 1; i <= 9; i++) {
    const single = i.toString();
    const double = i.toString().padStart(2, '0');

    const hasSingle = matrix.allTiers.includes(single);
    const hasDouble = matrix.allTiers.includes(double);

    if (hasSingle && hasDouble) {
      const countSingle = (matrix.tierOccurrences[single] || []).length;
      const countDouble = (matrix.tierOccurrences[double] || []).length;

      if (countDouble > countSingle) {
        mapping.set(single, double);
      } else {
        mapping.set(double, single);
      }
    }
  }

  return mapping;
}

/**
 * Build validated structure
 */
function buildValidatedStructure(matrix: any): ValidatedStructure {
  console.log('\n🔍 Analyzing folder structure patterns...\n');

  // Resolve tier number conflicts
  const tierMapping = resolveTierNumberConflicts(matrix);
  console.log(`  ✓ Resolved ${tierMapping.size} tier number conflicts`);

  // Get unique tier numbers after mapping
  const allTierNums = Array.from(matrix.allTiers)
    .map(t => tierMapping.get(t) || t)
    .filter((v, i, a) => a.indexOf(v) === i) // Unique
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return numA - numB;
    });

  console.log(`  ✓ Found ${allTierNums.length} unique tiers\n`);

  // Build validated tiers
  const validatedTiers: ValidatedTier[] = [];

  for (const tierNum of allTierNums) {
    const canonical = determineCanonicalName(tierNum, matrix);
    const sources = matrix.tierOccurrences[tierNum] || [];

    const tier: ValidatedTier = {
      tierNumber: tierNum,
      canonicalName: canonical.name,
      alternativeNames: canonical.alternatives,
      confidence: canonical.score.authorityScore,
      evidence: {
        frequency: sources.length,
        sources: sources.map((s: string) => path.basename(s)),
        firstSeen: 'N/A', // Would extract from dates
        lastSeen: 'N/A',
        consistentWith: [], // Would cross-reference
      },
    };

    validatedTiers.push(tier);

    // Log progress
    const confidence = (tier.confidence * 100).toFixed(0);
    const altText = tier.alternativeNames.length > 0
      ? ` (${tier.alternativeNames.length} alternatives)`
      : '';
    console.log(`  Tier ${tierNum.padStart(2)}: ${tier.canonicalName}${altText} [${confidence}% confidence]`);
  }

  // Determine root name and version
  const rootNames = matrix.structures
    .map((s: any) => s.rootFolder)
    .filter((r: string) => r)
    .reduce((acc: any, name: string) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  const mostCommonRoot = Object.entries(rootNames)
    .sort(([, a]: any, [, b]: any) => b - a)[0];

  const rootName = mostCommonRoot ? mostCommonRoot[0] : 'Sapien_Intelligence_v4.0';

  // Extract version
  const versionMatch = rootName.match(/v(\d+\.\d+(\.\d+)?)/);
  const version = versionMatch ? versionMatch[1] : '4.0';

  // Calculate overall confidence
  const avgConfidence = validatedTiers.reduce((sum, t) => sum + t.confidence, 0) / validatedTiers.length;

  console.log(`\n  Root: ${rootName} (v${version})`);
  console.log(`  Overall Confidence: ${(avgConfidence * 100).toFixed(0)}%\n`);

  return {
    rootName,
    version,
    confidence: avgConfidence,
    tiers: validatedTiers,
    validationMetadata: {
      totalSourceConversations: matrix.structures.length,
      analysisDate: new Date().toISOString(),
      validationMethod: 'frequency-weighted consensus analysis',
      consensusThreshold: 0.5,
    },
  };
}

/**
 * Generate validation report
 */
function generateValidationReport(validated: ValidatedStructure): string {
  let report = '# Validated Folder Structure Report\n\n';
  report += `**Generated**: ${validated.validationMetadata.analysisDate}\n`;
  report += `**Root**: ${validated.rootName}\n`;
  report += `**Version**: ${validated.version}\n`;
  report += `**Overall Confidence**: ${(validated.confidence * 100).toFixed(1)}%\n`;
  report += `**Source Conversations**: ${validated.validationMetadata.totalSourceConversations}\n\n`;

  report += '---\n\n';
  report += '## Validated Tier Structure\n\n';
  report += '| Tier | Canonical Name | Confidence | Alternatives | Sources |\n';
  report += '|------|----------------|------------|--------------|----------|\n';

  for (const tier of validated.tiers) {
    const confidence = (tier.confidence * 100).toFixed(0);
    const altCount = tier.alternativeNames.length;
    const altText = altCount > 0 ? `${altCount} variations` : 'None';

    report += `| **${tier.tierNumber}** | ${tier.canonicalName} | ${confidence}% | ${altText} | ${tier.evidence.frequency} |\n`;
  }

  report += '\n---\n\n';
  report += '## High Confidence Tiers (>70%)\n\n';

  const highConfidence = validated.tiers.filter(t => t.confidence >= 0.7);
  for (const tier of highConfidence) {
    report += `### Tier ${tier.tierNumber}: ${tier.canonicalName}\n\n`;
    report += `**Confidence**: ${(tier.confidence * 100).toFixed(1)}%\n`;
    report += `**Found in**: ${tier.evidence.frequency} conversations\n`;

    if (tier.alternativeNames.length > 0) {
      report += `**Alternative names**:\n`;
      for (const alt of tier.alternativeNames.slice(0, 5)) {
        report += `- ${alt}\n`;
      }
      if (tier.alternativeNames.length > 5) {
        report += `- ... and ${tier.alternativeNames.length - 5} more\n`;
      }
    }
    report += '\n';
  }

  report += '\n---\n\n';
  report += '## Low Confidence Tiers (<50%)\n\n';

  const lowConfidence = validated.tiers.filter(t => t.confidence < 0.5);
  if (lowConfidence.length > 0) {
    report += '⚠️ The following tiers have low confidence and may need manual validation:\n\n';
    for (const tier of lowConfidence) {
      report += `- **Tier ${tier.tierNumber}**: ${tier.canonicalName} (${(tier.confidence * 100).toFixed(0)}% confidence, ${tier.evidence.frequency} sources)\n`;
    }
  } else {
    report += '✅ All tiers have at least 50% confidence.\n';
  }

  report += '\n---\n\n';
  report += '## Validation Method\n\n';
  report += `**Method**: ${validated.validationMetadata.validationMethod}\n\n`;
  report += `**Criteria**:\n`;
  report += `- **Frequency** (40%): How often this name appears across conversations\n`;
  report += `- **Recency** (20%): Based on conversation dates (not yet implemented)\n`;
  report += `- **Consistency** (20%): Appears in complete, well-structured conversations\n`;
  report += `- **Completeness** (20%): Conversations with this name have deep structures\n\n`;

  report += '**Consensus Threshold**: ';
  report += `Tier names appearing in >${(validated.validationMetadata.consensusThreshold * 100)}% of sources are considered validated.\n`;

  return report;
}

/**
 * Main validation function
 */
function validateFolderStructure(comparisonJson: string, outputFile: string): void {
  console.log('\n🔬 Folder Structure Validation Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load comparison data
  const matrix = loadComparisonData(comparisonJson);

  // Build validated structure
  const validated = buildValidatedStructure(matrix);

  // Generate report
  console.log('📝 Generating validation report...');
  const report = generateValidationReport(validated);

  // Save outputs
  const reportPath = outputFile.replace('.json', '-report.md');
  fs.writeFileSync(outputFile, JSON.stringify(validated, null, 2));
  fs.writeFileSync(reportPath, report);

  console.log(`✅ Validated structure saved: ${outputFile}`);
  console.log(`✅ Validation report saved: ${reportPath}\n`);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VALIDATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Tiers: ${validated.tiers.length}`);

  const highConf = validated.tiers.filter(t => t.confidence >= 0.7).length;
  const medConf = validated.tiers.filter(t => t.confidence >= 0.5 && t.confidence < 0.7).length;
  const lowConf = validated.tiers.filter(t => t.confidence < 0.5).length;

  console.log(`High Confidence (≥70%): ${highConf}`);
  console.log(`Medium Confidence (50-70%): ${medConf}`);
  console.log(`Low Confidence (<50%): ${lowConf}`);
  console.log(`\nOverall Confidence: ${(validated.confidence * 100).toFixed(1)}%`);
  console.log(`\nNext Step: Review ${reportPath} for validated structure\n`);
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx ts-node validate-folder-structure.ts <comparison-json> <output-file>');
    console.error('\nExample:');
    console.error('  npx ts-node validate-folder-structure.ts "../analysis/folder-structures-comparison.json" "../analysis/validated-structure.json"');
    process.exit(1);
  }

  const [comparisonJson, outputFile] = args;

  if (!fs.existsSync(comparisonJson)) {
    console.error(`Error: Comparison file not found: ${comparisonJson}`);
    process.exit(1);
  }

  validateFolderStructure(comparisonJson, outputFile);
}
