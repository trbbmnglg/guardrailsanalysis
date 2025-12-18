import os
import sys
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    # 1. Check if the file exists
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # 2. Check for the actual HuggingFace Token (Don't use OpenAI key here)
    # If using a public model locally (like all-MiniLM-L6-v2), a token might not be strictly necessary 
    # depending on your environment, but it's good practice to have one if using the Hub.
    if "HF_TOKEN" not in os.environ and "HUGGINGFACE_API_KEY" not in os.environ:
        print("ℹ️ Note: No specific HF_TOKEN found. Attempting to run with local/public privileges.")
    else:
        print("✅ HuggingFace token detected.")

    # 3. Initialize the Tool
    try:
        tool = PDFSearchTool(
            pdf=pdf_path,
            config={
                "embedding_model": {
                    "provider": "huggingface",
                    "config": {
                        # This is a standard public model
                        "model": "sentence-transformers/all-MiniLM-L6-v2",
                    },
                },
                "vectordb": {
                    "provider": "chromadb",
                    "config": {
                        "collection_name": "owasp_rag",
                        # Persist data to avoid rebuilding on every run
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
        # Optional: Add logic here if you want to fall back to OpenAI
        return None

# --- Usage Example ---
if __name__ == "__main__":
    # Ensure you have your keys set in your environment before running this
    # os.environ["OPENAI_API_KEY"] = "sk-..."
    # os.environ["HF_TOKEN"] = "hf_..."
    
    rag_tool = get_owasp_rag_tool()
    
    if rag_tool:
        print("Tool is ready to use.")
    else:
        print("Tool failed to load.")