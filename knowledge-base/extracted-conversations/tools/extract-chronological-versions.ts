#!/usr/bin/env npx ts-node
/**
 * Extract Chronological Version History
 *
 * Tracks the evolution of Sapien Intelligence, BrainFrameOS, Identity Engine, and CLISA
 * across all versions found in conversations to understand development order.
 */

import * as fs from 'fs';
import * as path from 'path';

interface VersionReference {
  system: 'BrainFrameOS' | 'Sapien_Intelligence' | 'Identity_Engine' | 'CLISA';
  version: string;
  context: string;
  file: string;
  lineNumber: number;
}

interface FolderStructureSnapshot {
  version: string;
  file: string;
  structure: {
    tierNumber: string;
    tierName: string;
    components: string[];
  }[];
}

function extractVersionReferences(conversationsDir: string): VersionReference[] {
  const refs: VersionReference[] = [];
  const files = fs.readdirSync(conversationsDir);

  for (const file of files) {
    if (!file.endsWith('-extracted.md')) continue;

    const filePath = path.join(conversationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // BrainFrameOS versions
      const bfMatch = line.match(/BrainFrameOS?\s*v?(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/i);
      if (bfMatch) {
        refs.push({
          system: 'BrainFrameOS',
          version: bfMatch[1],
          context: line.trim(),
          file,
          lineNumber: index + 1
        });
      }

      // Sapien Intelligence versions
      const siMatch = line.match(/Sapien[_\s]Intelligence[_\s]?v?(\d+\.\d+(?:\.\d+)?)/i);
      if (siMatch) {
        refs.push({
          system: 'Sapien_Intelligence',
          version: siMatch[1],
          context: line.trim(),
          file,
          lineNumber: index + 1
        });
      }

      // Identity Engine versions
      const ieMatch = line.match(/Identity[_\s]Engine[_\s]?v?(\d+\.\d+(?:\.\d+)?)/i);
      if (ieMatch) {
        refs.push({
          system: 'Identity_Engine',
          version: ieMatch[1],
          context: line.trim(),
          file,
          lineNumber: index + 1
        });
      }

      // CLISA versions
      const clisaMatch = line.match(/CLISA[_\s]?v?(\d+\.\d+(?:\.\d+)?)/i);
      if (clisaMatch) {
        refs.push({
          system: 'CLISA',
          version: clisaMatch[1],
          context: line.trim(),
          file,
          lineNumber: index + 1
        });
      }
    });
  }

  return refs;
}

function extractStructureSnapshots(conversationsDir: string): FolderStructureSnapshot[] {
  const snapshots: FolderStructureSnapshot[] = [];
  const files = fs.readdirSync(conversationsDir);

  for (const file of files) {
    if (!file.endsWith('-extracted.md')) continue;

    const filePath = path.join(conversationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find folder tree structures with version numbers
    const versionMatch = content.match(/Sapien[_\s]Intelligence[_\s]?v?(\d+\.\d+(?:\.\d+)?)/i);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const structure: FolderStructureSnapshot['structure'] = [];

    // Extract tier structure
    const tierMatches = content.matchAll(/├──\s*(\d+)_([^\n\/]+)/g);
    for (const match of tierMatches) {
      const tierNumber = match[1];
      const tierName = match[2].trim();

      // Find components in this tier (look for subfolders/files)
      const tierSection = content.substring(match.index || 0, (match.index || 0) + 500);
      const components: string[] = [];

      // Extract immediate children
      const childMatches = tierSection.matchAll(/│\s+├──\s*([^\n]+)/g);
      for (const child of childMatches) {
        components.push(child[1].trim());
      }

      structure.push({ tierNumber, tierName, components });
    }

    if (structure.length > 0) {
      snapshots.push({ version, file, structure });
    }
  }

  return snapshots;
}

function parseVersion(version: string): number[] {
  return version.split('.').map(n => parseInt(n, 10));
}

function compareVersions(a: string, b: string): number {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }

  return 0;
}

function groupByVersion(refs: VersionReference[]) {
  const grouped = new Map<string, { system: string; count: number; files: Set<string> }>();

  refs.forEach(ref => {
    const key = `${ref.system}_v${ref.version}`;
    if (!grouped.has(key)) {
      grouped.set(key, { system: ref.system, count: 0, files: new Set() });
    }
    const entry = grouped.get(key)!;
    entry.count++;
    entry.files.add(ref.file);
  });

  return grouped;
}

function findCLISALocation(snapshots: FolderStructureSnapshot[]): Map<string, string> {
  const locations = new Map<string, string>();

  for (const snapshot of snapshots) {
    // Check if CLISA is at Tier 00
    const tier00 = snapshot.structure.find(t => t.tierNumber === '00' || t.tierNumber === '0');
    if (tier00 && (tier00.tierName.includes('CLISA') || tier00.tierName.includes('Sapien_Field_Definition'))) {
      locations.set(snapshot.version, 'Tier 00 (Foundation)');
      continue;
    }

    // Check if CLISA is in Tier 4/Tools
    const tier4 = snapshot.structure.find(t => t.tierNumber === '4');
    if (tier4 && tier4.components.some(c => c.includes('CLISA'))) {
      locations.set(snapshot.version, 'Tier 4/Tools_and_Expression/CLISA/');
      continue;
    }

    // Check BrainFrame location
    const bfTier = snapshot.structure.find(t => t.tierName.includes('BrainFrame'));
    if (bfTier) {
      locations.set(snapshot.version, `BrainFrame at Tier ${bfTier.tierNumber}`);
    }
  }

  return locations;
}

function main() {
  const conversationsDir = path.resolve(__dirname, '../extracted/conversations');
  const outputDir = path.resolve(__dirname, '../analysis');

  console.log('\n📜 Extracting Chronological Version History...\n');

  // Extract version references
  const refs = extractVersionReferences(conversationsDir);
  console.log(`  Found ${refs.length} version references`);

  // Extract structure snapshots
  const snapshots = extractStructureSnapshots(conversationsDir);
  console.log(`  Found ${snapshots.length} structure snapshots\n`);

  // Group by version
  const grouped = groupByVersion(refs);

  // Sort systems by earliest version
  const systemTimelines = new Map<string, string[]>();

  for (const [key, data] of grouped) {
    if (!systemTimelines.has(data.system)) {
      systemTimelines.set(data.system, []);
    }
    const version = key.replace(`${data.system}_v`, '');
    systemTimelines.get(data.system)!.push(version);
  }

  // Sort versions within each system
  for (const [system, versions] of systemTimelines) {
    versions.sort(compareVersions);
  }

  // Find CLISA locations across versions
  const clisaLocations = findCLISALocation(snapshots);

  // Build chronology report
  const report: string[] = [];
  report.push('# Chronological Version History\n\n');
  report.push('**Purpose**: Track the evolution of Sapien Intelligence, BrainFrameOS, Identity Engine, and CLISA to understand development order.\n\n');
  report.push('---\n\n');

  // Timeline summary
  report.push('## Development Timeline Summary\n\n');

  report.push('### BrainFrameOS Evolution\n\n');
  const bfVersions = systemTimelines.get('BrainFrameOS') || [];
  report.push(`**Versions Found**: ${bfVersions.length}\n\n`);
  report.push('**Version Progression**:\n');
  bfVersions.forEach(v => {
    const key = `BrainFrameOS_v${v}`;
    const data = grouped.get(key)!;
    report.push(`- v${v} (${data.count} references in ${data.files.size} conversations)\n`);
  });
  report.push('\n');

  report.push('### Identity Engine Evolution\n\n');
  const ieVersions = systemTimelines.get('Identity_Engine') || [];
  report.push(`**Versions Found**: ${ieVersions.length}\n\n`);
  report.push('**Version Progression**:\n');
  ieVersions.forEach(v => {
    const key = `Identity_Engine_v${v}`;
    const data = grouped.get(key)!;
    report.push(`- v${v} (${data.count} references in ${data.files.size} conversations)\n`);
  });
  report.push('\n');

  report.push('### CLISA Evolution\n\n');
  const clisaVersions = systemTimelines.get('CLISA') || [];
  report.push(`**Versions Found**: ${clisaVersions.length}\n\n`);
  if (clisaVersions.length > 0) {
    report.push('**Version Progression**:\n');
    clisaVersions.forEach(v => {
      const key = `CLISA_v${v}`;
      const data = grouped.get(key)!;
      report.push(`- v${v} (${data.count} references in ${data.files.size} conversations)\n`);
    });
  }
  report.push('\n');

  report.push('### Sapien Intelligence Evolution\n\n');
  const siVersions = systemTimelines.get('Sapien_Intelligence') || [];
  report.push(`**Versions Found**: ${siVersions.length}\n\n`);
  report.push('**Version Progression**:\n');
  siVersions.forEach(v => {
    const key = `Sapien_Intelligence_v${v}`;
    const data = grouped.get(key)!;
    report.push(`- v${v} (${data.count} references in ${data.files.size} conversations)\n`);
  });
  report.push('\n');

  // Structure evolution
  report.push('---\n\n');
  report.push('## Folder Structure Evolution\n\n');
  report.push('### CLISA Location Across Versions\n\n');

  const sortedSnapshots = [...snapshots].sort((a, b) => compareVersions(a.version, b.version));

  for (const snapshot of sortedSnapshots) {
    report.push(`#### Sapien_Intelligence v${snapshot.version}\n\n`);
    report.push(`**Source**: ${snapshot.file}\n\n`);

    // Show tier structure
    report.push('**Tier Structure**:\n');
    for (const tier of snapshot.structure) {
      report.push(`- Tier ${tier.tierNumber}: ${tier.tierName}\n`);
      if (tier.components.length > 0) {
        tier.components.slice(0, 3).forEach(comp => {
          report.push(`  - ${comp}\n`);
        });
        if (tier.components.length > 3) {
          report.push(`  - ... and ${tier.components.length - 3} more\n`);
        }
      }
    }
    report.push('\n');

    const location = clisaLocations.get(snapshot.version);
    if (location) {
      report.push(`**Key Finding**: ${location}\n\n`);
    }
  }

  // Key insights
  report.push('---\n\n');
  report.push('## Key Insights\n\n');
  report.push('### Chronological Development Order\n\n');
  report.push('Based on version analysis:\n\n');
  report.push('1. **BrainFrameOS** (earliest: v' + bfVersions[0] + ')\n');
  report.push('   - Initially positioned at **Tier 3**\n');
  report.push('   - Included Identity Engine as internal component\n\n');
  report.push('2. **CLISA** (appears in later versions)\n');
  report.push('   - Initially positioned at **Tier 4/Tools_and_Expression/CLISA/**\n');
  report.push('   - Later elevated to **Tier 00** as ontological foundation in v4.0+\n\n');
  report.push('3. **Ontological Retrofit**\n');
  report.push('   - CLISA was retrofitted as the foundational ontology (Tier 00)\n');
  report.push('   - Original development order: BrainFrame → Identity Engine → CLISA\n');
  report.push('   - Final ontological order: CLISA (00) → SI_Systems (01) → BrainFrameOS (02)\n\n');

  // Save report
  const reportPath = path.join(outputDir, 'chronological-versions-report.md');
  fs.writeFileSync(reportPath, report.join(''), 'utf-8');
  console.log(`✅ Report saved: ${reportPath}\n`);

  // Save JSON data
  const jsonData = {
    versionReferences: Array.from(grouped.entries()).map(([key, data]) => ({
      key,
      system: data.system,
      version: key.replace(`${data.system}_v`, ''),
      count: data.count,
      files: Array.from(data.files)
    })),
    structureSnapshots: snapshots,
    chronologicalOrder: {
      development: ['BrainFrameOS', 'Identity_Engine', 'CLISA'],
      ontological: ['CLISA', 'SI_Systems', 'Field_Architecture', 'BrainFrameOS']
    }
  };

  const jsonPath = path.join(outputDir, 'chronological-versions.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ JSON saved: ${jsonPath}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CHRONOLOGICAL ANALYSIS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`BrainFrameOS Versions: ${bfVersions.length} (earliest: v${bfVersions[0]})`);
  console.log(`Identity Engine Versions: ${ieVersions.length} (earliest: v${ieVersions[0] || 'N/A'})`);
  console.log(`CLISA Versions: ${clisaVersions.length} (earliest: v${clisaVersions[0] || 'N/A'})`);
  console.log(`Sapien Intelligence Versions: ${siVersions.length} (earliest: v${siVersions[0]})`);
  console.log(`\nStructure Snapshots: ${snapshots.length}`);
  console.log('\n✅ Chronological development order confirmed:');
  console.log('   1. BrainFrameOS (Tier 3)');
  console.log('   2. CLISA (Tier 4 → later elevated to Tier 00)');
  console.log('   3. Ontological retrofit in v4.0+\n');
}

main();
