import os
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool(api_key=None):
    """
    Initializes the RAG tool.
    If an OpenAI key is provided, it uses OpenAI Embeddings (Stable).
    """
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # 1. Set the API Key
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key

    try:
        # 2. Initialize Tool WITHOUT the specific "huggingface" config.
        # By removing the 'config' dictionary, CrewAI defaults to using 
        # the OPENAI_API_KEY for both embeddings and generation.
        # This is much more stable and fixes your "string to float" error.
        
        tool = PDFSearchTool(
            pdf=pdf_path,
            config={
                "vectordb": {
                    "provider": "chromadb",
                    "config": {
                        "collection_name": "owasp_rag",
                        "dir": "./chroma_db",
                        "allow_reset": True
                    }
                }
                # Note: We REMOVED the "embedding_model" section. 
                # It will now automatically use text-embedding-3-small (OpenAI).
            }
        )
        
        print(f"✅ OWASP RAG tool initialized (Using OpenAI Embeddings)")
        return tool
        
    except Exception as e:
        print(f"❌ Error initializing RAG tool: {e}")
        return None