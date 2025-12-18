import os
from crewai_tools import PDFSearchTool

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

    # --- 2. BYPASS OPENAI VALIDATION ---
    # We must set this to SOMETHING so Pydantic doesn't crash.
    # We use "NA" because our config below forces 'huggingface' provider,
    # so the code should never actually try to use this key.
    os.environ["OPENAI_API_KEY"] = "NA"

    try:
        # --- 3. INITIALIZE TOOL ---
        # Explicitly defining the config tells Embedchain to use HF 
        # for both the LLM (summarization) and the Embedder (vectorizing).
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
        raise HTTPException(
            status_code=503,
            print(f"❌ Error initializing OWASP Tool: {e}")
        )        
        return None

    finally:
        # --- 4. RESTORE REAL KEY ---
        # We must put the real key back into OPENAI_API_KEY 
        # so the Agents in main.py (which use ChatOpenAI) can function.
        if real_hf_key:
            os.environ["OPENAI_API_KEY"] = real_hf_key