import os
import logging
from crewai_tools import PDFSearchTool

logger = logging.getLogger("guardrails")

# OWASP LLM Top-10 knowledge base. Single canonical location (matches the LFS-tracked file).
PDF_PATH = os.path.join("knowledge", "LLMAll_en-US_FINAL.pdf")
HF_ROUTER_BASE = "https://router.huggingface.co/v1"

# Once construction fails for a config-level reason (independent of the user's key),
# stop retrying on every request.
_RAG_DISABLED = False


def get_owasp_rag_tool(api_key=None):
    global _RAG_DISABLED
    if _RAG_DISABLED:
        return None
    """Return a PDFSearchTool over the OWASP LLM Top-10 PDF, or None if unavailable.

    - Embedder: local sentence-transformers (no API key).
    - Answer LLM: routed through the HF OpenAI-compatible router using the caller's
      token (PDFSearchTool/embedchain otherwise defaults to OpenAI and demands
      OPENAI_API_KEY). Never mutates a process-global env var.
    """
    if not os.path.exists(PDF_PATH):
        logger.warning("OWASP knowledge base not found at %s; RAG tool disabled", PDF_PATH)
        return None
    if not api_key:
        logger.warning("No api_key for RAG answer-LLM; RAG tool disabled")
        return None

    try:
        config = {
            "llm": {
                "provider": "openai",
                "config": {
                    "model": "Qwen/Qwen2.5-72B-Instruct",
                    "api_key": api_key,
                    "base_url": HF_ROUTER_BASE,
                },
            },
            "embedder": {
                "provider": "huggingface",
                "config": {"model": "sentence-transformers/all-MiniLM-L6-v2"},
            },
        }
        tool = PDFSearchTool(pdf=PDF_PATH, config=config)
        logger.info("OWASP RAG tool initialized (local embeddings + HF-router answer LLM)")
        return tool
    except Exception as e:
        # Config-level failure (e.g. embedchain demanding OPENAI_API_KEY) — same for every
        # request, so disable to avoid per-request retries. Re-enable by fixing the config.
        _RAG_DISABLED = True
        logger.warning("Error initializing RAG tool, disabling it for this process: %s", e)
        return None
