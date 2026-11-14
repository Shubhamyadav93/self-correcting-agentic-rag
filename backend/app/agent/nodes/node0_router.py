import os
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from app.agent.state import GraphState


class DomainClassification(BaseModel):
    is_medical: bool = Field(
        description="True if the query relates to medicine, clinical guidelines, diseases, symptoms, drugs, diagnostics, or healthcare; False otherwise."
    )


def domain_router_node(state: GraphState) -> Dict[str, Any]:
    """
    Node 0: Clinical Domain Guardrail
    Blocks non-medical queries before triggering vector search or web fallback.
    """
    question = state.get("question", "").strip()
    print(f"\n--- [NODE 0: MEDICAL DOMAIN ROUTER] Checking Clinical Relevance: '{question}' ---")

    llm = ChatGroq(
        model=os.getenv("LLM_MODEL", "llama-3.1-8b-instant"),
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )
    structured_router = llm.with_structured_output(DomainClassification)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a strict medical triage guardrail. Classify whether the user's query is related "
            "to healthcare, clinical medicine, anatomy, pathology, pharmacology, symptoms, diagnosis, "
            "or medical guidelines. Return True ONLY for medical/clinical queries, and False for sports, "
            "entertainment, coding, politics, or general trivia.",
        ),
        ("human", "User Query: {question}"),
    ])

    try:
        result = (prompt | structured_router).invoke({"question": question})
        is_medical = result.is_medical
    except Exception:
        is_medical = True  # Fail-open for genuine medical queries on API hiccup

    if not is_medical:
        print("--> [BLOCKED] Non-medical query rejected at Clinical Domain Guardrail.")
        return {
            "is_medical": False,
            "generation": (
                "I am a specialized Clinical & Medical AI Assistant. I can only assist with "
                "medical guidelines, clinical conditions, diagnostics, and pharmacology queries."
            ),
            "hallucination_grade": "NON_MEDICAL_REFUSAL",
            "documents": [],
        }

    print("--> [PASSED] Query verified as Medical/Clinical -> Proceeding to Node 1.")
    return {"is_medical": True}

