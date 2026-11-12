import os
import time
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from app.agent.state import GraphState


def generate_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 3: LLM Generation Engine (Layer 4 LangGraph Orchestrator)
    Synthesizes a clinically accurate, grounded response strictly using the
    retrieved documents (either from local ChromaDB or DuckDuckGo web search).

    State Pipeline Connections:
    - Inputs From:
        1. Node 2 (Context Quality Grader): When local vector chunks are sufficient.
        2. Node 6 (Web Search Fallback): When local context was missing/irrelevant.
    - Output Passes To:
        -> Node 4 (Hallucination Checker): To verify 100% clinical grounding before delivery.
    """
    question = (state.get("question") or state.get("query") or "").strip()
    documents: List[Dict[str, Any]] = state.get("documents", [])

    print(f"\n--- [NODE 3: LLM GENERATION ENGINE] Generating Response for: '{question}' ---")

    # 1. Edge Case: No context available from either Vector Store or Web Search
    if not documents:
        print("--> [WARNING] No documents found in state. Returning safe clinical fallback.")
        fallback_msg = (
            "I could not locate sufficiently verified clinical guidelines or external evidence "
            "to answer your question safely. Please consult official medical protocols or consult "
            "a certified clinical specialist."
        )
        return {
            "generation": fallback_msg,
            "documents": [],
            "question": question,
        }

    # 2. Authentication & Model Setup
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or "your_groq_api_key_here" in groq_api_key:
        error_msg = "Critical error: Valid GROQ_API_KEY not configured in backend/.env."
        print(f"--> [ERROR] {error_msg}")
        return {
            "generation": error_msg,
            "documents": documents,
            "question": question,
        }

    model_name = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    start_time = time.perf_counter()

    # 3. Context Serialization & Citation Mapping
    # Separates local PDF guideline chunks from live web search fallback results
    context_blocks = []
    for idx, doc in enumerate(documents, start=1):
        content = doc.get("content", "").strip()
        page = doc.get("page", "N/A")
        source = doc.get("source", "Guideline Document")

        # Distinguish between local file path/page and live internet URL
        if "http" in str(source):
            citation_tag = f"[Source {idx} | Web URL: {source}]"
        else:
            citation_tag = f"[Source {idx} | Document: {source} | Page: {page}]"

        context_blocks.append(f"{citation_tag}\n{content}")

    serialized_context = "\n\n" + ("=" * 40) + "\n\n".join(context_blocks) + "\n\n" + ("=" * 40)

    # 4. Strict Clinical Grounding Prompt
    system_prompt = (
        "You are an expert clinical medical AI assistant providing high-reliability "
        "decision support for healthcare professionals.\n\n"
        "Clinical Grounding Rules:\n"
        "1. Answer the clinical question relying STRICTLY and EXCLUSIVELY on the provided context.\n"
        "2. Do NOT extrapolate, speculate, or introduce unverified medical assumptions.\n"
        "3. Every medical recommendation, therapeutic dosage, or clinical intervention must explicitly cite "
        "its source (e.g., '[Source 1, Page 35]' or '[Web URL]').\n"
        "4. If certain clinical details are omitted from the context, explicitly state: "
        "'Based on the available documentation, information regarding [topic] is not specified.'\n"
        "5. Maintain an objective, concise, and structured clinical format (use bullet points and clear sections)."
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            (
                "human",
                "Clinical Reference Context:\n{context}\n\n"
                "Clinical Question:\n{question}\n\n"
                "Synthesized Clinical Guidance (with inline citations):"
            ),
        ]
    )

    # 5. LLM Synthesis Execution
    try:
        llm = ChatGroq(
            model=model_name,
            temperature=0.1,  # Low temperature for factual consistency with natural readability
            api_key=groq_api_key,
            max_retries=2,
        )

        rag_chain = prompt | llm
        response = rag_chain.invoke({
            "context": serialized_context,
            "question": question,
        })
        generated_text = response.content.strip()

    except Exception as e:
        print(f"--> [ERROR] LLM generation invocation failed: {e}")
        generated_text = (
            f"An error occurred while synthesizing the clinical response: {str(e)}. "
            "Please check backend LLM service connectivity."
        )

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    print(f"--> [GENERATION COMPLETE] Synthesized response in {elapsed_ms:.1f}ms")

    # 6. Return strictly matching GraphState schema for Node 4
    return {
        "generation": generated_text,
        "documents": documents,
        "question": question,
    }


