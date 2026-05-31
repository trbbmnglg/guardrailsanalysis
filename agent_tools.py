import os
import logging
from crewai_tools import PDFSearchTool

logger = logging.getLogger("guardrails")

# OWASP LLM Top-10 knowledge base. Single canonical location (matches the LFS-tracked file).
PDF_PATH = os.path.join("knowledge", "LLMAll_en-US_FINAL.pdf")

# Process-level cache. The PDF is static and embeddings are LOCAL (token-independent),
# so build/index the tool ONCE and reuse it across all requests (no per-request
# re-indexing, no per-user state). _RAG_DISABLED short-circuits retries after a
# config-level failure so we don't re-attempt construction on every request.
_RAG_TOOL = None
_RAG_DISABLED = False


def get_owasp_rag_tool():
    """Return a cached PDFSearchTool over the OWASP LLM Top-10 PDF, or None if unavailable.

    Uses LOCAL sentence-transformers embeddings — no API key, no OpenAI call. crewai-tools
    1.14.6 expects config key `embedding_model` with provider `sentence-transformer`; when
    unset it defaults to OpenAI embeddings (requires OPENAI_API_KEY), which is why earlier
    attempts hit OpenAI's /embeddings. First call downloads all-MiniLM-L6-v2 (~80MB) and
    indexes the PDF locally; later calls reuse the cached instance.
    """
    global _RAG_TOOL, _RAG_DISABLED
    if _RAG_TOOL is not None:
        return _RAG_TOOL
    if _RAG_DISABLED:
        return None
    if not os.path.exists(PDF_PATH):
        logger.warning("OWASP knowledge base not found at %s; RAG tool disabled", PDF_PATH)
        _RAG_DISABLED = True
        return None

    try:
        config = {
            "embedding_model": {
                "provider": "sentence-transformer",
                "config": {"model_name": "all-MiniLM-L6-v2", "device": "cpu"},
            },
            "vectordb": {"provider": "chromadb", "config": {}},
        }
        _RAG_TOOL = PDFSearchTool(pdf=PDF_PATH, config=config)
        logger.info("OWASP RAG tool initialized (local sentence-transformers embeddings)")
        return _RAG_TOOL
    except Exception as e:
        # Config-level failure (same for every request) — disable to avoid per-request retries.
        _RAG_DISABLED = True
        logger.warning("Error initializing RAG tool, disabling it for this process: %s", e)
        return None
