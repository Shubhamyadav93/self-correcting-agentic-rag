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


                                                      <!-- Folder Structure -->

self-correcting-agentic-rag/
│
├── backend/
│   ├── venv/                                # Isolated Python virtual environment (macOS bin/)
│   ├── data/
│   │   ├── raw_documents/                   # Clinical guideline PDFs (Uploaded via UI)
│   │   ├── chroma_db/                       # [DATABASE 1: VECTOR DB] ChromaDB HNSW Persistent Vector Index
│   │   └── clinical_records.db              # [DATABASE 2: RELATIONAL SQL DB] SQLite File (Chat history, Audit & Metrics)
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                          # FastAPI App, CORS config, lifespan events & routing
│   │   ├── config.py                        # Settings (Groq API, HF Model, DB URLs, Chunk Size=500/50)
│   │   │
│   │   ├── db/                              # [RELATIONAL SQL DATABASE LAYER - SQLAlchemy]
│   │   │   ├── __init__.py
│   │   │   ├── session.py                   # SQLite engine, sessionmaker & get_db dependency
│   │   │   ├── models.py                    # SQL Tables (Conversations, QueryLogs, HallucinationAudits, LatencyMetrics)
│   │   │   └── crud.py                      # CRUD operations (save chat, log loop iterations, fetch metrics)
│   │   │
│   │   ├── ingestion/                       # [LAYER 2: SYSTEM LAYER - Ingestion & Storage]
│   │   │   ├── __init__.py
│   │   │   ├── pdf_loader.py                # PyPDF Loader & document parsing
│   │   │   ├── text_splitter.py             # Recursive Text Splitter (500 chunk_size, 50 chunk_overlap)
│   │   │   ├── embeddings.py                # HuggingFace Embedding Engine (all-MiniLM-L6-v2 / 384-dim)
│   │   │   └── vector_store.py              # ChromaDB client initialization & embedding persistence
│   │   │
│   │   ├── mcp_tools/                       # [LAYER 3: MODEL CONTEXT PROTOCOL (MCP) INTERFACE]
│   │   │   ├── __init__.py
│   │   │   ├── mcp_retriever.py             # MCP ChromaDB Retriever Tool (Vector Query / Top-k Chunks)
│   │   │   └── mcp_search.py                # MCP DuckDuckGo Search Tool (Live Medical Search Fallback)
│   │   │
│   │   ├── agent/                           # [LAYER 4: AI AGENT LAYER - LangGraph Cyclic Orchestrator]
│   │   │   ├── __init__.py 
│   │   │   ├── state.py                     # GraphState (query, documents, answer, loop_count, citations, db_log_id)
│   │   │   ├── nodes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── node1_retriever.py       # Node 1: Vector Retrieval from ChromaDB
│   │   │   │   ├── node2_grader.py          # Node 2: Context Quality Grader (LLM Judge: sufficient?)
│   │   │   │   ├── node3_generator.py       # Node 3: LLM Generation Engine (Groq Llama-3-70B)
│   │   │   │   ├── node4_hallucination.py   # Node 4: Hallucination Checker (Grounding Evaluation)
│   │   │   │   ├── node5_reformulator.py    # Node 5: Autonomous Medical Query Reformulator
│   │   │   │   └── node6_web_search.py      # Node 6: DuckDuckGo Live Search Fallback
│   │   │   └── graph.py                     # LangGraph workflow compilation, cyclic edges & state transitions
│   │   │
│   │   ├── api/                             # FastAPI Endpoints
│   │   │   ├── __init__.py
│   │   │   ├── routes_ingest.py             # POST /api/v1/upload (PDF Ingestion & ChromaDB sync)
│   │   │   ├── routes_chat.py               # POST /api/v1/query (Agent Execution, SSE stream & SQL history logging)
│   │   │   └── routes_metrics.py            # GET /api/v1/metrics (Fetches audit logs & latency stats from SQL DB)
│   │   │
│   │   ├── models/                          # Pydantic Schemas (API Data Validation)
│   │   │   ├── __init__.py
│   │   │   ├── schemas_request.py           # QueryRequest, IngestRequest
│   │   │   └── schemas_response.py          # GroundedResponse, CitationItem, AuditMetricResponse
│   │   │
│   │   └── metrics/                         # [LAYER 5: OUTPUT & METRICS LAYER - Observability Tracker]
│   │       ├── __init__.py
│   │       └── tracker.py                   # Execution timer, Re-query counter, Citation verifier -> SQL recorder
│   │
│   ├── .env                                 # GROQ_API_KEY, SQLITE_URL, ENVIRONMENT
│   ├── .gitignore
│   └── requirements.txt                     # fastapi, uvicorn, langgraph, chromadb, sqlalchemy, sentence-transformers
│
└── frontend/                                # [LAYER 1: USER LAYER - React UI]
    ├── public/                              # Medical logos, Favicon
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Navbar.jsx                   # Dashboard Header, DB status indicators (ChromaDB + SQLite)
    │   │   ├── PdfUploadModal.jsx           # Guideline PDF file upload & ingestion progress bar
    │   │   ├── ChatInterface.jsx            # Doctor clinical query feed & interactive chat stream
    │   │   ├── AgentStateTracer.jsx         # Real-time state visualization (Node 1 to Node 6 active steps)
    │   │   ├── GroundedResponseCard.jsx     # 100% Grounded clinical answer display with safety alerts
    │   │   ├── CitationDrawer.jsx           # Source guideline citations, page references & similarity scores
    │   │   └── MetricsDashboard.jsx         # Latency trends, SQL log inspector, Hallucination Pass/Fail graphs
    │   │
    │   ├── services/
    │   │   ├── api.js                       # Axios HTTP endpoints (Chat, PDF Upload, System Metrics)
    │   │   └── socketOrSSE.js               # EventSource / SSE connection for live LangGraph node streaming
    │   │
    │   ├── App.jsx                          # Main clinical workbench grid layout
    │   ├── main.jsx                         # React virtual DOM entry
    │   └── index.css                        # Tailwind CSS design system 
    │
    ├── package.json 
    ├── vite.config.js
    └── tailwind.config.js


