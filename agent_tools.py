import os
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    Configured to use Hugging Face for BOTH Embeddings and LLM to avoid OpenAI errors.
    """
    
    # 1. KEY SYNC: main.py stores the user's key in OPENAI_API_KEY.
    # We must copy it to HUGGINGFACEHUB_API_TOKEN for the 'huggingface' provider to work.
    user_key = os.environ.get("OPENAI_API_KEY")
    if user_key and user_key.startswith("hf_"):
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = user_key

    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    # Safety check
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # 2. TOOL CONFIGURATION
    return PDFSearchTool(
        pdf=pdf_path,
        config=dict(
            llm=dict(
                provider="huggingface", 
                config=dict(
                    # Using a reliable, open model for RAG summarization
                    model="mistralai/Mistral-7B-Instruct-v0.3",
                    temperature=0.1,
                    max_new_tokens=512,
                ),
            ),
            embedder=dict(
                provider="huggingface",
                config=dict(
                    # Runs locally in the container (No API cost for embeddings)
                    model="sentence-transformers/all-MiniLM-L6-v2",
                ),
            ),
        )
    )