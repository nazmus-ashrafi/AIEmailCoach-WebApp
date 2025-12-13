"""
AI Service Configuration

Feature flags and configuration for switching between AI backends.
"""

import os
from enum import Enum


class AIBackend(str, Enum):
    """Available AI backends"""
    LANGCHAIN = "langchain"  # Direct LangChain (embedded, fast)
    LANGGRAPH = "langgraph"  # LangGraph embedded (current implementation)
    LANGGRAPH_SERVER = "langgraph_server"  # LangGraph Server (future)


# Feature flag: Which backend to use
# Set via environment variable: AI_BACKEND=langchain|langgraph|langgraph_server
AI_BACKEND = AIBackend(os.getenv("AI_BACKEND", "langchain"))

# LangGraph Server URL (only used if AI_BACKEND=langgraph_server)
LANGGRAPH_SERVER_URL = os.getenv("LANGGRAPH_SERVER_URL", "http://localhost:8123")
