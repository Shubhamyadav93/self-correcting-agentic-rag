import os
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from app.ingestion.vector_store import load_vector_store


class MedicalRetrieverTool:
    """
    Retriever tool interface to query the persistent ChromaDB medical vector store.
    Fetches top-k semantically relevant chunks with metadata and distance scores.
    """

    def __init__(
        self,
        persist_directory: str = "./data/chroma_db",
        collection_name: str = "medical_guidelines",
        top_k: int = 4
    ):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.top_k = top_k
        self.vector_store = self._initialize_store()

    def _initialize_store(self):
        """Loads the Chroma vector store instance."""
        if not os.path.exists(self.persist_directory):
            print(f"[ERROR] ChromaDB directory not found at: {self.persist_directory}")
            return None
        return load_vector_store(
            persist_directory=self.persist_directory,
            collection_name=self.collection_name
        )

    def retrieve(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Executes semantic search against the medical guidelines collection.

        Args:
            query (str): The search query or clinical question.
            top_k (Optional[int]): Number of documents to retrieve. Defaults to self.top_k.

        Returns:
            List[Dict[str, Any]]: List of matching results containing text, score, and metadata.
        """
        if not self.vector_store:
            print("[ERROR] Vector store is not initialized. Cannot retrieve documents.")
            return []

        k = top_k or self.top_k
        try:
            results_with_scores = self.vector_store.similarity_search_with_score(query, k=k)
            
            formatted_results = []
            for doc, score in results_with_scores:
                formatted_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "source": doc.metadata.get("source", "Unknown"),
                    "page": doc.metadata.get("page", "N/A"),
                    "score": float(score)
                })
            
            return formatted_results
        except Exception as e:
            print(f"[ERROR] Retrieval execution failed: {e}")
            return []


# Tool instantiation helper
def get_medical_retriever(top_k: int = 4) -> MedicalRetrieverTool:
    """Factory function to get an initialized MedicalRetrieverTool instance."""
    return MedicalRetrieverTool(top_k=top_k)


if __name__ == "__main__":
    # Standalone test verification
    retriever = get_medical_retriever(top_k=2)
    test_query = "corticosteroids in severe covid-19"
    print(f"\n[INFO] Running standalone test for query: '{test_query}'")
    matches = retriever.retrieve(test_query)
    
    print(f"[SUCCESS] Retrieved {len(matches)} chunk(s):")
    for idx, match in enumerate(matches, 1):
        print(f"\n--- Match {idx} (Score: {match['score']:.4f}) ---")
        print(f"Source: {match['source']} | Page: {match['page']}")
        print(f"Content:\n{match['content'][:200]}...")

