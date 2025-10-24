# Archon + AI-Dev-Standards Integration Strategy

**Date:** 2025-10-24
**Status:** Integration Complete ✅
**Purpose:** Optimal development workflow for SI Systems project

---

## Executive Summary

This document defines how Archon MCP Server and AI-Dev-Standards Skills work together to create an optimal development environment for the SI Systems project.

**Key Insight:** These are complementary systems forming a two-layer architecture:
- **Archon** = Strategic orchestration layer (WHAT to build, WHEN, tracking progress)
- **Skills** = Tactical execution layer (HOW to build it well, domain expertise)

---

## The Integrated Architecture

```
┌─────────────────────────────────────────────────┐
│         ARCHON MCP SERVER                       │
│         (Strategic Layer)                       │
│  • Project management                           │
│  • Task tracking & prioritization               │
│  • Knowledge queries (RAG)                      │
│  • Code example search                          │
│  • Progress tracking                            │
└──────────────────┬──────────────────────────────┘
                   │ invokes when needed
                   ↓
┌─────────────────────────────────────────────────┐
│      AI-DEV-STANDARDS SKILLS                    │
│      (Tactical Layer)                           │
│  • Domain-specific expertise                    │
│  • Implementation patterns                      │
│  • Quality standards                            │
│  • Best practices                               │
└─────────────────────────────────────────────────┘
```

---

## Three-Phase Workflow

### Phase 1: Strategic Planning (Archon)

```
1. Get next priority task from Archon
2. Conduct Archon research (RAG queries + code examples)
3. Update task status to "doing"
```

### Phase 2: Tactical Execution (Skills)

```
4. Identify required domain expertise
5. Invoke relevant skill(s) for implementation guidance
6. Implement following both Archon research + Skill guidance
```

### Phase 3: Quality Validation (Dual Check)

```
7. Apply quality skill checks (testing, security, performance, a11y)
8. Update Archon task to "review"
9. After user validation → mark "done"
10. Get next task and repeat
```

---

## SI Systems Phase 2: Task-to-Skill Mapping

| Task | Priority | Skills to Use |
|------|----------|---------------|
| **Enhance NLP Analysis** | P0 | `rag-implementer`, `performance-optimizer` |
| **Add Performance Benchmarks** | P0 | `performance-optimizer`, `testing-strategist` |
| **Build Visualization Dashboard** | P1 | `frontend-builder`, `visual-designer`, `data-visualizer`, `ux-designer` |
| **API Integration Adapters** | P1 | `api-designer`, `security-engineer`, `testing-strategist` |
| **Conversation History Persistence** | P1 | `data-engineer`, `performance-optimizer` |
| **Advanced Filter Configuration** | P2 | `api-designer`, `ux-designer` |
| **Multi-User Support** | P2 | `security-engineer`, `api-designer`, `data-engineer` |
| **Documentation Expansion** | P2 | `technical-writer`, `ux-designer` |

---

## Quick Reference: Skill Selection

**By Task Type:**
- Frontend/UI → `frontend-builder`, `visual-designer`, `ux-designer`
- API Development → `api-designer`, `security-engineer`
- Performance → `performance-optimizer`
- Testing → `testing-strategist`, `security-engineer`
- RAG/Knowledge → `rag-implementer`, `knowledge-graph-builder`
- Data/Analytics → `data-engineer`, `data-visualizer`
- Documentation → `technical-writer`
- Strategy/MVP → `mvp-builder`, `product-strategist`

**By Quality Concern:**
- Security → `security-engineer`
- Performance → `performance-optimizer`
- Accessibility → `accessibility-engineer`
- Testing → `testing-strategist`

**By Project Phase:**
- Discovery → `product-strategist`, `user-researcher`
- Design → `ux-designer`, `visual-designer`, `api-designer`
- Implementation → `frontend-builder`, `api-designer`, `data-engineer`
- Quality → `testing-strategist`, `security-engineer`, `performance-optimizer`
- Launch → `deployment-advisor`, `go-to-market-planner`, `technical-writer`

---

## Anti-Patterns to Avoid

❌ **Skip Archon for task management**
- Violates ARCHON-FIRST RULE
- Loses project coherence

❌ **Use Skills without Archon context**
- No alignment with project priorities
- No tracking

❌ **Invoke too many skills at once**
- Information overload
- Limit: 2-3 skills per task

❌ **Rely only on Archon OR only on Skills**
- Need BOTH for optimal results

---

## Success Patterns

✅ **Archon-First, Skills-Enhanced**
```
Get task from Archon → Research with Archon →
Invoke relevant skills → Implement with combined insights →
Quality check with skills → Update Archon
```

✅ **Two-Stage Research**
```
Archon research (general understanding) →
Skill guidance (specific implementation) →
Combined optimal solution
```

✅ **Progressive Skill Invocation**
```
Primary skills (implementation) →
Quality skills (verification) →
Specialist skills (specific concerns)
```

---

## Example: Building Visualization Dashboard

**Task from Archon:** "Build Visualization Dashboard" (P1)

### Phase 1: Archon Research
```
• archon:perform_rag_query("React real-time data visualization")
• archon:search_code_examples("dashboard component React TypeScript")
• Result: General patterns, library comparisons
```

### Phase 2: Skills Consultation
```
• frontend-builder → React/Next.js architecture
• data-visualizer → Chart types and color coding
• visual-designer → Design system integration
```

### Phase 3: Quality Check
```
• accessibility-engineer → ARIA labels, keyboard nav
• performance-optimizer → Rendering performance
• archon:manage_task(status="review")
```

---

## Benefits of Integration

1. **Strategic Coherence** - All work aligns with project goals (Archon)
2. **Tactical Excellence** - Domain-specific best practices (Skills)
3. **Compound Intelligence** - Archon provides "what/why", Skills provide "how/how well"
4. **Quality Assurance** - Multi-layer validation
5. **Knowledge Accumulation** - Learning compounds over time

---

## Implementation Status

### Completed ✅

- [x] Archon MCP Server added to configuration
- [x] AI-Dev-Standards Skills integrated (40+ available)
- [x] Comprehensive workflow documentation created
- [x] Task-to-skill mapping for SI Systems Phase 2
- [x] Decision matrices and guidelines documented
- [x] Example sessions provided
- [x] Anti-patterns and success patterns defined

### Next Steps

1. **Sync Archon Project:**
   - Update existing SI Systems project in Archon
   - Mark Phase 1 tasks as complete
   - Add Phase 2 tasks with skill mappings
   - Update RCI score to 75/100

2. **Begin Phase 2 Development:**
   - Follow integrated workflow for each task
   - Start with P0: "Enhance NLP Analysis"
   - Use `rag-implementer` + `performance-optimizer` skills

3. **Iterate and Refine:**
   - Track effectiveness of integration
   - Adjust skill selections as needed
   - Document learnings

---

## Quick Start

**To use the integrated workflow:**

```bash
# 1. Check Archon for next task
archon:manage_task(action="list", filter_by="status", filter_value="todo")

# 2. Get task details
archon:manage_task(action="get", task_id="[task_id]")

# 3. Research with Archon
archon:perform_rag_query(query="[relevant topic]", match_count=5)
archon:search_code_examples(query="[implementation pattern]", match_count=3)

# 4. Update to doing
archon:manage_task(action="update", task_id="[task_id]", update_fields={"status": "doing"})

# 5. Invoke relevant skill(s)
# (Based on task-to-skill mapping above)

# 6. Implement with combined guidance

# 7. Quality check with appropriate skills

# 8. Mark for review
archon:manage_task(action="update", task_id="[task_id]", update_fields={"status": "review"})

# 9. After user approval → mark done
archon:manage_task(action="update", task_id="[task_id]", update_fields={"status": "done"})

# 10. Repeat
```

---

## References

- **Full Documentation:** `CLAUDE.md` (Section: "AI-Dev-Standards Skills Integration")
- **Archon Project:** http://localhost:3737/projects/d1376a0f-5584-4570-ac1b-0f981ecd3629
- **Phase 1 Status:** `ARCHON_PROJECT_UPDATE.md`
- **Skills Catalog:** `.claude/CLAUDE.md` (40+ skills with descriptions)

---

## Contact & Support

For questions about this integration:
- Review the comprehensive workflow in `CLAUDE.md`
- Check the example session for "Enhance NLP Analysis"
- Refer to task-to-skill mapping for guidance
- Follow the three-phase workflow pattern

**Remember:** Archon manages WHAT to build, Skills guide HOW to build it well. Together they create optimal outcomes.
