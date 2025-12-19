import os
import json
import yaml
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from crewai.project import CrewBase, agent, crew, task, llm
from langchain_openai import ChatOpenAI
from green_ai_plugin import GreenAIAnalysis
from agent_tools import get_owasp_rag_tool

app = FastAPI()

# --- CONSTANTS & GUIDELINES ---
AUDIT_OUTPUT_FORMAT = """
    CRITICAL: You MUST use EXACTLY these Category names (case-sensitive):
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
    - If guardrail EXISTS: Provide max 8 words exact quote from instruction
    - If guardrail is MISSING: Set location to empty string ""
    
    CRITICAL: For each check:
    - Name: Specific guardrail name
    - Status: PRESENT or MISSING
    - Location: Exact quote from instruction (if PRESENT) or empty string (if MISSING)
    - Severity: Critical | High | Medium | Low
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
    green_ai_analysis: Optional[dict] = Field(default=None, description="Optional Green AI analysis")

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False
    enable_greenai_analysis: bool = False
    enable_gatekeeper: bool = True

def repair_json(json_str: str) -> str:
    if not json_str: return "{}"
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = json_str[start_idx:end_idx + 1]
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')
    if json_str.count('"') % 2 != 0: json_str += '"'
    json_str += ']' * max(0, open_brackets)
    json_str += '}' * max(0, open_braces)
    return json_str

def extract_data(task_output):
    try:
        if hasattr(task_output, 'pydantic') and task_output.pydantic:
            return task_output.pydantic.model_dump()
        if hasattr(task_output, 'model_dump'):
            return task_output.model_dump()
        if hasattr(task_output, 'dict'):
            return task_output.dict()
        raw_output = str(task_output)
        clean_json = raw_output.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        try:
            return json.loads(repair_json(str(task_output)))
        except:
            print(f"⚠️ Failed to extract data: {e}")
            return None

# --- GATEKEEPER ---
async def validate_instruction_gatekeeper(instruction: str, llm: ChatOpenAI):
    prompt = f"""
    You are a Security Gatekeeper for an AI Audit System.
    Your ONLY job is to classify if the INPUT below is a valid "System Instruction" or "Agent Definition" that needs auditing.

    REJECT (Return "valid": false) IF:
    - It is raw code (Python, JS, HTML, CSS) without context.
    - It is spam, gibberish, or random characters.
    - It is extremely short (under 3 words) like "hi" or "test".
    - It is a question asking YOU to do something unrelated to defining an AI agent.
    - It is an explanation, tutorial, or commentary *about* code (e.g. "Why this works...", "Here is the fix...").
    - It looks like a copy-pasted response from another AI.

    ACCEPT (Return "valid": true) IF:
    - It explicitly defines an AI persona, role, or task.
    - It is a prompt giving instructions to an AI Model.

    INPUT TO CLASSIFY:
    '''{instruction[:2000]}'''

    RETURN ONLY JSON:
    {{
        "valid": boolean,
        "reason": "Short explanation of why it was rejected (max 10 words)"
    }}
    """
    try:
        response = llm.invoke(prompt)
        content = response.content
        data = json.loads(repair_json(content))
        return data
    except Exception as e:
        # 🔴 CHANGED: Return a specific error key instead of defaulting to Valid=True
        print(f"⚠️ Gatekeeper System Error: {e}")
        return {"system_error": str(e)}

# --- CREW DEFINITION ---
@CrewBase
class GuardrailsAuditCrew:
    """Guardrails Audit Crew"""
    
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self, api_key: str, enable_profiling: bool = False, enable_greenai: bool = False):
        self.api_key = api_key
        self.enable_profiling = enable_profiling
        self.enable_greenai = enable_greenai

    # --- 1. LLM DEFINITION (@llm) ---
    # This defines the model once. We can reference self.main_llm() in agents.
    @llm
    def main_llm(self):
        return ChatOpenAI(
            #model="openai/meta-llama/Llama-3.3-70B-Instruct",
            #model="openai/deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
            model="openai/deepseek-ai/DeepSeek-V3.2",
            base_url="https://router.huggingface.co/v1",
            api_key=self.api_key,
            temperature=0.1,
            max_tokens=4000,
        )

    # --- 2. AGENTS ---
    @agent
    def security_auditor(self) -> Agent:
        #owasp_tool = get_owasp_rag_tool(api_key=self.api_key)
        #tools_list = [owasp_tool] if owasp_tool else []
        return Agent(config=self.agents_config['security_auditor'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    @agent
    def privacy_officer(self) -> Agent:
        return Agent(config=self.agents_config['privacy_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    @agent
    def rai_director(self) -> Agent:
        return Agent(config=self.agents_config['rai_director'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    @agent
    def qa_engineer(self) -> Agent:
        return Agent(config=self.agents_config['qa_engineer'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    
    @agent
    def cost_architect(self) -> Agent:
        return Agent(config=self.agents_config['cost_architect'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    @agent
    def green_ai_officer(self) -> Agent:
        return Agent(config=self.agents_config['green_ai_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    @agent
    def governance_officer(self) -> Agent:
        return Agent(config=self.agents_config['governance_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    # --- 3. TASKS ---
    @task
    def security_audit_task(self) -> Task:
        return Task(config=self.tasks_config['security_audit_task'], agent=self.security_auditor(), async_execution=True)

    @task
    def privacy_audit_task(self) -> Task:
        return Task(config=self.tasks_config['privacy_audit_task'], agent=self.privacy_officer(), async_execution=True)

    @task
    def rai_audit_task(self) -> Task:
        return Task(config=self.tasks_config['rai_audit_task'], agent=self.rai_director(), async_execution=True)

    @task
    def qa_audit_task(self) -> Task:
        return Task(config=self.tasks_config['qa_audit_task'], agent=self.qa_engineer(), async_execution=True)

    @task
    def cost_profiling_task(self) -> Task:
        return Task(config=self.tasks_config['cost_profiling_task'], agent=self.cost_architect(), async_execution=True)

    # [USECASE] output_pydantic passed to Task constructor
    @task
    def green_ai_analysis_task(self) -> Task:
        return Task(
            config=self.tasks_config['green_ai_analysis_task'], 
            agent=self.green_ai_officer(), 
            output_pydantic=GreenAIAnalysis
        )

    # [USECASE] output_pydantic passed to Task constructor
    @task
    def report_synthesis_task(self) -> Task:
        core_tasks = [self.security_audit_task(), self.privacy_audit_task(), self.rai_audit_task(), self.qa_audit_task()]
        return Task(
            config=self.tasks_config['report_synthesis_task'],
            agent=self.governance_officer(),
            context=core_tasks,
            output_pydantic=GuardrailAnalysis # Forces Strict JSON Schema
        )

    # --- 4. CREW ---
    @crew
    def crew(self) -> Crew:
        """Creates the Guardrails Audit Crew"""
        agents = [self.security_auditor(), self.privacy_officer(), self.rai_director(), self.qa_engineer()]
        tasks = [self.security_audit_task(), self.privacy_audit_task(), self.rai_audit_task(), self.qa_audit_task()]

        if self.enable_profiling:
            agents.append(self.cost_architect())
            tasks.append(self.cost_profiling_task())

        if self.enable_greenai:
            agents.append(self.green_ai_officer())
            tasks.append(self.green_ai_analysis_task())

        agents.append(self.governance_officer())
        tasks.append(self.report_synthesis_task())

        return Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=True
        )

# --- API ENDPOINT ---
@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"
        
        # 1. Gatekeeper
        if request.enable_gatekeeper:
            gatekeeper_llm = ChatOpenAI(
                model="Qwen/Qwen2.5-72B-Instruct",
                base_url="https://router.huggingface.co/v1",
                api_key=request.api_key,
                temperature=0.6,
                max_tokens=500,
            )
            print("🛡️ Running Gatekeeper Check...")
            gatekeeper_result = await validate_instruction_gatekeeper(request.instruction, gatekeeper_llm)
            
            if "system_error" in gatekeeper_result:
                error_msg = gatekeeper_result["system_error"]
                print(f"⛔ Gatekeeper Failed to Run: {error_msg}")
                raise HTTPException(
                    status_code=503,
                    detail=f"Gatekeeper LLM Error: Unable to verify input safety. ({error_msg})"
                )

            if not gatekeeper_result.get("valid", True):
                print(f"⛔ Gatekeeper Rejected Content: {gatekeeper_result.get('reason')}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid Instruction Rejected: {gatekeeper_result.get('reason', 'Input does not look like an agent prompt.')}"
                )
            
            print("✅ Gatekeeper Passed.")

        # 2. Run Crew
        audit_crew = GuardrailsAuditCrew(
            api_key=request.api_key, 
            enable_profiling=request.enable_profiling, 
            enable_greenai=request.enable_greenai_analysis
        )
        
        inputs = {
            'instruction': request.instruction,
            'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT,
            'CRITICAL_JSON_RULES': CRITICAL_JSON_RULES
        }

        result = audit_crew.crew().kickoff(inputs=inputs)

        # 3. Extract Data
        parsed_result = extract_data(result)
        if not parsed_result:
             parsed_result = json.loads(repair_json(str(result)))

        # 4. Merge Optional Data
        if request.enable_profiling:
             tier_task = audit_crew.cost_profiling_task()
             if tier_task and tier_task.output:
                 tier_data = extract_data(tier_task.output)
                 if tier_data: parsed_result['tiering_strategy'] = tier_data

        if request.enable_greenai_analysis:
             green_task = audit_crew.green_ai_analysis_task()
             if green_task and green_task.output:
                 green_data = extract_data(green_task.output)
                 if green_data: parsed_result['green_ai_analysis'] = green_data

        return {"result": json.dumps(parsed_result, indent=2)}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')