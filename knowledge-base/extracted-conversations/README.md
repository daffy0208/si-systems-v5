# SI Systems v5 Knowledge Base

Comprehensive knowledge extraction from [si-systems-v5 repository](https://github.com/daffy0208/si-systems-v5) organized into a hierarchical structure for deep understanding and integration with SI Systems v6 and ai-dev-standards projects.

## 📚 Purpose

This knowledge base serves as the foundational "brain" for:
1. **SI Systems v6** - Current drift detection and identity-aligned architecture
2. **ai-dev-standards** - Orchestration layer for 40+ specialized skills

## 🏗️ Structure

The knowledge is organized in 5 hierarchical layers:

### Layer 0: Meta-Framework (CLISA)
**Deepest ontological layer** - `extracted/0-clisa/`
- Field definitions and activation conditions
- Dimensional reflection principles
- Signal properties and structural rules
- Ontological frameworks

### Layer 1: Philosophy & Purpose (SI Systems)
**Philosophical and ethical layer** - `extracted/1-philosophy/`
- Core principles (6 documents): Sapien Principles, Human First Code, Integrity Prime, etc.
- Purpose layers (9 documents): Trust Primitives, Identity Trust Map, Symbolic Anchors, etc.

### Layer 2: Cognitive Architecture (BrainFrameOS)
**Structural/architectural layer** - `extracted/2-brainframeos/`
- System structure and 7 core components
- Advanced capabilities (Perspective Multipliers, Spectrum Modelling, etc.)
- Philosophy and application patterns

### Layer 3: Implementation (Identity Engine)
**Executable implementation layer** - `extracted/3-identity-engine/`
- Identity modules and configuration
- Bootloader systems (v1.1, v1.3)
- Implementation patterns

### Layer 4: Integration (Current SI Systems)
**Integration mapping** - `extracted/4-integration/`
- Maps v5 concepts to current v6 implementation
- Integration pathways for ai-dev-standards
- Implementation roadmaps

## 📖 Catalog

The `catalog/` directory contains:
- `index.json` - Master document catalog with metadata
- `concepts.json` - Concept map showing key ideas
- `relationships.json` - Cross-layer relationships and dependencies

## 🔍 Searching the Knowledge Base

### Simple Text Search
```bash
# Search all content
grep -r "CLISA field" si-systems-v5-knowledge-base/

# Search with context
rg "BrainFrameOS" -A 5 -B 5

# Interactive fuzzy search
fzf
```

### Structured Search (via scripts)
```bash
# Search by layer
node scripts/search.ts --layer 0 --query "field definitions"

# Search by concept
node scripts/search.ts --concept "identity-engine"

# Build concept relationships
node scripts/build-relationships.ts
```

## 🚀 Extraction Scripts

Located in `scripts/`:
- `extract-from-github.ts` - Fetch and parse documents from GitHub
- `build-catalog.ts` - Generate catalog and indexes
- `search.ts` - Local search interface
- `build-relationships.ts` - Map concept relationships

## 📊 Extraction Progress

Track extraction progress via Archon task: **P0-4: Deep Research - SI Systems v5 Repository Analysis**

### Phase 1: CLISA Framework (P0)
- [ ] Field definitions
- [ ] Activation conditions
- [ ] Field architecture documents
- [ ] Ontological framework
- [ ] Scope and classification

### Phase 2: SI Systems Philosophy (P0)
- [ ] 6 philosophy documents
- [ ] 9 purpose layer documents
- [ ] Trust primitives catalog

### Phase 3: BrainFrameOS Architecture (P1)
- [ ] System structure
- [ ] 7 core components
- [ ] Advanced capabilities
- [ ] Bootloader analysis

### Phase 4: Identity Engine (P1)
- [ ] Identity modules
- [ ] Configuration patterns
- [ ] Implementation examples

### Phase 5: Integration Analysis (P0)
- [ ] SI Systems v6 integration map
- [ ] ai-dev-standards orchestration guide
- [ ] Implementation roadmaps

## 🔗 Source Repository

All content extracted from: https://github.com/daffy0208/si-systems-v5

## 📝 Notes

- **Hybrid Approach**: Local markdown files for content + Archon MCP for task management
- **Version Control**: All content tracked via git
- **Searchability**: Initially grep/ripgrep, upgradeable to semantic search later
- **Portability**: 100% portable, not locked into any specific platform

## 🎯 Success Criteria

- [ ] 100+ documents extracted and organized
- [ ] All 5 layers complete with proper hierarchy
- [ ] Catalog built with cross-references
- [ ] Knowledge searchable via grep/ripgrep
- [ ] Integration analysis complete for both projects
- [ ] Documentation complete and maintainable

---

**Last Updated:** 2025-10-25
**Status:** In Progress - Phase 1 (CLISA Extraction)
