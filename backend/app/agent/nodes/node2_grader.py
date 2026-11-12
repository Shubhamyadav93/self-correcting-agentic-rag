import os
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from app.agent.state import GraphState


class GradeDocuments(BaseModel):
    """
    Binary grading schema for clinical context evaluation.
    Enforces deterministic 'yes' or 'no' decisions along with clinical rationale.
    """
    binary_score: str = Field(
        description="Relevance verdict: strictly 'yes' if document contains clinically relevant guidance, facts, or context, else 'no'."
    )
    reasoning: Optional[str] = Field(
        default="",
        description="Brief one-sentence clinical justification for the relevance verdict."
    )


def grade_documents_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 2: Context Quality Grader (LLM Judge)
    Assesses retrieved medical chunks using Groq Llama-3-70B. Filters out irrelevant 
    noise and dynamically triggers live web search fallback when context is insufficient.
    """
    question = (state.get("question") or state.get("query") or "").strip()
    documents: List[Dict[str, Any]] = state.get("documents", [])

    print(f"\n--- [NODE 2: CONTEXT QUALITY GRADER] Evaluating {len(documents)} Chunk(s) ---")

    # 1. Immediate Fallback if ChromaDB returned zero documents
    if not documents:
        print("--> [ALERT] Document list empty. Routing directly to Query Reformulator & Web Search.")
        return {
            "documents": [],
            "web_search_needed": True,
        }

    # 2. Authentication & Model Configuration Boundary
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or "your_groq_api_key_here" in groq_api_key:
        print("--> [CRITICAL ERROR] Valid GROQ_API_KEY not found in environment. Retaining chunks as fallback.")
        return {
            "documents": documents,
            "web_search_needed": False,
        }

    model_name = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    start_time = time.perf_counter()

    try:
        llm = ChatGroq(
            model=model_name,
            temperature=0,  # Zero temperature for deterministic clinical judgment
            api_key=groq_api_key,
            max_retries=2,
        )
        structured_llm_grader = llm.with_structured_output(GradeDocuments)

        system_prompt = (
            "You are a rigorous clinical medical reviewer evaluating whether a retrieved guideline "
            "chunk contains factual, therapeutic, diagnostic, or dosage information relevant to "
            "answering the user's clinical question.\n\n"
            "Rules:\n"
            "1. Grade 'yes' if the document contains relevant clinical guidance or context that helps answer the question.\n"
            "2. Grade 'no' if the document is completely irrelevant, off-topic, or lacks necessary clinical context.\n"
            "3. Provide a concise 1-sentence clinical reasoning."
        )

        grade_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                (
                    "human",
                    "Clinical Question:\n{question}\n\n"
                    "Retrieved Guideline Chunk (Source: {source}, Page: {page}):\n{document}\n\n"
                    "Evaluate relevance:"
                ),
            ]
        )

        evaluator = grade_prompt | structured_llm_grader

    except Exception as setup_err:
        print(f"--> [WARNING] Failed to initialize LLM Grader: {setup_err}. Retaining existing documents.")
        return {
            "documents": documents,
            "web_search_needed": False,
        }

    # 3. Individual Chunk Evaluation & Filtering
    filtered_docs: List[Dict[str, Any]] = []

    for idx, doc in enumerate(documents, start=1):
        content = doc.get("content", "").strip()
        page = doc.get("page", "N/A")
        source = doc.get("source", "Medical Guidelines")

        if not content:
            continue

        try:
            result: GradeDocuments = evaluator.invoke({
                "question": question,
                "document": content,
                "source": source,
                "page": page,
            })

            verdict = result.binary_score.strip().lower()
            reasoning = result.reasoning or "No specific reasoning provided."

            if "yes" in verdict:
                print(f"  [Chunk {idx} | Page {page}] -> GRADE: RELEVANT (YES) | Rationale: {reasoning}")
                filtered_docs.append(doc)
            else:
                print(f"  [Chunk {idx} | Page {page}] -> GRADE: IRRELEVANT (NO) | Rationale: {reasoning}")

        except Exception as eval_err:
            # Resilient fail-safe: API failure par document ko drop nahi karte, retain rakhte hain
            print(f"  [Chunk {idx}] Evaluation call failed ({eval_err}). Retaining chunk as safety fallback.")
            filtered_docs.append(doc)

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    web_search_needed = (len(filtered_docs) == 0)

    print(
        f"--> [GRADING COMPLETE] Retained {len(filtered_docs)}/{len(documents)} chunks "
        f"in {elapsed_ms:.1f}ms | Web Search Fallback Needed: {web_search_needed}"
    )

    return {
        "documents": filtered_docs,
        "web_search_needed": web_search_needed,
    }
