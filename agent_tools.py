import os
import sys
from crewai_tools import PDFSearchTool
from chromadb.config import Settings


def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    
    Uses HuggingFace embeddings and ChromaDB for vector storage.
    Handles API key mapping to work with CrewAI's requirements.
    """
    
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
    else:
        print("⚠️ Warning: No HuggingFace token found in OPENAI_API_KEY")
    
    # Temporarily set OpenAI key to placeholder
    os.environ["OPENAI_API_KEY"] = "NA"
    
    try:
        # Use a proper sentence-transformer model for embeddings
        tool = PDFSearchTool(
            pdf=pdf_path,
            config={
                "llm": {
                    "provider": "huggingface",
                    "config": {
                        "model": "mistralai/Mistral-7B-Instruct-v0.2",
                        "temperature": 0.7,
                    },
                },
                "embedder": {
                    "provider": "huggingface",
                    "config": {
                        "model": "sentence-transformers/all-MiniLM-L6-v2",
                    },
                },
                "vectordb": {
                    "provider": "chroma",
                    "config": {
                        "collection_name": "owasp_llm_top10",
                        "dir": "/content/chroma",
                        "allow_reset": True,
                    },
                },
            }
        )
        
        print(f"✅ OWASP RAG tool initialized successfully with {pdf_path}")
        return tool
    
    except Exception as e:
        print(f"❌ Error initializing OWASP Tool: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # Restore the real key for other agents
        if real_hf_key:
            os.environ["OPENAI_API_KEY"] = real_hf_key
            print("🔄 Restored OPENAI_API_KEY for other agents")