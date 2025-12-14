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
    # 1. Trim markdown
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    
    # 2. Fix common LLM mistake: Unescaped quotes inside string values
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')
    
    # If we are inside a string (odd number of quotes), close it
    if json_str.count('"') % 2 != 0:
        json_str += '"'
    
    # Close open arrays/objects
    json_str += ']' * open_brackets
    json_str += '}' * open_braces
    
    return json_str

ALLOWED_ENFORCEMENT_ACTIONS = Literal[
    "Sanitize", "Maintain", "Block", "Mask", "Log", "Human Review", "Filter", 
    "Reject", "Refuse", "Redact", "Implement", "Validate", "Detect", 
    "Identify", "Enforce", "Limit", "Remove", "Test", "Encrypt"
]

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

enforcement_list_str = str(ALLOWED_ENFORCEMENT_ACTIONS.__args__).replace("(", "").replace(")", "").replace("'", "")

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
    enforcement: ALLOWED_ENFORCEMENT_ACTIONS = Field(description="Action to take")
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

        # 2. CONFIG DEEP COPY (Crucial for state isolation)
        agents_config = copy.deepcopy(GLOBAL_AGENTS_CONFIG)
        tasks_config = copy.deepcopy(GLOBAL_TASKS_CONFIG)

        # ---------------------------------------------------------
        # PHASE 1: THE HUDDLE (STRATEGY & ALIGNMENT)
        # ---------------------------------------------------------

        strategy_agent = Agent(
            config=agents_config['audit_strategy_lead'],
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        task_strategy = Task(
            config=tasks_config['strategic_recon_task'],
            agent=strategy_agent,
            async_execution=False 
        )

        # ---------------------------------------------------------
        # PHASE 2: PARALLEL SPECIALIST EXECUTION
        # ---------------------------------------------------------

        security_agent = Agent(
            config=agents_config['security_auditor'],
            llm=llm,
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            config=agents_config['privacy_officer'],
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            config=agents_config['rai_director'],
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
            config=agents_config['qa_engineer'],
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # -- TASKS --

        task_security = Task(
            config=tasks_config['security_audit_task'],
            agent=security_agent,
            context=[task_strategy], 
            async_execution=True    
        )
        
        task_privacy = Task(
            config=tasks_config['privacy_audit_task'],
            agent=privacy_ops_agent,
            context=[task_strategy],
            async_execution=True
        )
        
        task_rai = Task(
            config=tasks_config['rai_audit_task'],
            agent=rai_agent,
            context=[task_strategy],
            async_execution=True
        )
        
        task_qa = Task(
            config=tasks_config['qa_audit_task'],
            agent=qa_agent,
            context=[task_strategy],
            async_execution=True
        )

        agents_list = [strategy_agent, security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_strategy, task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # ---------------------------------------------------------
        # PHASE 3: OPTIONAL COST ARCHITECT
        # ---------------------------------------------------------

        # THE FIREWALL LOGIC:
        # We explicitly instruct the Report Agent on how to handle Cost data
        # to prevent it from contaminating the Safety/Guardrail analysis.
        if request.enable_profiling:
            tiering_note = """
            8. **TIERING STRATEGY (ISOLATED):**
               - Locate the 'TieringStrategy' output from the Cost Architect.
               - Include it exactly as is in the 'tiering_strategy' field.
               - CRITICAL: Do NOT allow the Cost Architect's opinions to add, remove, or modify any items in the 'guardrails' list. The guardrails list must be derived ONLY from Security, Privacy, RAI, and QA agents.
            """
            
            tiering_agent = Agent(
                config=agents_config['cost_architect'],
                llm=llm, 
                allow_delegation=False, 
                verbose=True
            )
            
            task_tiering = Task(
                config=tasks_config['cost_profiling_task'],
                agent=tiering_agent,
                context=[task_strategy, task_security, task_qa] # Cost needs context from others
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)
        else:
            tiering_note = """
            8. **TIERING STRATEGY:**
               - Set 'tiering_strategy' to null.
            """

        # ---------------------------------------------------------
        # PHASE 4: FINAL CONSOLIDATION & APPROVAL
        # ---------------------------------------------------------

        report_agent = Agent(
            config=agents_config['governance_officer'],
            llm=llm,
            allow_delegation=False,
            verbose=True
        )
        
        task_report = Task(
            config=tasks_config['report_synthesis_task'],
            agent=report_agent,
            context=report_context,
            async_execution=False,
            output_pydantic=GuardrailAnalysis
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            memory=False,
            process=Process.sequential 
        )
        
        result = crew.kickoff(inputs={
            'instruction': request.instruction,
            'enforcement_list': enforcement_list_str,
            'tiering_note': tiering_note,
            'CATEGORY_GUIDELINES': CATEGORY_GUIDELINES
        })

        # --- RESPONSE HANDLING ---
        if hasattr(result, 'pydantic') and result.pydantic:
            try:
                cleaned_output = result.pydantic.model_dump_json()
            except AttributeError:
                cleaned_output = result.pydantic.json()
        else:
            raw_output = str(result)
            cleaned_output = raw_output.replace("```json", "").replace("```", "").strip()
            cleaned_output = cleaned_output.replace("\n", " ").replace("\r", "").replace("\t", " ")
            cleaned_output = repair_json(cleaned_output)
        
        parsed = None
        try:
            parsed = json.loads(cleaned_output)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', cleaned_output, re.DOTALL)
            if match:
                parsed = json.loads(repair_json(match.group()))
        
        if parsed:
            if "guardrails" in parsed:
                for gr in parsed["guardrails"]:
                    if gr.get("name", "").upper().startswith("MISSING"): gr["location"] = ""
                    if "enforcement" not in gr or not gr["enforcement"]: gr["enforcement"] = "Log" 
                    if "location" not in gr: gr["location"] = "" 
                    if "complexity_tier" not in gr: gr["complexity_tier"] = 2
            cleaned_output = json.dumps(parsed)
        else:
            cleaned_output = json.dumps({
                "guardrails": [],
                "recommendations": ["Error: Analysis failed. Please try again."],
                "tiering_strategy": None
            })

        return {"result": cleaned_output}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')