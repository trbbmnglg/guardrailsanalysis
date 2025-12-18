import os
import sys
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # --- KEY FIX START ---
    # 1. Get your HuggingFace token from environment
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_API_KEY")

    # 2. If it exists, set the SPECIFIC variable ChromaDB demands
    if hf_token:
        os.environ["CHROMA_HUGGINGFACE_API_KEY"] = hf_token
        print("✅ Configured CHROMA_HUGGINGFACE_API_KEY")
    else:
        # If we don't have a token, we must warn the user, as the 'huggingface' provider REQUIRES it.
        print("⚠️ Warning: No HF_TOKEN found. The 'huggingface' provider will fail without it.")
        # You can get a free token here: https://huggingface.co/settings/tokens
    # --- KEY FIX END ---

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
                    "config": {
                        "collection_name": "owasp_rag",
                        "dir": "./chroma_db",
                        "allow_reset": True
                    },
                },
            }
        )
        print(f"✅ OWASP RAG tool initialized successfully")
        return tool
        
    except Exception as e:
        print(f"❌ Error initializing RAG tool: {e}")
        sys.exit(1)
        return None