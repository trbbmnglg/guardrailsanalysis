from crewai_tools import WebsiteSearchTool

# --- Configuration ---
OWASP_URL = "https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques"

def get_owasp_web_tool():
    tool = WebsiteSearchTool(
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
    return tool