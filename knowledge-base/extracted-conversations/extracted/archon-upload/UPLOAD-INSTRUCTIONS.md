# Archon RAG Upload Instructions

## Automated Upload (Recommended)

Use Archon MCP tools to upload all batches:

```bash
# Using Archon MCP server
mcp__archon__rag_upload_batch("./archon-upload/batch_1.json")
mcp__archon__rag_upload_batch("./archon-upload/batch_2.json")
# ... repeat for all batches
```

## Batch Upload Script

Or use this script to upload all batches:

```typescript
import { mcp__archon__rag_upload_batch } from '@archon/mcp';

async function uploadAllBatches() {
  const batchFiles = fs.readdirSync('./archon-upload')
    .filter(f => f.startsWith('batch_') && f.endsWith('.json'));

  for (const batchFile of batchFiles) {
    console.log(`Uploading ${batchFile}...`);
    const batch = JSON.parse(fs.readFileSync(`./archon-upload/${batchFile}`, 'utf-8'));
    await mcp__archon__rag_upload_batch(batch);
    console.log(`✅ ${batchFile} uploaded`);
  }
}

uploadAllBatches();
```

## Manual Upload via Archon MCP

1. Open Archon MCP interface
2. Navigate to RAG Knowledge Base section
3. Select "Upload Batch"
4. Upload each batch file from `./archon-upload/`

## Verify Upload

After upload, verify with test queries:

```typescript
// Test conversation retrieval
mcp__archon__rag_search_knowledge_base({
  query: "What is BrainFrameOS?",
  match_count: 5
});

// Test documentation retrieval
mcp__archon__rag_search_knowledge_base({
  query: "CLISA AI risk framework",
  match_count: 3
});

// Test concept search
mcp__archon__rag_search_knowledge_base({
  query: "Sapien Intelligence architecture",
  match_count: 5
});
```

## Configuration

Recommended RAG settings:
- Embedding Model: text-embedding-3-small or text-embedding-3-large
- Chunk Size: 1000 tokens (already chunked by conversation parser)
- Similarity Threshold: 0.7
- Max Results: 10

## Next Steps

1. Upload all batches
2. Wait for embedding generation (may take 10-30 minutes for 718 files)
3. Verify retrieval with test queries
4. Enable semantic search in your application
