import os
import json
import re
import yaml
import copy
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

app = FastAPI()

# --- CONFIG LOADING HELPER ---
def load_config(file_path):
    with open(file_path, 'r') as file:
        return yaml.safe_load(file)

# Load configs at startup (Global Templates)
GLOBAL_AGENTS_CONFIG = load_config('config/agents.yaml')
GLOBAL_TASKS_CONFIG = load_config('config/tasks.yaml')

def repair_json(json_str: str) -> str:
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')
    if json_str.count('"') % 2 != 0: json_str += '"'
    json_str += ']' * open_brackets
    json_str += '}' * open_braces
    return json_str

EnforcementType = Literal[
    "Sanitize", "Maintain", "Block", "Mask", "Log", "Human Review", "Filter", 
    "Reject", "Refuse", "Redact", "Implement", "Validate", "Detect", 
    "Identify", "Enforce", "Limit", "Remove", "Test", "Encrypt", "Monitor"
]

enforcement_list_str = ", ".join([f'"{x}"' for x in EnforcementType.__args__])

CATEGORY_GUIDELINES = """
    CRITICAL: You MUST use EXACTLY these category names (case-sensitive):
    1. "Security" - Authentication, authorization, injection attacks, secure data handling
    2. "Privacy" - PII handling, GDPR/CCPA, data residency, consent mechanisms
    3. "Responsible AI" - Bias, fairness, toxicity, harmful content, ethical boundaries
    4. "Scope Control" - Task limitations, out-of-scope detection, capability boundaries
    5. "Input Validation" - Input sanitization, format checks, type validation
    6. "Output Control" - Response filtering, length limits, format enforcement
    7. "QA" - Quality checks, error handling, testing, monitoring
    
    NAMING RULES FOR MISSING GUARDRAILS:
    - Start with "MISSING:" followed by specific control name
    - Example: "MISSING: SQL Injection Prevention"
    
    LOCATION FIELD RULES:
    - If guardrail EXISTS: Provide max 5 words exact quote from instruction
    - If guardrail is MISSING: Set location to empty string ""
"""

AUDIT_OUTPUT_FORMAT = """
    For each check, report:
    - Name: Guardrails name.
    - Status: PRESENT or MISSING
    - For Security Auditor only: If COMPLIANT set Status to PRESENT if NON-COMPLIANT set Status to MISSING
    - For Privacy Auditor only: If CERTIFIED set Status to PRESENT if REJECTED set Status to MISSING
    - For QA Auditor only: If PASS set Status to PRESENT if FAIL set Status to MISSING
    - Location: Specific prompt text demonstrating compliance (or absence)
    - Severity: Critical | High | Medium | Low
    - Category: Security | Privacy | Responsible AI | Scope Control | Input Validation | Output Control | QA
    - Enforcement MUST be one from {enforcement_list}. If enforcement is not on the list, choose the closest one or append to the existing list. Only one action word.
"""

CRITICAL_JSON_RULES="""
    CRITICAL JSON RULES:
    1. Use double quotes for ALL strings: "key": "value"
    2. NO single quotes allowed
    3. NO Python syntax like Guardrail() or keyword=value
    4. NO trailing commas
    5. Escape special characters in strings: use \\" for quotes inside strings
    6. Boolean values: true/false (lowercase)
    7. Null values: null (lowercase)
    
    Your output must be parseable by json.loads() in Python.

    **REQUIRED OUTPUT STRUCTURE:**
    
{{
      "guardrails": [
        {{
          "name": "Descriptive Guardrail Name",
          "category": "Security|Privacy|Responsible AI|Quality|Scope Control|Output Control",
          "severity": "Critical|High|Medium|Low",
          "complexity_tier": 1-5,
          "description": "Concise explanation of what this guardrail prevents or enforces",
          "mechanism": "Technical implementation approach (e.g., 'Input validation', 'Self-reflection loop')",
          "triggers": ["keyword1", "keyword2", "condition3"],
          "enforcement": "One of: {enforcement_list}",
          "location": "Short quote from prompt (if PRESENT) or empty string (if MISSING)"
        }}
      ],
      "recommendations": [
        "Specific recommendation 1 with measurable outcome",
        "Specific recommendation 2 addressing compliance gap",
        "Specific recommendation 3 for quality improvement"
      ],
      "tiering_strategy": {{ ... }}
    }}
"""

# --- PYDANTIC MODELS ---
class Guardrail(BaseModel):
    name: str = Field(description="Short, descriptive name of the guardrail control")
    category: Literal[
        "Security", "Privacy", "Responsible AI", "QA", 
        "Scope Control", "Input Validation", "Output Control"
    ] = Field(description="Primary category")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(description="Risk severity")
    complexity_tier: int = Field(default=2, ge=1, le=4, description="Computational tier 1-4")
    description: str = Field(description="Detailed description (min 15 chars)")
    mechanism: str = Field(description="Technical implementation suggestion")
    triggers: List[str] = Field(description="Patterns that trigger this guardrail")
    enforcement: EnforcementType = Field(description="Action to take")
    location: str = Field(default="", description="Exact quote from instruction or empty string")

class TieringStrategy(BaseModel):
    """Computational tier recommendation"""
    selected_tier: str = Field(description="Recommended tier: Tier 1, Tier 2, Tier 3, or Tier 4")
    model_class: str = Field(description="Example model for this tier")
    estimated_cost: str = Field(description="Estimated cost per 1M tokens")
    latency_impact: str = Field(description="Expected latency")
    justification: str = Field(description="Reasoning for tier selection")

class GuardrailAnalysis(BaseModel):
    guardrails: List[Guardrail] = Field(description="List of ALL guardrails - both present and missing")
    recommendations: List[str] = Field(description="1-3 high-level strategic recommendations")
    tiering_strategy: Optional[TieringStrategy] = Field(default=None, description="Optional tiering analysis")

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        # 1. SETUP LLM
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0,
            max_tokens=4000,
        )

        agents_config = copy.deepcopy(GLOBAL_AGENTS_CONFIG)
        tasks_config = copy.deepcopy(GLOBAL_TASKS_CONFIG)

        # ---------------------------------------------------------
        # PHASE 1 & 2: STRATEGY AND SPECIALISTS
        # ---------------------------------------------------------

        strategy_agent = Agent(config=agents_config['audit_strategy_lead'], llm=llm, allow_delegation=False, verbose=True)
        task_strategy = Task(config=tasks_config['strategic_recon_task'], agent=strategy_agent, async_execution=False)

        security_agent = Agent(config=agents_config['security_auditor'], llm=llm, allow_delegation=False, verbose=True)
        privacy_ops_agent = Agent(config=agents_config['privacy_officer'], llm=llm, allow_delegation=False, verbose=True)
        rai_agent = Agent(config=agents_config['rai_director'], llm=llm, allow_delegation=False, verbose=True)
        qa_agent = Agent(config=agents_config['qa_engineer'], llm=llm, allow_delegation=False, verbose=True)

        task_security = Task(config=tasks_config['security_audit_task'], agent=security_agent, context=[task_strategy], async_execution=True)
        task_privacy = Task(config=tasks_config['privacy_audit_task'], agent=privacy_ops_agent, context=[task_strategy], async_execution=True)
        task_rai = Task(config=tasks_config['rai_audit_task'], agent=rai_agent, context=[task_strategy], async_execution=True)
        task_qa = Task(config=tasks_config['qa_audit_task'], agent=qa_agent, context=[task_strategy], async_execution=True)

        agents_list = [strategy_agent, security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_strategy, task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # ---------------------------------------------------------
        # PHASE 3: OPTIONAL COST ARCHITECT (ISOLATED)
        # ---------------------------------------------------------
        
        # NOTE: We declare task_tiering outside the if block so we can reference it later
        task_tiering = None

        if request.enable_profiling:
            tiering_agent = Agent(config=agents_config['cost_architect'], llm=llm, allow_delegation=False, verbose=True)
            
            task_tiering = Task(
                config=tasks_config['cost_profiling_task'], 
                agent=tiering_agent,
                # Cost agent output will be structured JSON
                output_pydantic=TieringStrategy 
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            
            # CRITICAL FIX: DO NOT add task_tiering to report_context. 
            # The Report Agent must remain unaware of the Cost Agent to preserve Safety Score determinism.
            # report_context.append(task_tiering) <--- REMOVED

        # ---------------------------------------------------------
        # PHASE 4: FINAL CONSOLIDATION
        # ---------------------------------------------------------

        report_agent = Agent(config=agents_config['governance_officer'], llm=llm, allow_delegation=True, verbose=True)
        
        # We explicitly tell the Report Agent to ignore/nullify the tiering strategy 
        # because we will inject it manually later.
        tiering_note = "7. Set 'tiering_strategy' to null (it will be injected by the system)."

        task_report = Task(
            config=tasks_config['report_synthesis_task'],
            agent=report_agent,
            context=report_context, # ONLY sees Audit findings
            async_execution=False,
            output_pydantic=GuardrailAnalysis
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential 
        )
        
        result = crew.kickoff(inputs={
            'instruction': request.instruction,
            'enforcement_list': enforcement_list_str,
            'tiering_note': tiering_note,
            'CATEGORY_GUIDELINES': CATEGORY_GUIDELINES,
            'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT
        })

        # --- MANUAL MERGING LOGIC ---
        
        # 1. Parse the main Guardrail Report
        final_output_str = ""
        if hasattr(result, 'pydantic') and result.pydantic:
            try: final_output_str = result.pydantic.model_dump_json()
            except AttributeError: final_output_str = result.pydantic.json()
        else:
            final_output_str = str(result)

        # Cleanup JSON string
        final_output_str = repair_json(final_output_str.replace("```json", "").replace("```", "").strip())
        
        try:
            parsed_result = json.loads(final_output_str)
        except json.JSONDecodeError:
            # Fallback regex extraction
            match = re.search(r'\{.*\}', final_output_str, re.DOTALL)
            if match: parsed_result = json.loads(repair_json(match.group()))
            else: raise ValueError("Failed to parse Report Agent output")

        # 2. If Profiling was ON, extract and inject the Cost Data
        if request.enable_profiling and task_tiering and hasattr(task_tiering, 'output'):
            try:
                # task_tiering.output might be a Pydantic object or a string depending on CrewAI version/state
                tiering_data = None
                
                # Check if output is already the Pydantic object
                if hasattr(task_tiering.output, 'model_dump'):
                    tiering_data = task_tiering.output.model_dump()
                elif hasattr(task_tiering.output, 'dict'):
                    tiering_data = task_tiering.output.dict()
                else:
                    # It's a string (raw output)
                    raw_tier_output = str(task_tiering.output)
                    raw_tier_output = repair_json(raw_tier_output.replace("```json", "").replace("```", "").strip())
                    tiering_data = json.loads(raw_tier_output)

                # INJECT into the final result
                parsed_result['tiering_strategy'] = tiering_data
                print("✅ Successfully merged Tiering Strategy into final report.")
                
            except Exception as e:
                print(f"⚠️ Warning: Failed to merge Tiering Strategy: {e}")
                parsed_result['tiering_strategy'] = None

        # 3. Post-processing normalization
        if "guardrails" in parsed_result:
            for gr in parsed_result["guardrails"]:
                if gr.get("name", "").upper().startswith("MISSING"): gr["location"] = ""
                if "enforcement" not in gr or not gr["enforcement"]: gr["enforcement"] = "Log" 
                if "location" not in gr: gr["location"] = "" 
                if "complexity_tier" not in gr: gr["complexity_tier"] = 2

        return {"result": json.dumps(parsed_result)}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')