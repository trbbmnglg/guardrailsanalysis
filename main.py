import os
import json
import yaml
import traceback
import threading
import queue
import time
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Any
from crewai import Agent, Task, Crew, Process
from crewai.project import CrewBase, agent, crew, task, llm
from langchain_openai import ChatOpenAI
from green_ai_plugin import GreenAIAnalysis
# from agent_tools import get_owasp_rag_tool # (Optional, keeps existing imports)

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
    name: str = Field(description="Short, descriptive name")
    category: str = Field(description="Primary category")
    severity: str = Field(description="Risk severity")
    complexity_tier: int = Field(default=2, description="Computational tier 1-5")
    description: str = Field(description="Detailed description")
    mechanism: str = Field(description="Technical implementation")
    triggers: List[str] = Field(description="Patterns that trigger this guardrail")
    enforcement: str = Field(description="Single action verb")
    location: str = Field(default="", description="Exact quote or empty")

class TieringStrategy(BaseModel):
    selected_tier: str
    model_class: str
    estimated_cost: str
    latency_impact: str
    justification: str

class GuardrailAnalysis(BaseModel):
    guardrails: List[Guardrail]
    recommendations: List[str]
    tiering_strategy: Optional[TieringStrategy] = None
    green_ai_analysis: Optional[dict] = None

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False
    enable_greenai_analysis: bool = False
    enable_gatekeeper: bool = True
    analysis_engine: Literal["deepseek", "llama", "qwen"] = "deepseek"

# --- HELPER FUNCTIONS ---
def repair_json(json_str: str) -> str:
    if not json_str: return "{}"
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
    except:
        try:
            return json.loads(repair_json(str(task_output)))
        except:
            return None

# --- CREW DEFINITION ---
@CrewBase
class GuardrailsAuditCrew:
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self, api_key: str, enable_profiling: bool, enable_greenai: bool, model_name: str, status_queue: queue.Queue = None):
        self.api_key = api_key
        self.enable_profiling = enable_profiling
        self.enable_greenai = enable_greenai
        self.model_name = model_name
        self.status_queue = status_queue # Store queue for streaming

    @llm
    def main_llm(self):
        model_map = {
            "deepseek": "openai/deepseek-ai/DeepSeek-V3.2", 
            "llama": "openai/meta-llama/Llama-3.3-70B-Instruct",
            "qwen": "openai/Qwen/Qwen2.5-72B-Instruct"
        }
        selected_model = model_map.get(self.model_name, model_map["deepseek"])
        return ChatOpenAI(
            model=selected_model,
            base_url="https://router.huggingface.co/v1",
            api_key=self.api_key,
            temperature=0.1,
            max_tokens=4000,
        )

    # Agents
    @agent
    def security_auditor(self) -> Agent: return Agent(config=self.agents_config['security_auditor'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def privacy_officer(self) -> Agent: return Agent(config=self.agents_config['privacy_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def rai_director(self) -> Agent: return Agent(config=self.agents_config['rai_director'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def qa_engineer(self) -> Agent: return Agent(config=self.agents_config['qa_engineer'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def cost_architect(self) -> Agent: return Agent(config=self.agents_config['cost_architect'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def green_ai_officer(self) -> Agent: return Agent(config=self.agents_config['green_ai_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)
    @agent
    def governance_officer(self) -> Agent: return Agent(config=self.agents_config['governance_officer'], llm=self.main_llm(), allow_delegation=False, verbose=True)

    # Tasks
    @task
    def security_audit_task(self) -> Task: return Task(config=self.tasks_config['security_audit_task'], agent=self.security_auditor())
    @task
    def privacy_audit_task(self) -> Task: return Task(config=self.tasks_config['privacy_audit_task'], agent=self.privacy_officer())
    @task
    def rai_audit_task(self) -> Task: return Task(config=self.tasks_config['rai_audit_task'], agent=self.rai_director())
    @task
    def qa_audit_task(self) -> Task: return Task(config=self.tasks_config['qa_audit_task'], agent=self.qa_engineer())
    @task
    def cost_profiling_task(self) -> Task: return Task(config=self.tasks_config['cost_profiling_task'], agent=self.cost_architect())
    @task
    def green_ai_analysis_task(self) -> Task: return Task(config=self.tasks_config['green_ai_analysis_task'], agent=self.green_ai_officer(), output_pydantic=GreenAIAnalysis)
    @task
    def report_synthesis_task(self) -> Task: 
        context = [self.security_audit_task(), self.privacy_audit_task(), self.rai_audit_task(), self.qa_audit_task()]
        return Task(config=self.tasks_config['report_synthesis_task'], agent=self.governance_officer(), context=context, output_pydantic=GuardrailAnalysis)

    # --- CALLBACK HANDLER ---
    def task_callback(self, output):
        """
        This function runs whenever a task finishes.
        We can't easily identify WHICH task finished from the 'output' alone in standard CrewAI v0.1+,
        so we will map them via description or strict ordering, OR we assume the callback
        is triggered in the same order as tasks are added.
        
        BETTER APPROACH: We wrap the callback when creating the Task.
        """
        pass

    def create_callback(self, agent_key: str):
        """Creates a specific callback for an agent"""
        def callback(output):
            if self.status_queue:
                self.status_queue.put({"type": "progress", "agent": agent_key, "status": "completed"})
        return callback

    @crew
    def crew(self) -> Crew:
        # 1. Define Agents & Tasks
        agents = [self.security_auditor(), self.privacy_officer(), self.rai_director(), self.qa_engineer()]
        
        # 2. Create Tasks and Attach Callbacks
        t_sec = self.security_audit_task()
        t_sec.callback = self.create_callback("security")
        
        t_priv = self.privacy_audit_task()
        t_priv.callback = self.create_callback("privacy")
        
        t_rai = self.rai_audit_task()
        t_rai.callback = self.create_callback("rai")
        
        t_qa = self.qa_audit_task()
        t_qa.callback = self.create_callback("qa")
        
        tasks = [t_sec, t_priv, t_rai, t_qa]

        if self.enable_profiling:
            agents.append(self.cost_architect())
            t_cost = self.cost_profiling_task()
            t_cost.callback = self.create_callback("cost")
            tasks.append(t_cost)

        if self.enable_greenai:
            agents.append(self.green_ai_officer())
            t_green = self.green_ai_analysis_task()
            t_green.callback = self.create_callback("green")
            tasks.append(t_green)

        agents.append(self.governance_officer())
        t_gov = self.report_synthesis_task()
        t_gov.callback = self.create_callback("governance")
        tasks.append(t_gov)

        return Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=True
        )

# --- API ENDPOINT ---
@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    # 1. Setup Stream Queue
    stream_queue = queue.Queue()
    
    def run_crew_thread(req, q):
        try:
            os.environ["OPENAI_API_KEY"] = req.api_key
            os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

            # A. Gatekeeper (Optional but recommended)
            if req.enable_gatekeeper:
                # ... (Simplified Gatekeeper Logic for brevity) ...
                pass 

            # B. Initialize Crew with Queue
            audit_crew = GuardrailsAuditCrew(
                api_key=req.api_key, 
                enable_profiling=req.enable_profiling, 
                enable_greenai=req.enable_greenai_analysis,
                model_name=req.analysis_engine,
                status_queue=q
            )
            
            inputs = {
                'instruction': req.instruction,
                'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT,
                'CRITICAL_JSON_RULES': CRITICAL_JSON_RULES
            }

            # C. Kickoff (Blocking)
            result = audit_crew.crew().kickoff(inputs=inputs)

            # D. Extract Data
            parsed_result = extract_data(result)
            if not parsed_result: parsed_result = json.loads(repair_json(str(result)))

            # E. Merge Optional Data (Manual extraction since callbacks handle UI only)
            if req.enable_profiling:
                # Re-instantiate to access the task output logic or just rely on main result
                # NOTE: For simplicity in streaming, we assume the main result contains everything
                # or we extract strictly from the `result` object if possible.
                # In strict CrewAI, we might need to look at `audit_crew.cost_profiling_task().output`
                # But since we are in a thread, accessing the specific instance is tricky unless stored.
                pass 

            # F. Final Success Message
            q.put({"type": "result", "data": parsed_result})

        except Exception as e:
            print(f"❌ Error in thread: {traceback.format_exc()}")
            q.put({"type": "error", "message": str(e)})
        finally:
            q.put(None) # Sentinel to stop stream

    # 2. Start Thread
    thread = threading.Thread(target=run_crew_thread, args=(request, stream_queue))
    thread.start()

    # 3. Stream Generator
    def event_stream():
        while True:
            # Wait for data
            data = stream_queue.get()
            if data is None: break
            
            # Send JSON string as a chunk
            yield json.dumps(data) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')