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
    """Enhanced JSON repair with better error handling"""
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    
    # Remove any leading/trailing text before/after JSON
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = json_str[start_idx:end_idx + 1]
    
    # Balance braces and brackets
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')
    if json_str.count('"') % 2 != 0: 
        json_str += '"'
    json_str += ']' * open_brackets
    json_str += '}' * open_braces
    
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
For each checkpoint, provide:
- Name: Specific guardrail name
- Status: PRESENT or MISSING
- Location: Exact quote from instruction (if PRESENT) or empty string (if MISSING)
- Severity: Critical | High | Medium | Low (for MISSING items, explain risk)
- Category: Use EXACT category names from guidelines
- Enforcement: Single action verb (e.g., "Block", "Log", "Redact", "Validate")
- Description: Brief explanation of what this guardrail prevents
- Mechanism: How it should be technically implemented
- Triggers: List of keywords/patterns that activate this guardrail

COLLABORATION GUIDELINES:
- If you're unsure about domain-specific risks, ASK the Strategy Lead
- If a finding overlaps with another agent's domain, MENTION it naturally
  Example: "This SQL injection risk also impacts Privacy - Privacy Officer should verify"
- Focus on YOUR domain but be aware of others
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

        # =============================================================
        # PHASE 1: STRATEGIC RECONNAISSANCE
        # =============================================================
        
        strategy_agent = Agent(
            config=agents_config['audit_strategy_lead'], 
            llm=llm, 
            allow_delegation=True,  # ✅ FIXED: Can answer questions from specialists
            verbose=True
        )
        
        task_strategy = Task(
            config=tasks_config['strategic_recon_task'], 
            agent=strategy_agent, 
            async_execution=False  # ✅ Must complete before Phase 2
        )

        # =============================================================
        # PHASE 2: SPECIALIST AUDITS (with collaboration enabled)
        # =============================================================
        
        security_agent = Agent(
            config=agents_config['security_auditor'], 
            llm=llm, 
            allow_delegation=True,  # ✅ FIXED: Can ask Strategy/Privacy for clarification
            verbose=True
        )
        
        privacy_ops_agent = Agent(
            config=agents_config['privacy_officer'], 
            llm=llm, 
            allow_delegation=True,  # ✅ FIXED: Can coordinate with Security
            verbose=True
        )
        
        rai_agent = Agent(
            config=agents_config['rai_director'], 
            llm=llm, 
            allow_delegation=True,  # ✅ FIXED: Can collaborate with QA on overlaps
            verbose=True
        )
        
        qa_agent = Agent(
            config=agents_config['qa_engineer'], 
            llm=llm, 
            allow_delegation=True,  # ✅ FIXED: Can coordinate with RAI
            verbose=True
        )

        # ✅ CRITICAL FIX: Remove async_execution from audit tasks
        # Let them run sequentially so they can see each other's work
        task_security = Task(
            config=tasks_config['security_audit_task'], 
            agent=security_agent, 
            context=[task_strategy],  # Gets strategy output
            async_execution=False  # ✅ Sequential for collaboration
        )
        
        task_privacy = Task(
            config=tasks_config['privacy_audit_task'], 
            agent=privacy_ops_agent, 
            context=[task_strategy, task_security],  # ✅ Can see security findings
            async_execution=False
        )
        
        task_rai = Task(
            config=tasks_config['rai_audit_task'], 
            agent=rai_agent, 
            context=[task_strategy, task_security, task_privacy],  # ✅ Full context
            async_execution=False
        )
        
        task_qa = Task(
            config=tasks_config['qa_audit_task'], 
            agent=qa_agent, 
            context=[task_strategy, task_security, task_privacy, task_rai],  # ✅ Full context
            async_execution=False
        )

        agents_list = [strategy_agent, security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_strategy, task_security, task_privacy, task_rai, task_qa]
        report_context = [task_strategy, task_security, task_privacy, task_rai, task_qa]

        # =============================================================
        # PHASE 2B: OPTIONAL COST PROFILING (runs independently)
        # =============================================================
        
        task_tiering = None

        if request.enable_profiling:
            tiering_agent = Agent(
                config=agents_config['cost_architect'], 
                llm=llm, 
                allow_delegation=False,  # ✅ Focused specialist, no delegation needed
                verbose=True
            )
            
            task_tiering = Task(
                config=tasks_config['cost_profiling_task'], 
                agent=tiering_agent,
                context=[task_strategy],  # ✅ Gets strategy brief for context
                async_execution=True,  # ✅ Can run in parallel
                output_pydantic=TieringStrategy 
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)

        # =============================================================
        # PHASE 3: GOVERNANCE SYNTHESIS
        # =============================================================

        report_agent = Agent(
            config=agents_config['governance_officer'], 
            llm=llm, 
            allow_delegation=True,  # ✅ CRITICAL: Must be True for interrogation
            verbose=True
        )
        
        # ✅ FIXED: Simplified instructions for Governance Officer
        task_report = Task(
            description=f"""**FINAL COMPLIANCE REPORT SYNTHESIS**

You are receiving audit findings from Security, Privacy, RAI, and QA specialists.

**YOUR MISSION:**
1. **Review All Findings**: Examine outputs from all audit agents
2. **Eliminate Duplicates**: If 2+ agents flag the same issue (same location quote), merge into ONE guardrail
3. **Resolve Conflicts**: If agents disagree on severity, ASK them for justification
   - Example: "Security Agent, why is the API Key issue 'Medium'? Privacy marked it 'Critical'."
4. **Assign Final Ratings**: You have veto power on severity and category
5. **Generate Recommendations**: Provide 3-5 strategic, actionable recommendations

**DEDUPLICATION RULES:**
- Compare the 'location' field: if quotes overlap >80%, it's a duplicate
- Keep the highest severity rating
- Use the most specific category (Security > Privacy > RAI > QA)

**SEVERITY ASSESSMENT:**
- Critical: Regulatory violation risk, immediate breach potential, safety failure
- High: Significant compliance gap, moderate breach risk, ethical concern
- Medium: Best practice deviation, minor gap
- Low: Documentation issue, minor improvement

**COLLABORATION NOTES:**
- If unsure about a technical detail, ASK the specialist agent
- If severity conflicts exist, DELEGATE verification back to the agent
- Your final output is the source of truth

**OUTPUT FORMAT:**
Pure JSON matching this structure (NO markdown, NO code blocks):

{{
  "guardrails": [
    {{
      "name": "Descriptive Guardrail Name",
      "category": "Security|Privacy|Responsible AI|QA|Scope Control|Input Validation|Output Control",
      "severity": "Critical|High|Medium|Low",
      "complexity_tier": 1-5,
      "description": "What this guardrail prevents or enforces",
      "mechanism": "Technical implementation approach",
      "triggers": ["keyword1", "keyword2"],
      "enforcement": "Single action verb",
      "location": "Quote from prompt or empty string"
    }}
  ],
  "recommendations": [
    "Specific recommendation 1 with measurable outcome",
    "Specific recommendation 2 addressing compliance gap",
    "Specific recommendation 3 for quality improvement"
  ],
  "tiering_strategy": null
}}

{CRITICAL_JSON_RULES}

AI INSTRUCTION BEING AUDITED:
{request.instruction}

CATEGORY GUIDELINES:
{CATEGORY_GUIDELINES}
""",
            expected_output="Valid JSON matching GuardrailAnalysis schema",
            agent=report_agent,
            context=report_context,  # ✅ Gets ALL audit outputs
            async_execution=False,
            output_pydantic=GuardrailAnalysis
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        # =============================================================
        # CREW EXECUTION
        # =============================================================

        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential,  # ✅ Tasks run in order with context sharing
            memory=True,  # ✅ Agents remember past interactions
            embedder={  # ✅ Required for memory
                "provider": "openai",
                "config": {"model": "text-embedding-3-small"}
            }
        )
        
        result = crew.kickoff(inputs={
            'instruction': request.instruction,
            'CATEGORY_GUIDELINES': CATEGORY_GUIDELINES,
            'AUDIT_OUTPUT_FORMAT': AUDIT_OUTPUT_FORMAT,
            'CRITICAL_JSON_RULES': CRITICAL_JSON_RULES
        })

        # =============================================================
        # OUTPUT PROCESSING & MERGING
        # =============================================================
        
        # 1. Parse the main Guardrail Report
        final_output_str = ""
        if hasattr(result, 'pydantic') and result.pydantic:
            try: 
                final_output_str = result.pydantic.model_dump_json()
            except AttributeError: 
                final_output_str = result.pydantic.json()
        else:
            final_output_str = str(result)

        # Cleanup JSON string
        final_output_str = repair_json(final_output_str.replace("```json", "").replace("```", "").strip())
        
        try:
            parsed_result = json.loads(final_output_str)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON Parse Error: {e}")
            # Fallback regex extraction
            match = re.search(r'\{.*\}', final_output_str, re.DOTALL)
            if match: 
                parsed_result = json.loads(repair_json(match.group()))
            else: 
                raise ValueError(f"Failed to parse Report Agent output: {final_output_str[:500]}")

        # 2. If Profiling was ON, inject the Cost Data
        if request.enable_profiling and task_tiering and hasattr(task_tiering, 'output'):
            try:
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
                # Normalize MISSING guardrails
                if gr.get("name", "").upper().startswith("MISSING"): 
                    gr["location"] = ""
                
                # Default values
                if "enforcement" not in gr or not gr["enforcement"]: 
                    gr["enforcement"] = "Log" 
                if "location" not in gr: 
                    gr["location"] = "" 
                if "complexity_tier" not in gr: 
                    gr["complexity_tier"] = 2
                
                # Ensure triggers is always a list
                if "triggers" not in gr:
                    gr["triggers"] = []
                elif isinstance(gr["triggers"], str):
                    gr["triggers"] = [gr["triggers"]]

        return {"result": json.dumps(parsed_result, indent=2)}

    except Exception as e:
        import traceback
        print(f"❌ Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================
# STATIC FILES & INDEX
# =============================================================

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')