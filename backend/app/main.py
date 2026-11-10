from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.mcp_tools.mcp_retriever import get_medical_retriever
from app.mcp_tools.mcp_search import get_medical_search_tool

app = FastAPI(
    title="Self-Correcting Medical RAG Agent API",
    version="1.0.0",
    description="FastAPI Backend for Medical Guidelines RAG Agent"
)

# CORS configuration for Frontend/Dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global tool instances (Lazy Loaded)
_retriever_tool = None
_search_tool = None


def get_retriever():
    global _retriever_tool
    if _retriever_tool is None:
        _retriever_tool = get_medical_retriever(top_k=3)
    return _retriever_tool


def get_search():
    global _search_tool
    if _search_tool is None:
        _search_tool = get_medical_search_tool(max_results=2)
    return _search_tool


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Medical RAG Agent API",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/test-retrieval")
def test_retrieval(query: str = Query(..., description="Enter clinical query (e.g. corticosteroids severe covid)")):
    """
    Instant retrieval endpoint to test ChromaDB vector store.
    """
    try:
        retriever = get_retriever()
        results = retriever.retrieve(query=query)
        return {
            "query": query,
            "total_matches": len(results),
            "matches": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-search")
def test_search(query: str = Query(..., description="Enter query for live web fallback")):
    """
    Live web search fallback test endpoint via DuckDuckGo.
    """
    try:
        searcher = get_search()
        results = searcher.search(query=query)
        return {
            "query": query,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

