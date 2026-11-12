import os
import time
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from app.agent.state import GraphState


def reformulate_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 5: Query Reformulator (Layer 4 LangGraph Orchestrator)
    Autonomously transforms colloquial or ambiguous medical queries into high-precision,
    clinically optimized search queries suitable for web engines and clinical literature.

    State Pipeline Connections:
    - Triggered By:
        1. Node 2 (Context Quality Grader): When local ChromaDB context is insufficient/empty.
        2. Node 4 (Hallucination Checker): When generated response failed factual grounding audit.
    - Output Passes To:
        -> Node 6 (Web Search Fallback): Executes live clinical search using reformulated query.
    """
    raw_question = (state.get("question") or state.get("query") or "").strip()
    retry_count = state.get("retry_count", 0)

    print(f"\n--- [NODE 5: QUERY REFORMULATOR] Optimizing Clinical Query (Cycle {retry_count + 1}) ---")
    print(f"--> Input Query: '{raw_question}'")

    # 1. Edge Case: Empty question validation
    if not raw_question:
        print("--> [WARNING] Empty question in reformulate_node. Applying default clinical fallback.")
        return {
            "question": "clinical guideline management protocols",
            "retry_count": retry_count + 1,
        }

    # 2. Authentication Boundary
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or "your_groq_api_key_here" in groq_api_key:
        print("--> [ERROR] GROQ_API_KEY not configured. Retaining original query as fallback.")
        return {
            "question": raw_question,
            "retry_count": retry_count + 1,
        }

    model_name = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    start_time = time.perf_counter()

    # 3. Medical Keyword & Entity Optimization System Prompt
    system_prompt = (
        "You are an expert clinical query reformulator specializing in web search optimization.\n"
        "Convert the user query into high-precision search keywords.\n\n"
        "Rules:\n"
        "1. Extract core clinical entities (diseases, drugs, treatment protocols).\n"
        "2. Return ONLY 4 to 6 plain text keywords separated by single spaces.\n"
        "3. Do NOT use boolean operators (AND, OR), quotes, parentheses, or [MeSH] tags.\n"
        "4. Strip all conversational filler and punctuation.\n"
        "5. Output STRICTLY the space-separated keywords and nothing else."
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            (
                "human",
                "Original Clinical Query:\n{question}\n\n"
                "Optimized Clinical Search Query:"
            ),
        ]
    )

    # 4. LLM Query Refinement Execution
    try:
        llm = ChatGroq(
            model=model_name,
            temperature=0.2,  # Low temperature to keep focus on relevant keywords
            api_key=groq_api_key,
            max_retries=2,
        )

        chain = prompt | llm
        response = chain.invoke({"question": raw_question})
        
        # Clean formatting artifacts (quotes, spaces, backticks)
        reformulated_query = response.content.strip().strip('"\'`')

        if not reformulated_query:
            reformulated_query = raw_question

    except Exception as e:
        print(f"--> [WARNING] Query reformulation call failed: {e}. Retaining original query.")
        reformulated_query = raw_question

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    new_retry_count = retry_count + 1

    print(f"--> [REFORMULATION COMPLETE] Refined in {elapsed_ms:.1f}ms: '{reformulated_query}'")
    print(f"--> Incremented retry_count: {new_retry_count}")

    # 5. Return updated state with incremented cycle counter
    return {
        "question": reformulated_query,
        "retry_count": new_retry_count,
    }
