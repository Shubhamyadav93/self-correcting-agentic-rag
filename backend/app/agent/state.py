from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict


class GraphState(TypedDict):
    """
    Represents the operational state of the self-correcting medical RAG workflow.

    Attributes:
        question: Original clinical question asked by the user.
        generation: Current response synthesized by the LLM.
        documents: List of retrieved context chunks (from ChromaDB or live web search).
        web_search_needed: Flag set to True if retrieved context is irrelevant or empty.
        hallucination_grade: 'grounded' if factual to context, 'hallucinated' otherwise.
        answer_grade: 'useful' if it resolves clinical query, 'not useful' otherwise.
        retry_count: Counter to prevent infinite query refinement loops (max 2).
    """
    question: str
    generation: Optional[str]
    documents: List[Dict[str, Any]]
    web_search_needed: bool
    hallucination_grade: Optional[str]
    answer_grade: Optional[str]
    retry_count: int

