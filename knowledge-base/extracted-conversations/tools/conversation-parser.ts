#!/usr/bin/env node
/**
 * ChatGPT Conversation Parser
 *
 * Extracts structured knowledge from ChatGPT conversation export files.
 *
 * Features:
 * - Metadata extraction (user, dates, links)
 * - Prompt/Response pair parsing
 * - Section extraction (###, ####)
 * - Table parsing
 * - List extraction
 * - Concept tagging (CLISA, BrainFrameOS, Identity Engine, Sapien)
 * - Cross-reference building
 * - JSON catalog generation
 *
 * Usage:
 *   npx ts-node conversation-parser.ts <input-file> [output-dir]
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== TYPES ====================

interface ConversationMetadata {
  user: string;
  created: string;
  updated: string;
  exported: string;
  link: string;
  title: string;
}

interface ConceptTag {
  concept: string;
  count: number;
  locations: number[]; // Exchange indices where concept appears
}

interface Section {
  level: number; // 1-6 for h1-h6
  title: string;
  content: string;
  lineNumber: number;
}

interface Table {
  headers: string[];
  rows: string[][];
  lineNumber: number;
}

interface ListItem {
  type: 'bullet' | 'numbered';
  content: string;
  indent: number;
  lineNumber: number;
}

interface Exchange {
  index: number;
  type: 'prompt' | 'response';
  content: string;
  sections: Section[];
  tables: Table[];
  lists: ListItem[][];
  conceptMentions: { [concept: string]: number };
  lineStart: number;
  lineEnd: number;
}

interface ParsedConversation {
  metadata: ConversationMetadata;
  exchanges: Exchange[];
  conceptSummary: ConceptTag[];
  totalExchanges: number;
  extractedDate: string;
}

// ==================== CONSTANTS ====================

const CONCEPTS = [
  'CLISA',
  'clisa',
  'BrainFrameOS',
  'BrainFrame',
  'brainframeos',
  'Identity Engine',
  'IdentityEngine',
  'identity engine',
  'Sapien Intelligence',
  'Sapien Pro',
  'SapienOS',
  'Sapien',
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract metadata from file header
 */
function extractMetadata(lines: string[]): ConversationMetadata {
  const metadata: Partial<ConversationMetadata> = {};

  // Title is first line (# Title)
  metadata.title = lines[0]?.replace(/^#\s+/, '').trim() || 'Untitled';

  // Extract metadata fields
  for (let i = 1; i < Math.min(20, lines.length); i++) {
    const line = lines[i];

    if (line.startsWith('**User:**')) {
      metadata.user = line.replace('**User:**', '').trim();
    } else if (line.startsWith('**Created:**')) {
      metadata.created = line.replace('**Created:**', '').trim();
    } else if (line.startsWith('**Updated:**')) {
      metadata.updated = line.replace('**Updated:**', '').trim();
    } else if (line.startsWith('**Exported:**')) {
      metadata.exported = line.replace('**Exported:**', '').trim();
    } else if (line.startsWith('**Link:**')) {
      // Extract URL from markdown link
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      metadata.link = linkMatch ? linkMatch[2] : '';
    }
  }

  return metadata as ConversationMetadata;
}

/**
 * Count concept mentions in text
 */
function countConcepts(text: string): { [concept: string]: number } {
  const counts: { [concept: string]: number } = {};

  for (const concept of CONCEPTS) {
    const regex = new RegExp(concept, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      counts[concept] = matches.length;
    }
  }

  return counts;
}

/**
 * Extract sections from content
 */
function extractSections(content: string, startLine: number): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;

  lines.forEach((line, idx) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
        lineNumber: startLine + idx,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  });

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract tables from content
 */
function extractTables(content: string, startLine: number): Table[] {
  const tables: Table[] = [];
  const lines = content.split('\n');

  let inTable = false;
  let currentTable: Table | null = null;

  lines.forEach((line, idx) => {
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    const isSeparator = /^\|[\s\-:|]+\|$/.test(line.trim());

    if (isTableRow && !isSeparator) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim());

      if (!inTable) {
        // Start new table
        inTable = true;
        currentTable = {
          headers: cells,
          rows: [],
          lineNumber: startLine + idx,
        };
      } else if (currentTable) {
        // Add row to current table
        currentTable.rows.push(cells);
      }
    } else if (isSeparator) {
      // Table separator, skip
      return;
    } else if (inTable && currentTable) {
      // End of table
      tables.push(currentTable);
      inTable = false;
      currentTable = null;
    }
  });

  // Save last table if exists
  if (inTable && currentTable) {
    tables.push(currentTable);
  }

  return tables;
}

/**
 * Extract lists from content
 */
function extractLists(content: string, startLine: number): ListItem[][] {
  const lists: ListItem[][] = [];
  const lines = content.split('\n');

  let currentList: ListItem[] = [];

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    const numberedMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);

    if (bulletMatch) {
      const indent = bulletMatch[1].length / 4; // Assume 4 spaces per indent
      currentList.push({
        type: 'bullet',
        content: bulletMatch[3],
        indent: Math.floor(indent),
        lineNumber: startLine + idx,
      });
    } else if (numberedMatch) {
      const indent = numberedMatch[1].length / 4;
      currentList.push({
        type: 'numbered',
        content: numberedMatch[3],
        indent: Math.floor(indent),
        lineNumber: startLine + idx,
      });
    } else if (currentList.length > 0 && line.trim() === '') {
      // Empty line ends current list
      lists.push([...currentList]);
      currentList = [];
    }
  });

  // Save last list if exists
  if (currentList.length > 0) {
    lists.push(currentList);
  }

  return lists;
}

/**
 * Parse exchanges (Prompt/Response pairs)
 */
function parseExchanges(lines: string[]): Exchange[] {
  const exchanges: Exchange[] = [];
  let currentExchange: Exchange | null = null;
  let currentContent: string[] = [];
  let exchangeIndex = 0;
  let lineStart = 0;

  lines.forEach((line, idx) => {
    // Check for Prompt or Response markers
    if (line.trim() === '## Prompt:') {
      // Save previous exchange
      if (currentExchange) {
        const content = currentContent.join('\n');
        currentExchange.content = content;
        currentExchange.sections = extractSections(content, lineStart);
        currentExchange.tables = extractTables(content, lineStart);
        currentExchange.lists = extractLists(content, lineStart);
        currentExchange.conceptMentions = countConcepts(content);
        currentExchange.lineEnd = idx - 1;
        exchanges.push(currentExchange as Exchange);
      }

      // Start new Prompt exchange
      currentExchange = {
        index: exchangeIndex++,
        type: 'prompt',
        lineStart: idx,
        content: '',
        sections: [],
        tables: [],
        lists: [],
        conceptMentions: {},
        lineEnd: idx,
      };
      currentContent = [];
      lineStart = idx;

    } else if (line.trim() === '## Response:') {
      // Save previous exchange
      if (currentExchange) {
        const content = currentContent.join('\n');
        currentExchange.content = content;
        currentExchange.sections = extractSections(content, lineStart);
        currentExchange.tables = extractTables(content, lineStart);
        currentExchange.lists = extractLists(content, lineStart);
        currentExchange.conceptMentions = countConcepts(content);
        currentExchange.lineEnd = idx - 1;
        exchanges.push(currentExchange as Exchange);
      }

      // Start new Response exchange
      currentExchange = {
        index: exchangeIndex++,
        type: 'response',
        lineStart: idx,
        content: '',
        sections: [],
        tables: [],
        lists: [],
        conceptMentions: {},
        lineEnd: idx,
      };
      currentContent = [];
      lineStart = idx;

    } else if (currentExchange) {
      // Add line to current exchange content
      currentContent.push(line);
    }
  });

  // Save last exchange
  if (currentExchange) {
    const content = currentContent.join('\n');
    (currentExchange as any).content = content;
    (currentExchange as any).sections = extractSections(content, lineStart);
    (currentExchange as any).tables = extractTables(content, lineStart);
    (currentExchange as any).lists = extractLists(content, lineStart);
    (currentExchange as any).conceptMentions = countConcepts(content);
    (currentExchange as any).lineEnd = lines.length - 1;
    exchanges.push(currentExchange);
  }

  return exchanges;
}

/**
 * Generate concept summary across all exchanges
 */
function generateConceptSummary(exchanges: Exchange[]): ConceptTag[] {
  const conceptMap: { [concept: string]: ConceptTag } = {};

  exchanges.forEach(exchange => {
    Object.entries(exchange.conceptMentions).forEach(([concept, count]) => {
      if (!conceptMap[concept]) {
        conceptMap[concept] = {
          concept,
          count: 0,
          locations: [],
        };
      }
      conceptMap[concept].count += count;
      conceptMap[concept].locations.push(exchange.index);
    });
  });

  return Object.values(conceptMap).sort((a, b) => b.count - a.count);
}

// ==================== MAIN PARSER ====================

/**
 * Parse a ChatGPT conversation file
 */
export function parseConversation(filePath: string): ParsedConversation {
  console.log(`\n📖 Parsing: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log(`  Total lines: ${lines.length}`);

  // Extract metadata
  const metadata = extractMetadata(lines);
  console.log(`  Title: ${metadata.title}`);

  // Parse exchanges
  const exchanges = parseExchanges(lines);
  console.log(`  Exchanges: ${exchanges.length}`);

  // Generate concept summary
  const conceptSummary = generateConceptSummary(exchanges);
  console.log(`  Unique concepts: ${conceptSummary.length}`);
  conceptSummary.slice(0, 5).forEach(tag => {
    console.log(`    - ${tag.concept}: ${tag.count} mentions`);
  });

  return {
    metadata,
    exchanges,
    conceptSummary,
    totalExchanges: exchanges.length,
    extractedDate: new Date().toISOString(),
  };
}

/**
 * Generate structured markdown output
 */
export function generateMarkdown(parsed: ParsedConversation): string {
  let md = `# ${parsed.metadata.title}\n\n`;

  md += `## Metadata\n\n`;
  md += `- **User**: ${parsed.metadata.user}\n`;
  md += `- **Created**: ${parsed.metadata.created}\n`;
  md += `- **Updated**: ${parsed.metadata.updated}\n`;
  md += `- **Exported**: ${parsed.metadata.exported}\n`;
  md += `- **Link**: [ChatGPT](${parsed.metadata.link})\n`;
  md += `- **Extracted**: ${parsed.extractedDate}\n\n`;

  md += `## Concept Summary\n\n`;
  md += `**Total Exchanges**: ${parsed.totalExchanges}\n\n`;
  md += `| Concept | Mentions | Locations |\n`;
  md += `|---------|----------|----------|\n`;
  parsed.conceptSummary.forEach(tag => {
    const locations = tag.locations.length > 5
      ? `${tag.locations.slice(0, 5).join(', ')}... (${tag.locations.length} total)`
      : tag.locations.join(', ');
    md += `| ${tag.concept} | ${tag.count} | ${locations} |\n`;
  });
  md += `\n`;

  md += `## Exchanges\n\n`;

  parsed.exchanges.forEach(exchange => {
    const typeLabel = exchange.type === 'prompt' ? '❓ Prompt' : '💬 Response';
    md += `### ${typeLabel} #${exchange.index + 1}\n\n`;

    // Add content
    md += `${exchange.content}\n\n`;

    // Add metadata
    if (exchange.sections.length > 0) {
      md += `**Sections**: ${exchange.sections.length} (${exchange.sections.map(s => s.title).join(', ')})\n`;
    }
    if (exchange.tables.length > 0) {
      md += `**Tables**: ${exchange.tables.length}\n`;
    }
    if (exchange.lists.length > 0) {
      md += `**Lists**: ${exchange.lists.length}\n`;
    }

    const concepts = Object.entries(exchange.conceptMentions);
    if (concepts.length > 0) {
      md += `**Concepts**: ${concepts.map(([c, n]) => `${c} (${n})`).join(', ')}\n`;
    }

    md += `\n---\n\n`;
  });

  return md;
}

/**
 * Generate JSON catalog entry
 */
export function generateCatalogEntry(
  filePath: string,
  parsed: ParsedConversation
): any {
  return {
    sourceFile: path.basename(filePath),
    metadata: parsed.metadata,
    stats: {
      totalExchanges: parsed.totalExchanges,
      totalSections: parsed.exchanges.reduce((sum, e) => sum + e.sections.length, 0),
      totalTables: parsed.exchanges.reduce((sum, e) => sum + e.tables.length, 0),
      totalLists: parsed.exchanges.reduce((sum, e) => sum + e.lists.length, 0),
    },
    concepts: parsed.conceptSummary,
    extractedDate: parsed.extractedDate,
  };
}

// ==================== CLI ====================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx ts-node conversation-parser.ts <input-file> [output-dir]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputDir = args[1] || path.join(path.dirname(inputFile), 'extracted', 'conversations');

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Parse conversation
  const parsed = parseConversation(inputFile);

  // Generate output filename
  const baseName = path.basename(inputFile, '.md');
  const outputFile = path.join(outputDir, `${baseName}-extracted.md`);
  const catalogFile = path.join(outputDir, `${baseName}-catalog.json`);

  // Write markdown output
  const markdown = generateMarkdown(parsed);
  fs.writeFileSync(outputFile, markdown);
  console.log(`\n✅ Markdown output: ${outputFile}`);

  // Write catalog entry
  const catalogEntry = generateCatalogEntry(inputFile, parsed);
  fs.writeFileSync(catalogFile, JSON.stringify(catalogEntry, null, 2));
  console.log(`✅ Catalog entry: ${catalogFile}`);

  console.log(`\n🎉 Extraction complete!\n`);
}
