import os
from crewai_tools import PDFSearchTool

def get_owasp_rag_tool():
    """
    Creates a RAG tool for the OWASP LLM Top 10 PDF.
    
    CRITICAL CONFIGURATION:
    1. Embedder: Uses 'sentence-transformers/all-MiniLM-L6-v2' (Local/Free)
    2. LLM: Uses 'mistralai/Mistral-7B-Instruct-v0.2' (Hugging Face)
    3. Auth: Sets a DUMMY OpenAI key to bypass Pydantic validation, 
       while forcing the tool to use the HUGGINGFACEHUB_API_TOKEN.
    """
    
    pdf_path = "kb/LLMAll_en-US_FINAL.pdf"
    
    # 1. Check file existence
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: Knowledge base not found at {pdf_path}")
        return None

    # --- KEY MANAGEMENT ---
    # Capture the real key (which main.py puts in OPENAI_API_KEY)
    real_key = os.environ.get("OPENAI_API_KEY")
    
    # Set the key that Embedchain/HuggingFace actually needs
    if real_key:
        os.environ["HUGGINGFACEHUB_API_TOKEN"] = real_key

    # BYPASS VALIDATION: Set dummy key so Pydantic doesn't crash with "Not Set"
    os.environ["OPENAI_API_KEY"] = "NA"

    try:
        # 2. INITIALIZE TOOL
        # The config forces provider="huggingface", so it won't use the dummy key.
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
        print(f"❌ Error initializing OWASP Tool: {e}")
        return None

    finally:
        # 3. RESTORE REAL KEY
        # Vital: Put the key back so the main Agents (Security, Privacy) can run!
        if real_key:
            os.environ["OPENAI_API_KEY"] = real_key