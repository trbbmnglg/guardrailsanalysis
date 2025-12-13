import os
from crewai_tools import WebsiteSearchTool

# --- Configuration ---
OWASP_URL = "https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques"

def get_owasp_web_tool():
    """
    Factory for the Website Search Tool (2025 RAG).
    Uses the 'config=dict()' pattern to force HuggingFace execution.
    """
    
    # 1. SETUP KEYS
    # Embedchain (the backend) specifically looks for 'HUGGINGFACEHUB_API_TOKEN'
    hf_key = os.environ.get("HUGGINGFACE_API_KEY")
    if hf_key:
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = hf_key
        
    # CRITICAL FIX: Set a dummy OpenAI key if missing. 
    # This bypasses the Pydantic validation error, but because we define the 
    # provider as 'huggingface' below, this key will never actually be used.
    if "OPENAI_API_KEY" not in os.environ:
        os.environ["OPENAI_API_KEY"] = "NA"

    try:
        # 2. INITIALIZE TOOL WITH DICT CONFIG
        return WebsiteSearchTool(
            website=OWASP_URL,
            config=dict(
                llm=dict(
                    provider="huggingface",
                    config=dict(
                        model="meta-llama/Llama-3.3-70B-Instruct",
                        temperature=0.1,
                        max_tokens=250,
                    ),
                ),
                embedder=dict(
                    provider="huggingface",
                    config=dict(
                        model="sentence-transformers/all-MiniLM-L6-v2",
                    ),
                ),
            )
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize WebsiteSearchTool: {e}")
        return None