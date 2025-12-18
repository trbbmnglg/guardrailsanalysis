import os
import sys
from crewai_tools import PDFSearchTool
from chromadb.config import Settings


def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    
    Uses HuggingFace embeddings and ChromaDB based on official CrewAI documentation.
    Handles API key mapping and Pydantic compatibility issues.
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
        print("✅ HuggingFace tokens configured")
    else:
        print("⚠️ Warning: No HuggingFace token found in OPENAI_API_KEY")
    
    # Temporarily set OpenAI key to placeholder
    original_openai_key = os.environ.get("OPENAI_API_KEY")
    os.environ["OPENAI_API_KEY"] = "NA"
    
    try:
        # Method 1: Try with full configuration
        print("🔧 Attempting to initialize PDFSearchTool with HuggingFace embeddings...")
        
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
                        "settings": Settings(
                            persist_directory="./chroma_db",
                            allow_reset=True,
                            is_persistent=True,
                        ),
                    },
                },
            }
        )
        
        print(f"✅ OWASP RAG tool initialized successfully with {pdf_path}")
        return tool
    
    except TypeError as te:
        if "validate()" in str(te):
            print(f"⚠️ Pydantic compatibility issue detected: {te}")
            print("🔄 Attempting fallback: simplified configuration...")
            
            try:
                # Method 2: Try without ChromaDB Settings (let it use defaults)
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
                
            except Exception as e2:
                print(f"⚠️ Simplified config failed: {e2}")
                print("🔄 Attempting fallback: basic initialization without custom config...")
                
                try:
                    # Method 3: Use basic initialization (relies on OpenAI defaults)
                    # This requires a valid OpenAI key, so we restore it temporarily
                    os.environ["OPENAI_API_KEY"] = original_openai_key or "NA"
                    
                    tool = PDFSearchTool(pdf=pdf_path)
                    print(f"✅ OWASP RAG tool initialized with default configuration")
                    print("⚠️ Note: Using OpenAI embeddings instead of HuggingFace")
                    return tool
                    
                except Exception as e3:
                    print(f"❌ All initialization methods failed: {e3}")
                    return None
        else:
            raise te
    
    except Exception as e:
        print(f"❌ Error initializing OWASP Tool: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        # Try one last fallback without config
        print("🔄 Final fallback: attempting basic initialization...")
        try:
            os.environ["OPENAI_API_KEY"] = original_openai_key or "NA"
            tool = PDFSearchTool(pdf=pdf_path)
            print(f"✅ OWASP RAG tool initialized with basic configuration")
            return tool
        except:
            print("❌ All initialization attempts failed. Returning None.")
            return None
    
    finally:
        # Always restore the real key for other agents
        if original_openai_key:
            os.environ["OPENAI_API_KEY"] = original_openai_key
            print("🔄 Restored original OPENAI_API_KEY")