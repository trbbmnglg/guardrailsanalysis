"""Pure, dependency-light helpers (no crewai/pydantic imports) so they can be
unit-tested in isolation. Imported by main.py."""
import json
import logging
import os

logger = logging.getLogger("guardrails")
DEBUG = os.getenv("GR_DEBUG", "").lower() in ("1", "true", "yes")


def repair_json(json_str: str) -> str:
    if not json_str:
        return "{}"
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = json_str[start_idx:end_idx + 1]
    return json_str


def extract_data(task_output):
    try:
        if hasattr(task_output, 'pydantic') and task_output.pydantic:
            return task_output.pydantic.model_dump()
        if hasattr(task_output, 'model_dump'):
            return task_output.model_dump()
        raw_output = str(task_output)
        clean_json = raw_output.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception:
        try:
            return json.loads(repair_json(str(task_output)))
        except Exception:
            logger.warning("extract_data: model output was not parseable JSON", exc_info=DEBUG)
            return None


def clean_text(text: str) -> str:
    """Safe encode/decode to remove non-printable characters that crash ASCII terminals.
    NOTE: anti-crash only — NOT a security sanitizer. Untrusted text is fenced separately."""
    if not text:
        return ""
    try:
        return text.encode('ascii', 'ignore').decode('ascii')
    except Exception:
        return text
