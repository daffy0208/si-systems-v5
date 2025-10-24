# System Integration Guide

This document outlines how to integrate the identity-safe, alignment-preserving framework into your existing AI workflows.

The system is designed to operate **around** any large language model — with no fine-tuning or retraining required.

---

## Supported Model APIs (Out of the Box)

- OpenAI (GPT-4 / GPT-4o / GPT-3.5)  
- Anthropic Claude (2 / 3 family)  
- Mistral / Mixtral (via HuggingFace or OpenRouter)  
- Local LLMs (e.g., llama.cpp, Ollama, vLLM backends)  
- OpenRouter / LM Studio / Poe (with middleware layer)

---

## Integration Options

### 1. **Runtime I/O Wrapping**

**Best For**: Direct use with OpenAI/Claude API sessions or chat UI tools.

**Architecture**:

User Input
↓
[Prompting Engine]
↓
LLM API Call (any model)
↓
[Scan + Filter Layer]
↓
Response to User


You can implement this with:
- Node.js middleware (e.g., Express)
- Python FastAPI wrappers
- Plugin architecture for LangChain or Semantic Kernel
- n8n/Make API orchestrators

---

### 2. **CLI or Batch Mode**

**Best For**: Generating and reviewing structured outputs offline.

**Steps**:
1. Store prompt/output history in flat files or vector DB
2. Run scan + drift detection on results
3. Manually or programmatically clean and align outputs
4. Push cleaned outputs to final delivery system

---

## Environment Variables (Suggested)

| Variable Name         | Description |
|------------------------|-------------|
| `MODEL_API_URL`        | Endpoint for OpenAI / Claude / Mistral, etc |
| `PROMPTING_ENGINE_MODE`| Basic / Advanced / Role-tuned |
| `OUTPUT_FILTER_LEVEL`  | Low / Medium / Strict |
| `DRIFT_THRESHOLD`      | Float value, default 0.65 |
| `TONE_PROFILE_PATH`    | Path to custom tone JSON file |

---

## Integration Hooks by Module

| Module           | Hook Description |
|------------------|------------------|
| Prompting Engine | Add before API call – rewrites user input |
| Scan Engine      | Add after LLM call – evaluates AI output |
| Output Filter    | Wrap API return – block or clean |
| Drift Detector   | Optional async process or log analysis layer |

---

## Logging & Auditing

For full traceability and analysis:
- Log user input, prompt, model raw output, final output
- Capture scan scores, drift alerts, and any filtered phrases
- Store anonymized session maps for later review

Logging Format Recommendation:  
- JSON line-per-interaction  
- Use UTC timestamps + hashed user/session ID  
- Include scoring details per output field

---

## Example: Express.js Integration Snippet

```js
app.post("/ask", async (req, res) => {
  const input = req.body.message;
  const prompt = await generatePrompt(input); // Prompting Engine
  const modelOutput = await callLLMAPI(prompt); // LLM Call
  const filtered = await scanAndFilter(modelOutput); // Scan + Filter
  res.send({ response: filtered });
});
