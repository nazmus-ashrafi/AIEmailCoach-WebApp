# LangChain Streaming Implementation

## Overview

This document explains the new AI service layer that provides email classification and draft generation using LangChain with streaming support.

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (ClassifyIsland)              │
│  EventSource → /classify_email_stream   │
└────────────┬────────────────────────────┘
             │ SSE Stream
             ▼
┌─────────────────────────────────────────┐
│  FastAPI Router                         │
│  /api/emails/classify_email_stream      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  EmailClassificationService             │
│  (LangChain embedded)                   │
│  - classify_email()                     │
│  - generate_draft()                     │
│  - classify_and_draft_stream()          │
└─────────────────────────────────────────┘
```

## Files Created

### 1. `webapp/backend/ai/__init__.py`
Package initialization for AI service layer.

### 2. `webapp/backend/ai/config.py`
Feature flags for switching between AI backends:
- `LANGCHAIN` - Direct LangChain (current, embedded)
- `LANGGRAPH` - LangGraph embedded (legacy)
- `LANGGRAPH_SERVER` - LangGraph Server (future)

Set via environment variable:
```bash
export AI_BACKEND=langchain  # Default
```

### 3. `webapp/backend/ai/classification_service.py`
Main service class with three methods:

**`classify_email()`** - Blocking classification
```python
result = await service.classify_email(author, to, subject, email_thread)
# Returns: {"classification": "respond", "reasoning": "..."}
```

**`generate_draft()`** - Blocking draft generation
```python
draft = await service.generate_draft(author, to, subject, email_thread)
# Returns: "Dear Professor,\n\n..."
```

**`classify_and_draft_stream()`** - Streaming classification + draft
```python
async for event in service.classify_and_draft_stream(...):
    # Yields: {"event": "thinking", "data": {...}}
    # Yields: {"event": "classification", "data": {...}}
    # Yields: {"event": "draft_chunk", "data": {...}}
    # Yields: {"event": "complete", "data": {...}}
```

## API Endpoints

### New: `POST /api/emails/classify_email_stream/{email_id}`

Streams classification events via Server-Sent Events (SSE).

**Event Types:**
- `thinking` - Agent is analyzing email
- `classification` - Classification result ready
- `draft_start` - Beginning draft generation
- `draft_chunk` - Streaming draft text
- `complete` - Final result with all data
- `error` - Error occurred

**Example Response:**
```
event: thinking
data: {"message": "Analyzing email..."}

event: classification
data: {"classification": "respond", "reasoning": "Direct question from professor"}

event: draft_start
data: {"message": "Generating draft response..."}

event: draft_chunk
data: {"chunk": "Dear Professor,\n\n"}

event: draft_chunk
data: {"chunk": "Thank you for your email..."}

event: complete
data: {"classification": "respond", "reasoning": "...", "ai_draft": "Dear Professor..."}
```

### Existing: `POST /api/emails/classify_email`

Legacy endpoint using LangGraph (still works, no changes needed).

## Feature Flag Usage

The router automatically uses the backend specified in `AI_BACKEND` environment variable:

```python
from ai.config import AI_BACKEND, AIBackend

if AI_BACKEND == AIBackend.LANGCHAIN:
    # Use new streaming endpoint
    service = get_classification_service()
    
elif AI_BACKEND == AIBackend.LANGGRAPH:
    # Use legacy LangGraph
    result = await graph.ainvoke(state_input)
```

## Benefits

✅ **No infrastructure required** - Runs embedded in FastAPI  
✅ **Streaming support** - Real-time agent thoughts  
✅ **Fast deployment** - No Redis, Postgres, or separate services  
✅ **Backward compatible** - Old LangGraph code still works  
✅ **Easy to upgrade** - Can switch to LangGraph Server later  

## Next Steps

1. **Frontend**: Update ClassifyIsland to use EventSource
2. **Testing**: Test streaming with real emails
3. **Deployment**: Deploy to Render/Railway (single service)
4. **Future**: Migrate to LangGraph Server when needed

## Environment Variables

```bash
# AI Backend Selection
AI_BACKEND=langchain  # langchain | langgraph | langgraph_server

# OpenAI Configuration (already set)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

## Migration Path

**Current (MVP):**
```
FastAPI (with embedded LangChain) → Deploy as single service
```

**Future (if needed):**
```
FastAPI (proxy) → LangGraph Server (separate service with Redis/Postgres)
```

The code is structured to make this migration seamless - just change the `AI_BACKEND` environment variable and add LangGraph Server URL.
