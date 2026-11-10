from typing import List, Dict, Any
try:
    from duckduckgo_search import DDGS
except ImportError:
    from ddgs import DDGS


class MedicalSearchTool:
    """
    MCP Fallback tool to query live medical knowledge via DuckDuckGo Search
    when internal vector store context is insufficient or missing.
    """

    def __init__(self, max_results: int = 3):
        self.max_results = max_results

    def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Executes direct web search for clinical or medical topics.

        Args:
            query (str): Clinical search query.

        Returns:
            List[Dict[str, Any]]: Formatted search results with source URL and snippets.
        """
        try:
            refined_query = f"{query} clinical medical guideline"
            formatted_results = []

            with DDGS() as ddgs:
                raw_results = list(ddgs.text(refined_query, max_results=self.max_results))

            for res in raw_results:
                formatted_results.append({
                    "content": res.get("body", ""),
                    "source": res.get("href", "DuckDuckGo Web Search"),
                    "title": res.get("title", "Clinical Web Search Result"),
                    "page": "Web",
                    "score": 1.0
                })

            return formatted_results
        except Exception as e:
            print(f"[ERROR] Web search execution failed: {e}")
            return []


def get_medical_search_tool(max_results: int = 3) -> MedicalSearchTool:
    """Factory helper to instantiate MedicalSearchTool."""
    return MedicalSearchTool(max_results=max_results)


if __name__ == "__main__":
    tool = get_medical_search_tool()
    res = tool.search("WHO covid guidelines")
    print(f"Results found: {len(res)}")
    for r in res:
        print(f"\nTitle: {r['title']}\nURL: {r['source']}\nSnippet: {r['content'][:150]}...")