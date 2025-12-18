import os
import sys
from crewai_tools import PDFSearchTool
from chromadb.config import Settings


def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    
    CRITICAL FIXES:
    1. Sets 'HUGGINGFACE_ACCESS_TOKEN' (Required by Embedchain).
    2. Sets 'HUGGINGFACEHUB_API_TOKEN' (Required by other HF libraries).
    3. Keeps 'OPENAI_API_KEY' as 'NA' to satisfy CrewAI validation, 
       but forces the config to use Hugging Face so 'NA' is never used.
    """
    
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None
    
    # --- 1. KEY MAPPING ---
    # Capture the real key from main.py
    real_hf_key = os.environ.get("OPENAI_API_KEY")
    
    if real_hf_key:
        # Embedchain specifically looks for this one:
        os.environ["HUGGINGFACE_ACCESS_TOKEN"] = real_hf_key
        # Older libraries look for this one:
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = real_hf_key
        # Generic fallback:
        os.environ["HF_TOKEN"] = real_hf_key
    
    os.environ["OPENAI_API_KEY"] = "NA"
    
    try:
        tool = PDFSearchTool(
            pdf=pdf_path,
            config={
                "embedding_model": {
                    "provider": "huggingface",
                    "config": {
                        "model": "mistralai/Mistral-7B-Instruct-v0.2",
                    },
                },
                "vectordb": {
                    "provider": "chroma",
                    "config": {
                        "settings": Settings(
                            persist_directory="/content/chroma",
                            allow_reset=True,
                            is_persistent=True,
                        ),
                    },
                },
            }
        )
        return tool
    
    except Exception as e:
        print(f"❌ Error initializing OWASP Tool: {e}")
        sys.exit(1)
    
    finally:
        # --- 4. RESTORE REAL KEY ---
        # We must put the real key back into OPENAI_API_KEY 
        # so the Agents in main.py (which use ChatOpenAI) can function.
        if real_hf_key:
            os.environ["OPENAI_API_KEY"] = real_hf_key