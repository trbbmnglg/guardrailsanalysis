import os
import json  # Tiyaking nandito ito sa labas
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

# (Guilidelines and Formats variables remain the same as your input...)
CATEGORY_GUIDELINES = """...""" # Use your original string here
AUDIT_OUTPUT_FORMAT = """...""" # Use your original string here
CRITICAL_JSON_RULES = """...""" # Use your original string here

# --- PYDANTIC MODELS ---
class Guardrail(BaseModel):
    name: str
    category: str # Changed to str to be more flexible during parsing errors
    severity: str
    complexity_tier: int = 2
    description: str
    mechanism: str
    triggers: List[str] = []
    enforcement: str = "Log"
    location: str = ""

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

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    # Sinisiguro natin na ang json module ay accessible sa loob
    import json 
    
    try:
        os.environ["OPENAI_API_KEY"] = request.api_key
        
        # In-increase ang max_tokens para hindi ma-EOF (End of File)
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1,
            max_tokens=8000, # Tinaasan para sa mahabang JSON
        )

        agents_config = copy.deepcopy(GLOBAL_AGENTS_CONFIG)
        tasks_config = copy.deepcopy(GLOBAL_TASKS_CONFIG)

        # Specialist Agents (Setup based on your config)
        security_agent = Agent(config=agents_config['security_auditor'], llm=llm, verbose=True)
        privacy_ops_agent = Agent(config=agents_config['privacy_officer'], llm=llm, verbose=True)
        rai_agent = Agent(config=agents_config['rai_director'], llm=llm, verbose=True)
        qa_agent = Agent(config=agents_config['qa_engineer'], llm=llm, verbose=True)
        report_agent = Agent(config=agents_config['governance_officer'], llm=llm, verbose=True)

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
            # Tiering Logic
            tiering_agent = Agent(config=agents_config['cost_architect'], llm=llm, verbose=True)
            task_tiering = Task(config=tasks_config['cost_profiling_task'], agent=tiering_agent, async_execution=True)
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            
            # Green AI Logic
            green_plugin = GreenAIPlugin()
            green_agent = green_plugin.get_agent(llm)
            task_green = green_plugin.get_task(green_agent, request.instruction)
            agents_list.append(green_agent)
            tasks_list.append(task_green)

        # Synthesis Task - Ito yung gumagawa ng Final JSON
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

        # --- SMART PARSING ---
        final_output_str = ""
        if hasattr(result, 'pydantic') and result.pydantic:
            final_output_str = result.pydantic.model_dump_json()
        else:
            final_output_str = str(result)

        # Step 1: Repair the JSON string before parsing
        repaired_str = repair_json(final_output_str)
        
        try:
            parsed_result = json.loads(repaired_str)
        except json.JSONDecodeError:
            # Fallback: Find JSON pattern if standard parsing fails
            match = re.search(r'\{.*\}', repaired_str, re.DOTALL)
            if match:
                parsed_result = json.loads(repair_json(match.group()))
            else:
                raise ValueError("AI Output is not valid JSON even after repair.")

        # --- MERGING ADDITIONAL DATA ---
        if request.enable_profiling:
            if task_tiering and task_tiering.output:
                try:
                    parsed_result['tiering_strategy'] = json.loads(repair_json(str(task_tiering.output)))
                except: pass
            
            if task_green and task_green.output:
                try:
                    # Specific Green AI logic
                    raw_green = str(task_green.output).replace("```json", "").replace("```", "").strip()
                    parsed_result['green_ai_analysis'] = json.loads(repair_json(raw_green))
                except: pass

        return {"result": json.dumps(parsed_result, indent=2)}

    except Exception as e:
        print(f"❌ Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Static mount...
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')