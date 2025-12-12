import os
from typing import ClassVar
from crewai_tools import PDFSearchTool 
from crewai.tools import BaseTool 


class OwaspSecurityRAGTool(BaseTool):
    """Semantic search tool for querying the LLM Guardrails PDF."""
    
    # 1. ClassVar declaration (Must use ClassVar for Pydantic/BaseTool compatibility)
    pdf_searcher: ClassVar[object] = None 
    
    name: str = "OWASP_Compliance_Search"
    description: str = (
        "A semantic search tool for querying the official 'LLM Guardrails Compliance' PDF."
    )
    
    def __init__(self):
        super().__init__()
        global PDF_PATH
        try:
            OwaspSecurityRAGTool.pdf_searcher = PDFSearchTool(pdf=PDF_PATH)
            print(f"INFO: Successfully initialized PDF RAG tool from: {PDF_PATH}")
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to initialize PDF RAG tool. Error: {e}")
            # Also set the error state on the ClassVar
            OwaspSecurityRAGTool.pdf_searcher = None 

    def _run(self, search_query: str) -> str:
        """Executes the semantic search against the PDF Knowledge Base."""
        # FIX 2: Access the ClassVar using the Class name in _run
        if OwaspSecurityRAGTool.pdf_searcher:
            return OwaspSecurityRAGTool.pdf_searcher.run(search_query)
        else:
            return "ERROR: Compliance PDF tool is unavailable."

# Instantiate the tool
owasp_rag_tool = OwaspSecurityRAGTool()