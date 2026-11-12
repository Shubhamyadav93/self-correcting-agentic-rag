import time
from typing import Dict, Any, List
from app.agent.state import GraphState
from app.mcp_tools.mcp_search import get_medical_search_tool


def web_search_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 6: Web Search Fallback (Layer 4 LangGraph Orchestrator)
    Executes an authoritative live clinical search via DuckDuckGo when local 
    guidelines (ChromaDB) are missing, incomplete, or rejected by the LLM Judge.

    State Pipeline Connections:
    - Input From: Node 5 (Query Reformulator) -> receives optimized clinical search query.
    - Output Passes To: Node 3 (LLM Generation Engine) -> passes verified web context for synthesis.
    """
    question = (state.get("question") or state.get("query") or "").strip()
    existing_docs: List[Dict[str, Any]] = state.get("documents", [])
    retry_count = state.get("retry_count", 0)

    print(f"\n--- [NODE 6: WEB SEARCH FALLBACK] Querying Live Clinical Web for: '{question}' ---")

    # 1. Edge Case: Empty query check
    if not question:
        print("--> [WARNING] Empty search query received in web_search_node.")
        return {
            "documents": existing_docs,
            "web_search_needed": False,
        }

    start_time = time.perf_counter()
    normalized_web_docs: List[Dict[str, Any]] = []

    # 2. Resilient Execution of MCP Search Tool
    try:
        search_tool = get_medical_search_tool(max_results=3)
        raw_web_results = search_tool.search(query=question)

        # 3. Metadata Normalization for Downstream Synthesis & Citation Drawer
        for item in raw_web_results:
            if not isinstance(item, dict):
                continue

            content = item.get("content", "").strip()
            if not content:
                continue

            url = item.get("source") or item.get("url") or "Live Clinical Web Search"
            title = item.get("title") or "Clinical Guidance Reference"

            normalized_web_docs.append({
                "content": content,
                "title": title,
                "source": url,
                "page": "Web",
                "metadata": {
                    "source": url,
                    "title": title,
                    "type": "web_fallback",
                    "cycle": retry_count,
                },
                "score": 1.0,
            })

    except Exception as search_err:
        print(f"--> [ERROR] DuckDuckGo search execution failed gracefully: {search_err}")
        normalized_web_docs = []

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    total_new_results = len(normalized_web_docs)

    print(f"--> [WEB SEARCH COMPLETE] Retrieved {total_new_results} live clinical document(s) in {elapsed_ms:.1f}ms")

    # 4. Context Integration Strategy
    # Web search results replace irrelevant local chunks or augment the context pool
    combined_docs = normalized_web_docs if total_new_results > 0 else existing_docs

    # 5. Return updated GraphState payload
    return {
        "documents": combined_docs,
        "web_search_needed": False,
    }

