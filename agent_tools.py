# ======================================================================
# agent_tools.py (FIXED: Deferred Initialization)
# ======================================================================

import os
from typing import ClassVar
from crewai_tools import PDFSearchTool
from crewai.tools import BaseTool

# --- Configuration (Path defined at module level) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "kb", "LLMAll_en-US_FINAL.pdf")

# --- GLOBAL CLASS TEMPLATE ---
class OwaspSecurityRAGTool(BaseTool):
    """Semantic search tool for querying the LLM Guardrails PDF."""
    
    # ClassVar declaration is retained but no initializer is run here
    pdf_searcher: ClassVar[object] = None 
    
    name: str = "OWASP_Compliance_Search"
    description: str = "A semantic search tool for querying the official 'LLM Guardrails Compliance' PDF."
    
    # We remove the __init__ method entirely to prevent startup errors
    # The tool is assumed to be initialized externally before _run is called

    def _run(self, search_query: str) -> str:
        """Executes the semantic search against the PDF Knowledge Base."""
        # This check is still necessary, but initialization happens externally.
        if OwaspSecurityRAGTool.pdf_searcher:
            return OwaspSecurityRAGTool.pdf_searcher.run(search_query)
        else:
            return "ERROR: Compliance PDF tool is unavailable. (Key missing)"

# --- NEW: Function to create the tool ONLY when the API key is known ---
def create_owasp_rag_tool(api_key: str) -> OwaspSecurityRAGTool | None:
    """Initializes the RAG tool using the dynamic API key."""
    if not api_key:
        print("DIAGNOSTIC: Cannot initialize RAG tool without API key.")
        return None
    
    try:
        # CRITICAL FIX: Set the key in the environment before tool creation
        os.environ["OPENAI_API_KEY"] = api_key 
        
        # 1. Initialize the underlying PDFSearchTool
        searcher = PDFSearchTool(pdf=PDF_PATH)
        
        # 2. Update the ClassVar of the custom tool class
        OwaspSecurityRAGTool.pdf_searcher = searcher 
        
        # 3. Instantiate and return the tool wrapper
        print(f"INFO: Successfully initialized PDF RAG tool with dynamic key.")
        return OwaspSecurityRAGTool()
        
    except Exception as e:
        print(f"CRITICAL ERROR (Runtime Init): Failed to initialize PDF RAG tool. Error: {e}")
        return None

# We remove the line 'owasp_rag_tool = OwaspSecurityRAGTool()'
# The tool is now created on demand.