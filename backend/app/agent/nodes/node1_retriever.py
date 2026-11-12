import time
from typing import Dict, Any, List
from app.agent.state import GraphState
from app.mcp_tools.mcp_retriever import get_medical_retriever

def retrieve_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 1: Vector Retrieval (Layer 4 LangGraph Orchestrator)
    Queries local ChromaDB vector store via MCP retriever tool to extract top-k 
    clinical guideline chunks with citations, page references, and similarity metadata.
    """
    # 1. Query Normalization & Validation (Handles key variations and whitespace)
    raw_question = state.get("question") or state.get("query") or ""
    question = raw_question.strip()

    print(f"\n--- [NODE 1: RETRIEVAL] Querying Vector Store for: '{question}' ---")

    if not question:
        print("--> [WARNING] Empty clinical query received in retrieve_node.")
        return {
            "documents": [],
            "question": "",
            "retry_count": state.get("retry_count", 0),
            "web_search_needed": True,
        }

    start_time = time.perf_counter()
    retrieved_docs: List[Dict[str, Any]] = []

    # 2. Resilient Retrieval with Exception Boundary
    try:
        retriever = get_medical_retriever(top_k=3)
        raw_docs = retriever.retrieve(query=question)

        # 3. Citation & Metadata Normalization for Downstream Nodes
        for doc in raw_docs:
            if not isinstance(doc, dict):
                continue

            content = doc.get("content", "").strip()
            if not content:
                continue

            metadata = doc.get("metadata", {})
            page = metadata.get("page") or doc.get("page") or "N/A"
            source = metadata.get("source") or doc.get("source") or "WHO Clinical Guidelines"

            retrieved_docs.append({
                "content": content,
                "metadata": metadata,
                "page": page,
                "source": source,
                "score": doc.get("score", 0.0),
            })

    except Exception as e:
        # ChromaDB index read ya SQLite lock failure par whole pipeline crash nahi hogi
        print(f"--> [ERROR] ChromaDB retrieval failed gracefully: {e}")
        retrieved_docs = []

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    doc_count = len(retrieved_docs)
    web_needed = (doc_count == 0)

    print(f"--> Retrieved {doc_count} chunk(s) in {elapsed_ms:.1f}ms | Web Fallback Needed: {web_needed}")

    return {
        "documents": retrieved_docs,
        "question": question,
        "retry_count": state.get("retry_count", 0),
        "web_search_needed": web_needed,
    }

