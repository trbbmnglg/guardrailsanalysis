import os
import json
import traceback
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from crewai.project import CrewBase, agent, crew, task, llm
from crewai.knowledge.source.pdf_knowledge_source import PDFKnowledgeSource
from langchain_openai import ChatOpenAI
from green_ai_plugin import GreenAIAnalysis

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
    enable_reasoning: bool = False
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
        # FIX: Use ainvoke (async) to prevent blocking the event loop
        response = await llm.ainvoke(prompt)
        content = response.content
        data = json.loads(repair_json(content))
        return data
    except Exception as e:
        print(f"⚠️ Gatekeeper System Error: {e}")
        return {"system_error": str(e)}
        
# --- CREW DEFINITION ---
@CrewBase
class GuardrailsAuditCrew:
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self, api_key: str, enable_profiling: bool, enable_greenai: bool, enable_reasoning: bool, model_name: str, status_queue: asyncio.Queue = None):
        self.api_key = api_key
        self.enable_profiling = enable_profiling
        self.enable_greenai = enable_greenai
        self.enable_reasoning = enable_reasoning
        self.model_name = model_name
        self.status_queue = status_queue
        self.loop = asyncio.get_running_loop() if status_queue else None

        self.security_knowledge = []
        kb_filename = "LLMAll_en-US_FINAL.pdf" 
        kb_physical_path = os.path.join("knowledge", kb_filename)

        if os.path.exists(kb_physical_path):
            try:
                self.security_knowledge = [PDFKnowledgeSource(file_paths=[kb_filename])]
                print(f"✅ Loaded Knowledge Base: {kb_filename}")
            except Exception as e:
                print(f"⚠️ Failed to load Knowledge PDF: {e}")
        else:
            print(f"ℹ️ Knowledge file not found at {kb_physical_path}, skipping.")

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
            temperature=0.0,
            max_tokens=10000,
        )

    # Agents
    @agent
    def security_auditor(self) -> Agent: return Agent(
        config=self.agents_config['security_auditor'],
        llm=self.main_llm(),
        reasoning=self.enable_reasoning,
        knowledge_sources=self.security_knowledge
    )
        
    @agent
    def privacy_officer(self) -> Agent: return Agent(config=self.agents_config['privacy_officer'], llm=self.main_llm(), reasoning=self.enable_reasoning)
    @agent
    def rai_director(self) -> Agent: return Agent(config=self.agents_config['rai_director'], llm=self.main_llm(), reasoning=self.enable_reasoning)
    @agent
    def qa_engineer(self) -> Agent: return Agent(config=self.agents_config['qa_engineer'], llm=self.main_llm(), reasoning=self.enable_reasoning)
    @agent
    def cost_architect(self) -> Agent: return Agent(config=self.agents_config['cost_architect'], llm=self.main_llm(), reasoning=self.enable_reasoning)
    @agent
    def green_ai_officer(self) -> Agent: return Agent(config=self.agents_config['green_ai_officer'], llm=self.main_llm(), reasoning=self.enable_reasoning)
    @agent
    def governance_officer(self) -> Agent: return Agent(config=self.agents_config['governance_officer'], llm=self.main_llm(), reasoning=self.enable_reasoning)

    # Tasks
    @task
    def security_audit_task(self) -> Task: return Task(config=self.tasks_config['security_audit_task'], agent=self.security_auditor(), async_execution=True)
    @task
    def privacy_audit_task(self) -> Task: return Task(config=self.tasks_config['privacy_audit_task'], agent=self.privacy_officer(), async_execution=True)
    @task
    def rai_audit_task(self) -> Task: return Task(config=self.tasks_config['rai_audit_task'], agent=self.rai_director(), async_execution=True)
    @task
    def qa_audit_task(self) -> Task: return Task(config=self.tasks_config['qa_audit_task'], agent=self.qa_engineer(), async_execution=True)
    @task
    def cost_profiling_task(self) -> Task: return Task(config=self.tasks_config['cost_profiling_task'], agent=self.cost_architect())
    @task
    def green_ai_analysis_task(self) -> Task: return Task(config=self.tasks_config['green_ai_analysis_task'], agent=self.green_ai_officer(), output_pydantic=GreenAIAnalysis)
    @task
    def report_synthesis_task(self) -> Task: 
        context = [self.security_audit_task(), self.privacy_audit_task(), self.rai_audit_task(), self.qa_audit_task()]
        return Task(config=self.tasks_config['report_synthesis_task'], agent=self.governance_officer(), context=context, output_pydantic=GuardrailAnalysis)

    # Callback Handler
    def create_callback(self, agent_key: str):
        def callback(output):
            if self.status_queue and self.loop:
                try:
                    # Schedules the queue update on the main event loop
                    self.loop.call_soon_threadsafe(
                        self.status_queue.put_nowait,
                        {"type": "progress", "agent": agent_key, "status": "completed"}
                    )
                except Exception as e:
                    print(f"❌ Queue Error for {agent_key}: {e}")
        return callback

    @crew
    def crew(self) -> Crew:
        agents = [self.security_auditor(), self.privacy_officer(), self.rai_director(), self.qa_engineer()]
        
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
            verbose=True,
            embedder={
                "provider": "huggingface",
                "config": {
                    "model_name": "sentence-transformers/all-mpnet-base-v2",
                    "api_key": os.getenv("HF_TOKEN"),
                    "api_url": "https://api-inference.huggingface.co"
                }
            }
        )

# --- API ENDPOINT ---
@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    # 1. SETUP: Gatekeeper Check (Run BEFORE stream starts to allow 400 Errors)
    if request.enable_gatekeeper:
        try:
            gatekeeper_llm = ChatOpenAI(
                model="Qwen/Qwen2.5-72B-Instruct",
                base_url="https://router.huggingface.co/v1",
                api_key=request.api_key,
                temperature=0.6,
                max_tokens=500,
            )
            print("🛡️ Running Gatekeeper Check...")
            
            # Using Await/Async Invoke
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
        except HTTPException as he:
            raise he
        except Exception as e:
            # If gatekeeper setup fails entirely, allow pass or fail? Fails safe here.
            raise HTTPException(status_code=500, detail=f"Gatekeeper Initialization Error: {str(e)}")

    # 2. SETUP: Async Queue for Streaming
    stream_queue = asyncio.Queue()
    
    # 3. WORKER: The Background Crew Task
    async def run_crew_async(req, q):
        try:
            os.environ["OPENAI_API_KEY"] = req.api_key
            os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

            audit_crew = GuardrailsAuditCrew(
                api_key=req.api_key, 
                enable_profiling=req.enable_profiling, 
                enable_greenai=req.enable_greenai_analysis,
                enable_reasoning=req.enable_reasoning,
                model_name=req.analysis_engine,
                status_queue=q
            )
            
            inputs = {
                'instruction': req.instruction,
                'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT,
                'CRITICAL_JSON_RULES': CRITICAL_JSON_RULES
            }

            # C. KICKOFF
            result = await audit_crew.crew().kickoff_async(inputs=inputs)

            # D. Extract Governance Result
            parsed_result = extract_data(result)
            if not parsed_result: parsed_result = json.loads(repair_json(str(result)))

            # E. Merge Green AI & Cost Data
            if hasattr(result, 'tasks_output'):
                for task_out in result.tasks_output:
                    
                    # 1. Merge Green AI
                    if req.enable_greenai_analysis:
                        if hasattr(task_out, 'pydantic') and isinstance(task_out.pydantic, GreenAIAnalysis):
                            parsed_result['green_ai_analysis'] = task_out.pydantic.model_dump()
                        elif hasattr(task_out, 'agent') and "Eco-Efficiency" in str(task_out.agent):
                            extracted = extract_data(task_out)
                            if extracted: parsed_result['green_ai_analysis'] = extracted

                    # 2. Merge Cost/Tiering (Optional)
                    if req.enable_profiling and hasattr(task_out, 'agent') and "FinOps" in str(task_out.agent):
                        pass

            # F. Final Output
            await q.put({"type": "result", "data": parsed_result})

        except Exception as e:
            print(f"❌ Error in async task: {traceback.format_exc()}")
            # IMPORTANT: Push error to queue, do NOT raise exception (it would be swallowed by background task)
            await q.put({"type": "error", "message": str(e)})
        finally:
            await q.put(None)

    # 4. EXECUTION: Start Background Task
    asyncio.create_task(run_crew_async(request, stream_queue))

    # 5. RESPONSE: Start Stream
    async def event_stream():
        while True:
            data = await stream_queue.get()
            if data is None: break
            yield json.dumps(data) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')