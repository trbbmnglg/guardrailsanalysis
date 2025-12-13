from crewai_tools import WebsiteSearchTool

# --- Configuration ---
OWASP_URL = "https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques"

def get_owasp_web_tool():
    """
    Factory for the Website Search Tool (2025 RAG).
    Initialized with the specific Confident AI OWASP 2025 guide.
    """
    try:
        # The tool automatically uses the OPENAI_API_KEY from os.environ for embeddings
        return WebsiteSearchTool(website=OWASP_URL)
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize WebsiteSearchTool: {e}")
        return None