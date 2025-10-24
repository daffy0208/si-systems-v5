# Context-Aware Prompting Engine

## Purpose

The Prompting Engine generates **structured, adaptive prompts** that help AI models respond more accurately and respectfully to human inputs — without requiring model fine-tuning.

It acts as the **translation layer** between the user’s intent and the AI’s instruction language.

---

## Key Functions

- **Prompt Structuring**: Formats inputs using user-defined rules and tone profiles  
- **Context Injection**: Maintains memory of prior interactions, goals, and preferences  
- **Rhythm Awareness**: Adjusts verbosity, formality, or metaphor density based on user rhythm  
- **Scan Feedback Integration**: Dynamically updates prompts in response to signal scan outputs  
- **Identity Protection**: Prevents prompts from drifting into language or tone that distort the user's natural expression

---

## Prompt Pipeline Structure

Each prompt passes through a modular sequence:

1. **Intent Clarification**  
   Captures the user’s actual goal, not just the surface input

2. **Tone Calibration**  
   Applies tone rules (e.g., “neutral but assertive,” “reflective,” “direct”)

3. **Context Merge**  
   Injects relevant prior content from the session or user profile

4. **Output Safety Hints**  
   Adds signal-safe constraints: avoid misrepresentation, distortion, emotional flattening

5. **Model-Friendly Format**  
   Ensures final prompt is optimized for the LLM’s expected input shape

---

## Example

**User Input**:  
> “Can you rewrite this message so it doesn't sound so defensive?”

**Engine Output Prompt (to AI)**:  
> “Rewrite the following message to maintain its meaning while removing any defensive or apologetic tone. The user prefers a calm, self-assured tone. Avoid using passive constructions or over-justification.”

---

## Dynamic Adjustment (Example Scenario)

- If the Scan Engine flags that the model output included overly informal language, the Prompting Engine will adjust:
  - **Tone Settings**
  - **Vocabulary Constraints**
  - **Instruction Format**

This reduces iteration cycles and keeps outputs closer to the user’s intended style.

---

## Customization Hooks

| Hook Point         | Purpose                        |
|--------------------|--------------------------------|
| Tone Profile Loader| Load preset tone structures    |
| Identity Markers   | Inject user-specific patterns  |
| Context Pinner     | Anchor recurring terms/goals   |
| Style Gate         | Block informal or unsafe tone  |

---

## Technical Notes

- Works with any LLM (OpenAI, Claude, Mistral, local)  
- Prompt logic can be abstracted and piped through API or CLI  
- Supports “dual mode” structure: explicit instruction + structural goal in every prompt

---

## Related Modules

- `Scan_Engine.md` – Supplies real-time feedback that adjusts prompt tone or structure  
- `Output_Filter.md` – Enforces compliance with filtered tone and alignment rules  
- `Drift_Detection.md` – Flags tone or intent drift across longer sessions  
