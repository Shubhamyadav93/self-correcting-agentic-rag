from dotenv import load_dotenv
load_dotenv() 

from langgraph.graph import StateGraph, END
from app.agent.state import GraphState
from app.agent.nodes.node1_retriever import retrieve_node
from app.agent.nodes.node2_grader import grade_documents_node
from app.agent.nodes.node3_generator import generate_node
from app.agent.nodes.node4_hallucination import hallucination_node
from app.agent.nodes.node5_reformulator import reformulate_node
from app.agent.nodes.node6_web_search import web_search_node


def decide_to_generate(state: GraphState) -> str:
    """
    Conditional Edge: Checks if context is sufficient or if web fallback is needed.
    """
    if state.get("web_search_needed", False):
        print("--> Routing: Context insufficient -> Reformulate Query for Web Search")
        return "reformulate"
    print("--> Routing: Context sufficient -> Generate Response")
    return "generate"


def decide_hallucination_or_retry(state: GraphState) -> str:
    """
    Conditional Edge: Evaluates hallucination check and loop thresholds.
    """
    grade = state.get("hallucination_grade", "grounded")
    retries = state.get("retry_count", 0)

    if grade == "grounded":
        print("--> Verification Passed: 100% Grounded Clinical Response -> END")
        return "grounded"

    if retries >= 2:
        print("--> Max retries reached (2). Terminating loop to prevent infinite cycle -> END")
        return "grounded"

    print(f"--> Hallucination detected (Retry {retries + 1}/2) -> Routing to Reformulate")
    return "hallucinated"


def build_medical_agent():
    """
    Constructs and compiles the Self-Correcting Medical RAG LangGraph workflow.
    """
    workflow = StateGraph(GraphState)

    # Register Nodes
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade_documents", grade_documents_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("hallucination_check", hallucination_node)
    workflow.add_node("reformulate", reformulate_node)
    workflow.add_node("web_search", web_search_node)

    # Entry point
    workflow.set_entry_point("retrieve")

    # Connect Edges
    workflow.add_edge("retrieve", "grade_documents")

    workflow.add_conditional_edges(
        "grade_documents",
        decide_to_generate,
        {
            "reformulate": "reformulate",
            "generate": "generate",
        },
    )

    workflow.add_edge("reformulate", "web_search")
    workflow.add_edge("web_search", "generate")
    workflow.add_edge("generate", "hallucination_check")

    workflow.add_conditional_edges(
        "hallucination_check",
        decide_hallucination_or_retry,
        {
            "grounded": END,
            "hallucinated": "reformulate",
        },
    )

    return workflow.compile()


# Singleton compiled graph instance
medical_agent_app = build_medical_agent()

