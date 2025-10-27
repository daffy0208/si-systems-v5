#!/usr/bin/env npx ts-node
/**
 * Extract BrainFrame v1.0 Original Structure
 *
 * Reconstructs the ORIGINAL BrainFrame v1.0 structure before CLISA existed.
 * This was the FIRST system, positioned at Tier 3 in early versions.
 */

import * as fs from 'fs';
import * as path from 'path';

interface BrainFrameComponent {
  name: string;
  version: string;
  description: string;
  file: string;
  lineNumber: number;
  context: string;
}

function extractBrainFrameV1Components(conversationsDir: string): BrainFrameComponent[] {
  const components: BrainFrameComponent[] = [];
  const files = fs.readdirSync(conversationsDir);

  // V1.x component patterns
  const v1Patterns = [
    /BrainFrame\s+([A-Za-z\s]+)\s*[–—-]\s*v1\.(0|1|2|3|4|5)/i,
    /BrainFrameOS\s+([A-Za-z\s]+)\s*[–—-]\s*v1\.(0|1|2|3|4|5)/i,
    /\*\*BrainFrame\s+([A-Za-z\s]+)\*\*\s*[–—-]\s*v1\.(0|1|2|3|4|5)/i
  ];

  for (const file of files) {
    if (!file.endsWith('-extracted.md')) continue;

    const filePath = path.join(conversationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const pattern of v1Patterns) {
        const match = line.match(pattern);
        if (match) {
          const componentName = match[1].trim();
          const version = `v1.${match[2]}`;

          // Get description from next few lines
          let description = '';
          for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
            const nextLine = lines[i].trim();
            if (nextLine.startsWith('**Purpose:**')) {
              description = nextLine.replace('**Purpose:**', '').trim();
              break;
            }
          }

          components.push({
            name: componentName,
            version,
            description,
            file,
            lineNumber: index + 1,
            context: line.trim()
          });
        }
      }
    });
  }

  return components;
}

function findBrainFrameFileReferences(conversationsDir: string): Map<string, Set<string>> {
  const fileRefs = new Map<string, Set<string>>();
  const files = fs.readdirSync(conversationsDir);

  for (const file of files) {
    if (!file.endsWith('-extracted.md')) continue;

    const filePath = path.join(conversationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find file references within BrainFrame sections
    const filePattern = /([A-Za-z_]+\.(txt|md|json))/g;
    const matches = content.matchAll(filePattern);

    for (const match of matches) {
      const filename = match[1];

      // Check if this is within a BrainFrame context
      const contextStart = Math.max(0, (match.index || 0) - 500);
      const context = content.substring(contextStart, (match.index || 0) + 100);

      if (context.match(/BrainFrame/i)) {
        if (!fileRefs.has(file)) {
          fileRefs.set(file, new Set());
        }
        fileRefs.get(file)!.add(filename);
      }
    }
  }

  return fileRefs;
}

function extractEarlyFolderStructures(conversationsDir: string): any[] {
  const structures: any[] = [];
  const files = fs.readdirSync(conversationsDir);

  for (const file of files) {
    if (!file.endsWith('-extracted.md')) continue;

    const filePath = path.join(conversationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Look for early version indicators
    const hasV1 = content.match(/BrainFrame.*v1\.[0-5]/i);
    const hasV2Early = content.match(/BrainFrame.*v2\.[0-3]/i);

    if (!hasV1 && !hasV2Early) continue;

    // Find folder tree sections
    const treeMatches = content.matchAll(/├──\s*([^\n]+)/g);
    const foundDirs: string[] = [];

    for (const match of treeMatches) {
      foundDirs.push(match[1].trim());
    }

    if (foundDirs.length > 0) {
      structures.push({
        file,
        version: hasV1 ? 'v1.x' : 'v2.0-2.3',
        directories: foundDirs.slice(0, 20) // First 20 entries
      });
    }
  }

  return structures;
}

function main() {
  const conversationsDir = path.resolve(__dirname, '../extracted/conversations');
  const outputDir = path.resolve(__dirname, '../analysis');

  console.log('\n📜 Extracting BrainFrame v1.0 Original Structure...\n');

  // Extract v1 components
  const components = extractBrainFrameV1Components(conversationsDir);
  console.log(`  Found ${components.length} v1.x components\n`);

  // Extract file references
  const fileRefs = findBrainFrameFileReferences(conversationsDir);
  console.log(`  Found file references in ${fileRefs.size} conversations\n`);

  // Extract early folder structures
  const structures = extractEarlyFolderStructures(conversationsDir);
  console.log(`  Found ${structures.length} early folder structures\n`);

  // Build report
  const report: string[] = [];
  report.push('# BrainFrame v1.0 Original Structure\n\n');
  report.push('**Purpose**: Reconstruct the ORIGINAL BrainFrame v1.0 structure before CLISA existed.\n\n');
  report.push('**Key Finding**: BrainFrame was the FIRST system, positioned at Tier 3.\n\n');
  report.push('---\n\n');

  // Component breakdown
  report.push('## BrainFrame v1.x Components Found\n\n');

  const groupedByName = new Map<string, BrainFrameComponent[]>();
  components.forEach(comp => {
    if (!groupedByName.has(comp.name)) {
      groupedByName.set(comp.name, []);
    }
    groupedByName.get(comp.name)!.push(comp);
  });

  for (const [name, comps] of groupedByName) {
    const latestVersion = comps[0].version;
    const description = comps.find(c => c.description)?.description || 'No description available';

    report.push(`### ${name} (${latestVersion})\n\n`);
    report.push(`**Description**: ${description}\n\n`);
    report.push(`**References**: ${comps.length} occurrences\n\n`);
    report.push(`**Sources**:\n`);
    const uniqueSources = [...new Set(comps.map(c => c.file))];
    uniqueSources.slice(0, 3).forEach(source => {
      report.push(`- ${source}\n`);
    });
    if (uniqueSources.length > 3) {
      report.push(`- ... and ${uniqueSources.length - 3} more\n`);
    }
    report.push('\n');
  }

  // Early folder structures
  report.push('---\n\n');
  report.push('## Early Folder Structures\n\n');

  structures.forEach(struct => {
    report.push(`### ${struct.file}\n\n`);
    report.push(`**Version**: ${struct.version}\n\n`);
    report.push('**Directories Found**:\n');
    struct.directories.forEach((dir: string) => {
      report.push(`- ${dir}\n`);
    });
    report.push('\n');
  });

  // Reconstructed structure
  report.push('---\n\n');
  report.push('## Reconstructed BrainFrame v1.0 Structure\n\n');
  report.push('Based on component analysis and early folder structures:\n\n');
  report.push('```\n');
  report.push('BrainFrame_v1.0/  (ORIGINAL - Tier 3 position)\n\n');

  // Build structure from components
  const coreComponents = [
    'Control Panel',
    'Enhancement Modules',
    'Observer Mode',
    'Insight Agents',
    'External Interface Layer',
    'Purpose Layer',
    'Coaching And Evolution',
    'Momentum Engine',
    'Fabric Intelligence Extension'
  ];

  coreComponents.forEach(comp => {
    const found = Array.from(groupedByName.keys()).find(key =>
      key.toLowerCase().includes(comp.toLowerCase())
    );
    if (found) {
      const component = groupedByName.get(found)![0];
      report.push(`├── ${found.replace(/\s+/g, '_')}/\n`);
      report.push(`│   # ${component.version}\n`);
      if (component.description) {
        report.push(`│   # ${component.description.substring(0, 60)}...\n`);
      }
    }
  });

  report.push('```\n\n');

  // Key characteristics
  report.push('---\n\n');
  report.push('## Key Characteristics of Original BrainFrame v1.0\n\n');
  report.push('### What It Had\n\n');
  report.push('1. **Control Panel v1.0** - Central command interface\n');
  report.push('2. **Enhancement Modules v1.0** - Modular upgrades system\n');
  report.push('3. **Observer Mode v1.0** - Adaptive self-awareness\n');
  report.push('4. **Insight Agents v1.0** - Specialized cognitive agents\n');
  report.push('5. **External Interface Layer v1.0** - Client strategy bridge\n');
  report.push('6. **Purpose Layer v1.0** - Mission alignment anchor\n');
  report.push('7. **Coaching & Evolution v1.0** - Self-guided growth\n');
  report.push('8. **Momentum Engine v1.1** - Rhythm and energy sustainer\n');
  report.push('9. **Fabric Intelligence v1.0** - Cross-project awareness\n\n');

  report.push('### What It Did NOT Have\n\n');
  report.push('- **No CLISA** (came later as Tier 4 tool)\n');
  report.push('- **No Tier 00 foundation** (added in v4.0)\n');
  report.push('- **No Field Definition ontology** (retrofitted later)\n');
  report.push('- **Simpler tier structure** (0-5 vs current 00-31)\n\n');

  report.push('### Position in Original Structure\n\n');
  report.push('**Sapien_Intelligence v3.1 and earlier:**\n\n');
  report.push('```\n');
  report.push('├── 0_Origin_Field/\n');
  report.push('├── 1_SI_Systems/\n');
  report.push('├── 2_Mirror_Pyramid/\n');
  report.push('├── 3_BrainFrameOS/              ← ORIGINAL POSITION (FIRST)\n');
  report.push('│   ├── Control_Panel/\n');
  report.push('│   ├── Enhancement_Modules/\n');
  report.push('│   ├── Observer_Mode/\n');
  report.push('│   ├── Insight_Agents/\n');
  report.push('│   └── ... (all v1.0 components)\n');
  report.push('├── 4_Tools_and_Expression/\n');
  report.push('│   └── (CLISA appeared here later)\n');
  report.push('└── 5_Use_Cases_and_Outputs/\n');
  report.push('```\n\n');

  // Evolution timeline
  report.push('---\n\n');
  report.push('## Evolution Timeline\n\n');
  report.push('### Phase 1: BrainFrame v1.0 (FIRST)\n');
  report.push('- **Position**: Tier 3\n');
  report.push('- **Components**: 9 core modules\n');
  report.push('- **Purpose**: Personal operating system for clarity and momentum\n');
  report.push('- **Status**: Original system, no CLISA yet\n\n');

  report.push('### Phase 2: BrainFrame v1.x - v2.x Evolution\n');
  report.push('- **Versions**: v1.1 → v1.8 → v2.0 (major milestone)\n');
  report.push('- **Additions**: Identity Engine integration\n');
  report.push('- **Refinements**: Enhanced modules, better rhythm sync\n');
  report.push('- **Status**: Still at Tier 3, no CLISA in structure yet\n\n');

  report.push('### Phase 3: CLISA Introduction (SECOND)\n');
  report.push('- **Version**: Sapien_Intelligence v3.x\n');
  report.push('- **Position**: Tier 4/Tools_and_Expression/CLISA/\n');
  report.push('- **Purpose**: Identity file structure tool\n');
  report.push('- **Status**: Supplementary tool, not foundation\n\n');

  report.push('### Phase 4: Ontological Retrofit (v4.0)\n');
  report.push('- **Change**: CLISA elevated to Tier 00\n');
  report.push('- **Impact**: BrainFrame moved to Tier 27 subsystem\n');
  report.push('- **Philosophy**: Field-first architecture\n');
  report.push('- **Status**: Current structure\n\n');

  // Save report
  const reportPath = path.join(outputDir, 'brainframe-v1-original-structure.md');
  fs.writeFileSync(reportPath, report.join(''), 'utf-8');
  console.log(`✅ Report saved: ${reportPath}\n`);

  // Save JSON
  const jsonData = {
    components: Array.from(groupedByName.entries()).map(([name, comps]) => ({
      name,
      versions: [...new Set(comps.map(c => c.version))],
      occurrences: comps.length,
      description: comps.find(c => c.description)?.description,
      sources: [...new Set(comps.map(c => c.file))]
    })),
    earlyStructures: structures,
    chronology: {
      phase1: 'BrainFrame v1.0 (Tier 3) - FIRST',
      phase2: 'BrainFrame v1.x-v2.x evolution',
      phase3: 'CLISA introduced (Tier 4) - SECOND',
      phase4: 'CLISA retrofitted to Tier 00 (v4.0) - THIRD'
    }
  };

  const jsonPath = path.join(outputDir, 'brainframe-v1-original.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ JSON saved: ${jsonPath}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 BRAINFRAME v1.0 EXTRACTION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Components Found: ${components.length}`);
  console.log(`Unique Components: ${groupedByName.size}`);
  console.log(`Early Structures: ${structures.length}`);
  console.log('\n✅ Original BrainFrame v1.0 structure reconstructed');
  console.log('   Position: Tier 3 (FIRST SYSTEM)');
  console.log('   Before CLISA existed\n');
}

main();
