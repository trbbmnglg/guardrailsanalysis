from crewai_tools import WebsiteSearchTool

# --- Configuration ---
OWASP_URL = "https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques"

def get_owasp_web_tool():
    """
    Factory for the Website Search Tool (2025 RAG).
    Configured to use HuggingFace for embeddings to avoid OpenAI 401 errors.
    """
    try:
        return WebsiteSearchTool(
            website=OWASP_URL,
            config={
                "llm": {
                    "provider": "huggingface",
                    "config": {
                        "model": "meta-llama/Llama-3.3-70B-Instruct",
                    }
                },
                "embedder": {
                    "provider": "huggingface",
                    "config": {
                        "model": "sentence-transformers/all-MiniLM-L6-v2"
                    }
                }
            }
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize WebsiteSearchTool: {e}")
        return None