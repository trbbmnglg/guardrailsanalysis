import os
import json
import re
import yaml
import copy
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from green_ai_plugin import GreenAIPlugin, GreenAIAnalysis

app = FastAPI()

# --- CONFIG LOADING HELPER ---
def load_config(file_path):
    with open(file_path, 'r') as file:
        return yaml.safe_load(file)

GLOBAL_AGENTS_CONFIG = load_config('config/agents.yaml')
GLOBAL_TASKS_CONFIG = load_config('config/tasks.yaml')

def repair_json(json_str: str) -> str:
    """Enhanced JSON repair - helps close unclosed brackets/braces"""
    if not json_str:
        return "{}"
    
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    
    # Extract only the JSON part
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = json_str[start_idx:end_idx + 1]
    
    # Basic balancing logic
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')
    
    if json_str.count('"') % 2 != 0: 
        json_str += '"'
    
    # Isara ang mga naiwang brackets/braces dahil sa EOF error
    json_str += ']' * max(0, open_brackets)
    json_str += '}' * max(0, open_braces)
    
    return json_str


CATEGORY_GUIDELINES = """
    CRITICAL: You MUST use EXACTLY these category names (case-sensitive):
    1. "Security" - Authentication, authorization, injection attacks, secure data handling
    2. "Privacy" - PII handling, GDPR/CCPA, data residency, consent mechanisms
    3. "Responsible AI" - Bias, fairness, toxicity, harmful content, ethical boundaries
    4. "QA" - Quality checks, error handling, testing, monitoring
    5. "Scope Control" - Task limitations, out-of-scope detection, capability boundaries
    6. "Input Validation" - Input sanitization, format checks, type validation
    7. "Output Control" - Response filtering, length limits, format enforcement
    
    NAMING RULES FOR MISSING GUARDRAILS:
    - Start with "MISSING:" followed by specific control name
    - Example: "MISSING: SQL Injection Prevention"
    
    LOCATION FIELD RULES:
    - If guardrail EXISTS: Provide max 10 words exact quote from instruction
    - If guardrail is MISSING: Set location to empty string ""
"""

AUDIT_OUTPUT_FORMAT = """
      
    For each checkpoint:
    - Name: Specific guardrail name
    - Status: PRESENT or MISSING
    - Location: Exact quote from instruction (if PRESENT) or empty string (if MISSING)
    - Severity: Critical | High | Medium | Low (for MISSING items, explain risk)
    - Category: Use EXACT category names from guidelines
    - Enforcement: Single action verb (e.g., "Block", "Log", "Redact", "Validate")
    - Description: Brief explanation of what this guardrail prevents
    - Mechanism: How it should be technically implemented
    - Triggers: List of keywords/patterns that activate this guardrail

"""

CRITICAL_JSON_RULES = """
    CRITICAL JSON RULES:
    1. Use double quotes for ALL strings: "key": "value"
    2. NO single quotes allowed
    3. NO Python syntax like Guardrail() or keyword=value
    4. NO trailing commas
    5. Escape special characters in strings: use \\" for quotes inside strings
    6. Boolean values: true/false (lowercase)
    7. Null values: null (lowercase)
    
    Your output must be parseable by json.loads() in Python.
"""

# --- PYDANTIC MODELS ---
class Guardrail(BaseModel):
    name: str = Field(description="Short, descriptive name of the guardrail control")
    category: Literal[
        "Security", "Privacy", "Responsible AI", "QA", 
        "Scope Control", "Input Validation", "Output Control"
    ] = Field(description="Primary category")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(description="Risk severity")
    complexity_tier: int = Field(default=2, ge=1, le=5, description="Computational tier 1-5")
    description: str = Field(description="Detailed description (min 15 chars)")
    mechanism: str = Field(description="Technical implementation suggestion")
    triggers: List[str] = Field(description="Patterns that trigger this guardrail")
    enforcement: str = Field(description="Single action verb")
    location: str = Field(default="", description="Exact quote from instruction or empty string")

class TieringStrategy(BaseModel):
    """Computational tier recommendation"""
    selected_tier: str = Field(description="Recommended tier: Tier 1, Tier 2, Tier 3, Tier 4, or Tier 5")
    model_class: str = Field(description="Example model for this tier")
    estimated_cost: str = Field(description="Estimated cost per 1M tokens")
    latency_impact: str = Field(description="Expected latency")
    justification: str = Field(description="Reasoning for tier selection")

class GuardrailAnalysis(BaseModel):
    guardrails: List[Guardrail] = Field(description="List of ALL guardrails - both present and missing")
    recommendations: List[str] = Field(description="3-5 high-level strategic recommendations")
    tiering_strategy: Optional[TieringStrategy] = Field(default=None, description="Optional tiering analysis")

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False
    enable_greenai_analysis: bool = False


def extract_data(task_output):
    """
    Robustly extracts dictionary data from a TaskOutput, 
    handling Pydantic objects, dicts, or JSON strings.
    """
    try:
        # 1. Check for direct Pydantic model access (Newer CrewAI versions)
        if hasattr(task_output, 'pydantic') and task_output.pydantic:
            return task_output.pydantic.model_dump()
            
        # 2. Check if output IS the Pydantic object
        if hasattr(task_output, 'model_dump'):
            return task_output.model_dump()
            
        # 3. Check for dict method (Older Pydantic)
        if hasattr(task_output, 'dict'):
            return task_output.dict()
            
        # 4. Fallback: Parse as String (Raw JSON)
        raw_output = str(task_output)
        # Clean potential markdown
        clean_json = raw_output.replace("```json", "").replace("```", "").strip()
        # Attempt standard parse
        return json.loads(clean_json)
        
    except Exception as e:
        # If standard parse fails, try the repair function
        try:
            return json.loads(repair_json(str(task_output)))
        except:
            print(f"⚠️ Failed to extract data: {e}")
            return None

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"
        
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1,
            max_tokens=10000,
        )

        agents_config = copy.deepcopy(GLOBAL_AGENTS_CONFIG)
        tasks_config = copy.deepcopy(GLOBAL_TASKS_CONFIG)

        # Specialist Agents
        security_agent = Agent(config=agents_config['security_auditor'], llm=llm, allow_delegation=False, verbose=True)
        privacy_ops_agent = Agent(config=agents_config['privacy_officer'], llm=llm, allow_delegation=False, verbose=True)
        rai_agent = Agent(config=agents_config['rai_director'], llm=llm, allow_delegation=False, verbose=True)
        qa_agent = Agent(config=agents_config['qa_engineer'], llm=llm, allow_delegation=False, verbose=True)
        report_agent = Agent(config=agents_config['governance_officer'], llm=llm, allow_delegation=False, verbose=True)

        # Tasks
        task_security = Task(config=tasks_config['security_audit_task'], agent=security_agent, async_execution=True)
        task_privacy = Task(config=tasks_config['privacy_audit_task'], agent=privacy_ops_agent, async_execution=True)
        task_rai = Task(config=tasks_config['rai_audit_task'], agent=rai_agent, async_execution=True)
        task_qa = Task(config=tasks_config['qa_audit_task'], agent=qa_agent, async_execution=True)

        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        agents_list = [security_agent, privacy_ops_agent, rai_agent, qa_agent]
        
        task_tiering = None
        task_green = None

        if request.enable_profiling:
            tiering_agent = Agent(config=agents_config['cost_architect'], llm=llm, verbose=True)
            task_tiering = Task(config=tasks_config['cost_profiling_task'], agent=tiering_agent, async_execution=True)
            
            agents_list.extend([tiering_agent])
            tasks_list.extend([task_tiering])

        if request.enable_greenai_analysis:
            green_plugin = GreenAIPlugin()
            green_agent = green_plugin.get_agent(llm, agents_config)
            task_green = green_plugin.get_task(green_agent, request.instruction, tasks_config)

            agents_list.extend([green_agent])
            tasks_list.extend([task_green])

        # Synthesis Task
        task_report = Task(
            config=tasks_config['report_synthesis_task'],
            expected_output="A complete JSON object following the GuardrailAnalysis schema.",
            agent=report_agent,
            context=[task_security, task_privacy, task_rai, task_qa],
            output_pydantic=GuardrailAnalysis
        )
        tasks_list.append(task_report)
        agents_list.append(report_agent)

        crew = Crew(agents=agents_list, tasks=tasks_list, process=Process.sequential, verbose=True)
        result = crew.kickoff(inputs={
            'instruction': request.instruction,
            'CATEGORY_GUIDELINES': CATEGORY_GUIDELINES,
            'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT,
            'CRITICAL_JSON_RULES': CRITICAL_JSON_RULES
        })

        # --- IMPROVED DATA EXTRACTION & MERGING ---
        
        # 1. Main Report
        parsed_result = extract_data(result)
        if not parsed_result:
             # Emergency fallback
             parsed_result = json.loads(repair_json(str(result)))

        # 2. Tiering Strategy
        if request.enable_profiling and task_tiering:
            tier_data = extract_data(task_tiering.output)
            if tier_data:
                parsed_result['tiering_strategy'] = tier_data
                print("✅ Tiering Strategy merged.")

        # 3. Green AI Analysis (The Fix)
        if request.enable_profiling and task_green:
            green_data = extract_data(task_green.output)
            if green_data:
                parsed_result['green_ai_analysis'] = green_data
                print(f"✅ Green AI Data merged: {green_data.get('status', 'Unknown')}")
            else:
                print("⚠️ Green AI task finished but returned no valid data.")

        return {"result": json.dumps(parsed_result, indent=2)}

    except Exception as e:
        print(f"❌ Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
        
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')