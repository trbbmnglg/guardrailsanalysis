import os
from crewai_tools import PDFSearchTool
from crewai.tools import BaseTool

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "kb", "LLMAll_en-US_FINAL.pdf")

class OwaspSecurityRAGTool(BaseTool):
    """Semantic search tool for querying the LLM Guardrails PDF."""
    
    name: str = "OWASP_Compliance_Search"
    description: str = "A semantic search tool for querying the official 'LLM Guardrails Compliance' PDF."
    
    pdf_searcher = None # Initialize as None
    
    def __init__(self):
        super().__init__()
        global PDF_PATH # Use the defined path
        try:
            # We initialize it here to ensure the path is resolved upon module import/app start
            self.pdf_searcher = PDFSearchTool(pdf=PDF_PATH)
            print(f"INFO: Successfully initialized PDF RAG tool from: {PDF_PATH}")
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to initialize PDF RAG tool. PDF not found or inaccessible: {e}")
            self.pdf_searcher = None

    def _run(self, search_query: str) -> str:
        """Executes the semantic search against the PDF Knowledge Base."""
        if self.pdf_searcher:
            # Pass the query to the underlying PDF search tool
            return self.pdf_searcher.run(search_query)
        else:
            return "ERROR: Compliance PDF tool is unavailable. Please check the 'kb' directory and Docker volume mounting."

# Instantiate the tool
owasp_rag_tool = OwaspSecurityRAGTool()