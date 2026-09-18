# 🏥: Self-Correcting Agentic RAG (Medical AI Assistant)

An enterprise-grade Clinical AI Assistant powered by an **Agentic Self-Correction State Machine**. It resolves factual hallucinations and knowledge retrieval failures in traditional RAG through multi-level validation loops and authoritative clinical web fallbacks.

---

## 📌 Project Overview
* **Domain:** Healthcare & Clinical Decision Support
* **Orchestration:** LangGraph (Stateful Directed Cyclic Graph)
* **LLM Engine:** Groq API (Meta Llama-3-70B)
* **Vector Store:** ChromaDB (HNSW Persistent Indexing)
* **Embeddings:** HuggingFace (`all-MiniLM-L6-v2` - 384 dimensions)
* **Tooling & Protocols:** Model Context Protocol (MCP), DuckDuckGo Search API
* **Frontend:** Streamlit Interactive UI

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. USER LAYER (Streamlit UI)                                                           │
│    • PDF Document Upload                                                               │
│    • User Query Input                                                                  │
│    • Streamlit Interactive UI State Display (Real-time Status)                         │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. SYSTEM LAYER (Backend Ingestion)                                                    │
│    • PyPDF Loader & Parser ──► Recursive Text Splitter ──► Embedding Engine (HF)       │
│    • ChromaDB (Persistent Vector Store)                                                │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │    
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. AI AGENT LAYER (LangGraph Orchestrator)                                             │
│                                                                                        │
│    [ 1. Vector Retrieval ] (Query ChromaDB)                                            │
│              │                                                                         │
│              ▼                                                                         │
│    [ 2. Context Quality Grader (LLM Judge) ]                                           │
│              │                                                                         │
│     (Context Sufficient?)                                                              │
│        ├──► YES ──► [ 3. LLM Generation (Llama-3) ]                                    │
│        │                     │                                                         │
│        │                     ▼                                                         │
│        │            [ 4. Hallucination Checker ] ──► (Pass) ──► Output Layer           │
│        │                                                                               │
│        └──► NO  ──► [ 5. Query Reformulator ] (Agent Rewrite)                          │
│                              │                                                         │
│                              ▼                                                         │
│                    [ 6. Web Search Fallback (DuckDuckGo) ]                             │
│                              │                                                         │
│                              └────────► (Loop to Generation Node)                      │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
                                       ▼ 
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. OUTPUT & METRICS LAYER                                                              │
│    • Verified Final Response                                                           │
│    • Groundedness & Source Citation                                                    │
│    • Agent Execution State Logs (Latency, Fallback Metrics)                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
