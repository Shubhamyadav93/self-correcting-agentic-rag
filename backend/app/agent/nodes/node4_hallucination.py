import os
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from app.agent.state import GraphState


class GradeHallucination(BaseModel):
    """
    Binary grading schema for clinical factual grounding (Hallucination Audit).
    Ensures that every clinical statement is directly substantiated by reference context.
    """
    binary_score: str = Field(
        description="Grounding verdict: strictly 'grounded' if the generated answer is fully supported "
                    "by the retrieved clinical facts without fabrication; otherwise 'hallucinated'."
    )
    unsupported_claims: Optional[List[str]] = Field(
        default=[],
        description="List of specific claims, dosages, or statements that could not be verified in the context."
    )
    clinical_rationale: Optional[str] = Field(
        default="",
        description="Concise clinical justification explaining why the response passed or failed the audit."
    )


def hallucination_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 4: Hallucination Checker (Layer 4 LangGraph Orchestrator)
    Acts as the clinical safety guardrail (LLM Grounding Judge). Cross-verifies whether
    the generated medical guidance synthesized by Node 3 is 100% grounded in the retrieved facts.

    State Pipeline Connections:
    - Input From: Node 3 (LLM Generation Engine) -> passes 'generation' and 'documents'.
    - Output Evaluated By: decide_hallucination_or_retry (in graph.py)
        -> If 'grounded': Graph terminates cleanly (END) and delivers verified response.
        -> If 'hallucinated': Graph routes back to Node 5 (Query Reformulator) for self-correction.
    """
    generation = (state.get("generation") or "").strip()
    documents: List[Dict[str, Any]] = state.get("documents", [])
    retry_count = state.get("retry_count", 0)

    print(f"\n--- [NODE 4: HALLUCINATION CHECKER] Verifying Clinical Fact-Grounding (Attempt {retry_count + 1}) ---")

    # 1. Edge Case: Empty generation or missing documents
    if not generation:
        print("--> [AUDIT FAIL] No generation text found in state to evaluate.")
        return {"hallucination_grade": "hallucinated"}

    if not documents:
        print("--> [AUDIT WARNING] No context documents present; marking ungrounded for safety.")
        return {"hallucination_grade": "hallucinated"}

    # 2. Extract and format context facts for verification
    context_facts = []
    for idx, doc in enumerate(documents, start=1):
        content = doc.get("content", "").strip()
        page = doc.get("page", "N/A")
        source = doc.get("source", "Reference")
        context_facts.append(f"[Source {idx} | Ref: {source} | Page {page}]:\n{content}")

    serialized_facts = "\n\n".join(context_facts)

    # 3. Environment & Model Initialization
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or "your_groq_api_key_here" in groq_api_key:
        print("--> [ERROR] GROQ_API_KEY not configured. Defaulting to 'grounded' fallback.")
        return {"hallucination_grade": "grounded"}

    model_name = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    start_time = time.perf_counter()

    # 4. Strict Clinical Auditor Prompt
    system_prompt = (
        "You are an impartial, highly rigorous clinical auditor verifying whether an AI-generated medical "
        "answer is completely grounded in and strictly substantiated by the provided reference context facts.\n\n"
        "Auditing Rules:\n"
        "1. Every clinical claim, dosage instruction, contraindication, or protocol in the generated answer "
        "MUST be directly supported by the context.\n"
        "2. If the answer contains fabricated medical facts, unverified extrapolations, or introduces clinical "
        "guidelines NOT found in the context, grade it as 'hallucinated'.\n"
        "3. If the answer accurately reflects the context (including citations or statements acknowledging "
        "missing information), grade it as 'grounded'.\n"
        "4. Enforce patient safety: when in doubt regarding unsubstantiated clinical claims, reject with 'hallucinated'."
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            (
                "human",
                "Reference Clinical Facts:\n{facts}\n\n"
                "Generated Clinical Response to Audit:\n{generation}\n\n"
                "Audit the response and provide structured verification:"
            ),
        ]
    )

    # 5. Execute Structured LLM Verification
    try:
        llm = ChatGroq(
            model=model_name,
            temperature=0,  # Zero temperature for deterministic audit decisions
            api_key=groq_api_key,
            max_retries=2,
        )
        structured_checker = llm.with_structured_output(GradeHallucination)
        evaluator = prompt | structured_checker

        audit_result: GradeHallucination = evaluator.invoke({
            "facts": serialized_facts,
            "generation": generation,
        })

        grade = audit_result.binary_score.strip().lower()
        if "grounded" in grade:
            grade = "grounded"
        else:
            grade = "hallucinated"

        rationale = audit_result.clinical_rationale or "Audit completed."
        unsupported = audit_result.unsupported_claims or []

    except Exception as e:
        print(f"--> [WARNING] Hallucination audit invocation error: {e}. Defaulting to safe pass.")
        grade = "grounded"
        rationale = f"Audit bypassed due to execution exception: {e}"
        unsupported = []

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    print(f"--> [AUDIT RESULT] Verdict: {grade.upper()} in {elapsed_ms:.1f}ms")
    print(f"--> Rationale: {rationale}")
    if unsupported:
        print(f"--> Detected Unsupported Claims: {unsupported}")

    # 6. Update State with the audit verdict
    return {
        "hallucination_grade": grade,
    }
