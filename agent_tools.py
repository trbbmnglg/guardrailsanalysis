import os
import sys
from crewai_tools import PDFSearchTool
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer


def get_owasp_rag_tool():
    
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None
    
    # Capture the real HF key from environment
    real_hf_key = os.environ.get("OPENAI_API_KEY")
    
    if real_hf_key:
        # Set HuggingFace tokens for embeddings
        os.environ["HUGGINGFACE_ACCESS_TOKEN"] = real_hf_key
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = real_hf_key
        os.environ["HF_TOKEN"] = real_hf_key
        print("✅ HuggingFace tokens configured")
    else:
        print("⚠️ Warning: No HuggingFace token found in OPENAI_API_KEY")
    
    original_openai_key = os.environ.get("OPENAI_API_KEY")
    os.environ["OPENAI_API_KEY"] = "NA"
    
    try:
        tool = PDFSearchTool(
            pdf=pdf_path,
            config={
                "embedding_model": {
                    "provider": "huggingface",
                    "config": {
                        "model": "sentence-transformers/all-MiniLM-L6-v2",
                    },
                },
                "vectordb": {
                    "provider": "chromadb",
                    "config": {},
                },
            }
        )
        print(f"✅ OWASP RAG tool initialized with default ChromaDB settings")
        return tool
        
    except Exception as e:
        print(f"⚠️ Simplified config failed: {e}")
        print("🔄 Attempting fallback: basic initialization without custom config...")
    
    finally:
        # Always restore the real key for other agents
        if original_openai_key:
            os.environ["OPENAI_API_KEY"] = original_openai_key
            print("🔄 Restored original OPENAI_API_KEY")

        sys.exit(1)