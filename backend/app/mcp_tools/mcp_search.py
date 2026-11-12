import re
from typing import List, Dict, Any

try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS


class MedicalSearchTool:
    """
    MCP Fallback tool to query live medical knowledge via DuckDuckGo Search
    when internal vector store context is insufficient or missing.
    """

    def __init__(self, max_results: int = 3):
        self.max_results = max_results

    def _sanitize_query(self, raw_query: str) -> str:
        """Removes [MeSH] tags, brackets, and extra punctuation."""
        cleaned = re.sub(r"\[.*?\]", " ", raw_query)
        cleaned = re.sub(r"[\"'\(\)]", " ", cleaned)
        words = [w for w in cleaned.split() if w.lower() not in ["mesh", "and", "or"]]
        # Keep top 4-5 core keywords for high-accuracy web matching
        return " ".join(words[:5]).strip()

    def search(self, query: str) -> List[Dict[str, Any]]:
        clean_q = self._sanitize_query(query)
        if not clean_q:
            return []

        formatted_results: List[Dict[str, Any]] = []

        try:
            with DDGS() as ddgs:
                # 1. Primary search with clean keywords
                raw_results = list(ddgs.text(clean_q, max_results=self.max_results))

            for res in raw_results:
                content = res.get("body", "").strip()
                if not content:
                    continue
                formatted_results.append({
                    "content": content,
                    "source": res.get("href", "DuckDuckGo Web Search"),
                    "title": res.get("title", "Clinical Web Search Result"),
                    "page": "Web",
                    "score": 1.0
                })

            return formatted_results

        except Exception as e:
            print(f"--> [ERROR] DuckDuckGo search execution failed: {e}")
            return []


def get_medical_search_tool(max_results: int = 3) -> MedicalSearchTool:
    return MedicalSearchTool(max_results=max_results)


if __name__ == "__main__":
    tool = get_medical_search_tool()
    test_q = "Migraine [MeSH] Headache [MeSH] Acute Treatment [MeSH]"
    print(f"Testing with query: {test_q}")
    res = tool.search(test_q)
    print(f"Results found: {len(res)}")
    for r in res:
        print(f"\nTitle: {r['title']}\nURL: {r['source']}\nSnippet: {r['content'][:140]}...")