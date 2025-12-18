import os
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    
    CONFIGURATION UPDATE:
    - Embedding: Uses 'sentence-transformers/all-MiniLM-L6-v2' (Standard HF Leaderboard model)
    - LLM: Uses 'mistralai/Mistral-7B-Instruct-v0.2' for RAG summarization
    - Auth: Strictly handles API keys to prevent OpenAI defaults.
    """
    
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    # 1. Validation
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # 2. KEY MANAGEMENT (CRITICAL FIX)
    # The 'upsert' error happens because the library sees 'OPENAI_API_KEY' and 
    # assumes it should use OpenAI for embeddings, rejecting your 'hf_' token.
    user_key = os.environ.get("OPENAI_API_KEY")
    
    # Ensure HuggingFace token is set for the 'huggingface' provider
    if user_key and user_key.startswith("hf_"):
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = user_key
    
    # Temporarily remove OPENAI_API_KEY to force the library to use the 'huggingface' config
    if "OPENAI_API_KEY" in os.environ:
        del os.environ["OPENAI_API_KEY"]

    try:
        # 3. INITIALIZE TOOL WITH HUGGING FACE CONFIG
        # This matches the 'Advanced RAG' pattern of using specific HF endpoints.
        tool = PDFSearchTool(
            pdf=pdf_path,
            config=dict(
                llm=dict(
                    provider="huggingface",
                    config=dict(
                        model="mistralai/Mistral-7B-Instruct-v0.2",
                        temperature=0.1,
                        max_new_tokens=512,
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
        return tool

    except Exception as e:
        print(f"❌ Error initializing OWASP RAG Tool: {e}")
        return None

    finally:
        # 4. RESTORE KEY
        # Vital: Put the key back so the Agents (which use OpenAI/LiteLLM client) can function.
        if user_key:
            os.environ["OPENAI_API_KEY"] = user_key