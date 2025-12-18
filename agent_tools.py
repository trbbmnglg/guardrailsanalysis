import os
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    Uses local embeddings (sentence-transformers) to save costs/API calls.
    """
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    # Check if file exists to prevent runtime crashes
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # Initialize the tool with specific configuration for local embeddings
    # This ensures we don't try to call OpenAI for embeddings
    tool = PDFSearchTool(
        pdf=pdf_path,
        config=dict(
            llm=dict(
                provider="openai", # We rely on the main agent's LLM, but this config is required by the underlying engine
                config=dict(
                    model="gpt-4o-mini", # Placeholder, the agent will overwrite this with its own LLM context
                ),
            ),
            embedder=dict(
                provider="huggingface", # Use local huggingface embeddings
                config=dict(
                    model="sentence-transformers/all-MiniLM-L6-v2",
                ),
            ),
        )
    )
    return tool