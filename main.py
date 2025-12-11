import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

app = FastAPI()

# --- PYDANTIC MODELS FOR STRUCTURED OUTPUT ---
class Guardrail(BaseModel):
    """Structured model for a single guardrail - either present or missing"""
    name: str = Field(description="Short, descriptive name of the guardrail control")
    category: Literal["Security", "Privacy", "Responsible AI", "QA", "Scope Control", "Input Validation", "Output Control","Ethics"] = Field(description="Primary category")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(description="Risk severity if this control is missing")
    complexity_tier: int = Field(default=1, ge=1, le=4, description="Computational complexity tier (1=regex, 4=reasoning)")
    description: str = Field(description="Description of what this guardrail should do or why it's missing")
    mechanism: str = Field(description="Technical implementation suggestion (e.g., 'Use regex to block SQL keywords')")
    triggers: List[str] = Field(description="List of specific patterns, words, or conditions that should trigger this guardrail")
    enforcement: Literal["Block", "Mask", "Log", "Human Review", "Filter"] = Field(description="Recommended action when triggered")
    location: str = Field(default="", description="If control EXISTS: quote where it's defined. If MISSING: quote where it SHOULD be added or empty string.")

class TieringStrategy(BaseModel):
    """Computational tier recommendation"""
    selected_tier: str = Field(description="Recommended tier: Tier 1, Tier 2, Tier 3, or Tier 4")
    model_class: str = Field(description="Example model for this tier (e.g., 'Regex/Keyword', 'GPT-4', 'o3')")
    estimated_cost: str = Field(description="Estimated cost per 1M tokens")
    latency_impact: str = Field(description="Expected latency (e.g., ~50ms, ~2000ms)")
    justification: str = Field(description="Reasoning for tier selection")

class GuardrailAnalysis(BaseModel):
    """Complete analysis output"""
    guardrails: List[Guardrail] = Field(description="List of guardrails - both present and missing")
    recommendations: List[str] = Field(description="High-level recommendations for improving the agent's guardrails")
    tiering_strategy: Optional[TieringStrategy] = Field(default=None, description="Optional tiering analysis")

# --- REQUEST MODEL ---
class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 

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
            temperature=0.1,
            max_tokens=5000
        )

        # 2. DEFINE AGENTS
        security_agent = Agent(
            role='Deloitte Senior AI Risk Partner, Security & Compliance Auditor',
            goal='Audit the agent instruction to verify if proper security guardrails EXIST. Flag MISSING controls as risks.',
            backstory="""You are a security auditor specializing in OWASP Top 10 and ISO 42001. 
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - Input validation (SQL injection, XSS, prompt injection)
            - Authentication & authorization controls
            - Rate limiting and abuse prevention
            - Secure data handling
            
            For EACH expected security control:
            1. If PRESENT: Document it with location quote and enforcement method
            2. If MISSING: Flag it as a risk, explain why it's needed, suggest implementation""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='IAPP Privacy & Data Governance Auditor',
            goal='Audit for privacy controls. Flag MISSING privacy guardrails as risks.',
            backstory="""You are a privacy auditor following NIST AI RMF 1.0, GDPR, and CCPA.
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - PII handling and redaction
            - Data residency and storage limits
            - User consent mechanisms
            - Data retention policies
            - Scope boundaries""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            role='RAI Institute Ethics Auditor',
            goal='Audit for ethical controls. Flag MISSING fairness and accountability guardrails.',
            backstory="""You are an ethics auditor focusing on bias, fairness, and accountability.
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - Bias detection and mitigation
            - Fairness across demographics
            - Explainability requirements
            - Human oversight and escalation paths""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
            role='Qualitest AI Quality Assurance & Functional Auditor',
            goal='Audit for quality controls. Flag MISSING validation and testing guardrails.',
            backstory="""You evaluate prompt quality per ISO/IEC 25059.
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - Output format validation
            - Response length limits
            - Error handling procedures
            - Edge case coverage""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # 3. AUDIT TASKS
        task_security = Task(
            description=f"""AUDIT this agent instruction for security guardrails: '{request.instruction}'
            For EACH control:
            - If PRESENT: Document it (name, location quote, enforcement method)
            - If MISSING: Flag it as a RISK (name, severity, why it's needed, suggested mechanism)
            Output Format:
            1. List of PRESENT guardrails with quotes
            2. List of MISSING guardrails (these are the RISKS!)
            3. Severity for missing controls
            4. Recommended enforcement actions""",
            agent=security_agent,
            expected_output="Structured audit: present controls and missing controls (flagged as risks)"
        )
        
        task_privacy = Task(
            description=f"""AUDIT this agent instruction for privacy guardrails: '{request.instruction}'
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK with severity""",
            agent=privacy_ops_agent,
            expected_output="Privacy audit: present and missing controls with severity ratings"
        )
        
        task_rai = Task(
            description=f"""AUDIT this agent instruction for ethical guardrails: '{request.instruction}'
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK""",
            agent=rai_agent,
            expected_output="Ethics audit: present and missing controls"
        )
        
        task_qa = Task(
            description=f"""AUDIT this agent instruction for quality guardrails: '{request.instruction}'
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK""",
            agent=qa_agent,
            expected_output="Quality audit: present and missing controls"
        )

        # 4. PREPARE LISTS
        agents_list = [security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # 5. OPTIONAL: TIERING AGENT
        if request.enable_profiling:
            tiering_agent = Agent(
                role='AI Cost & Compute Architect',
                goal='Determine computational tier (1-4) needed to implement the identified guardrails',
                backstory="""You review audit findings and determine what compute tier is needed:
                - Tier 1: Simple regex/keyword checks (~2ms, $0.27/1M tokens)
                - Tier 2: ML classifiers for PII/toxicity (~80ms, $0.60/1M tokens)  
                - Tier 3: GPT-4 level reasoning for context (~800ms, $12/1M tokens)
                - Tier 4: Deep reasoning/o3 for complex safety (~2500ms, $25/1M tokens)""",
                llm=llm, 
                allow_delegation=False, 
                verbose=True
            )
            
            task_tiering = Task(
                description="""Review all audit findings (present and missing controls) and determine:
                1. What tier is needed to IMPLEMENT the missing guardrails
                2. Recommended model class
                3. Estimated cost per 1M tokens
                4. Expected latency
                5. Justification""",
                agent=tiering_agent,
                context=[task_security, task_privacy, task_rai, task_qa],
                expected_output="Tier recommendation based on complexity of missing controls"
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # 6. SYNTHESIS AGENT
        report_agent = Agent(
            role='Accenture AI Chief Governance Officer',
            goal='Synthesize audit findings into final JSON report of present and missing guardrails',
            backstory="""You are a governance expert who synthesizes audit findings.

            You MUST:
            1. REVIEW the audit findings.
            2. REMOVE redundant guardrails.
            3. Output ONLY valid JSON.
            
            Structure:
            {
                "guardrails": [
                    {
                        "name": "Control name",
                        "category": "Security|Privacy|Responsible AI|QA|Scope Control|Input Validation|Output Control",
                        "severity": "Critical|High|Medium|Low",
                        "complexity_tier": 1-4,
                        "description": "Description",
                        "mechanism": "Implementation suggestion",
                        "triggers": ["patterns"],
                        "enforcement": "Block|Mask|Log|Human Review|Filter",
                        "location": "quote or empty string"
                    }
                ],
                "recommendations": ["High-level suggestions"],
                "tiering_strategy": {...} or null
            }""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        tiering_note = ""
        if request.enable_profiling:
            tiering_note = "ALSO include a 'tiering_strategy' object."

        task_report = Task(
            description=f"""Synthesize ALL audit findings into a comprehensive JSON report.
            Output ONLY raw JSON (no markdown, no ```json blocks).
            Include BOTH present and missing guardrails.
            
            FOR EACH GUARDRAIL: Assign a 'complexity_tier' (1-4) based on implementation complexity:
            - Tier 1: Regex, keyword matching (2ms)
            - Tier 2: ML classifiers, NER (80ms) 
            - Tier 3: LLM reasoning checks (800ms)
            - Tier 4: Chain-of-thought, deep reasoning (2500ms)
            
            {tiering_note}""",
            agent=report_agent,
            context=report_context,
            expected_output="Valid JSON report with complexity_tier for each guardrail",
            output_pydantic=GuardrailAnalysis if request.enable_profiling else None
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        # 7. RUN CREW
        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential
        )

        result = crew.kickoff()
        
        # 8. CLEAN AND VALIDATE OUTPUT
        
        # Check for structured Pydantic output
        if hasattr(result, 'pydantic') and result.pydantic:
            try:
                # Try Pydantic V2 method
                cleaned_output = result.pydantic.model_dump_json()
            except AttributeError:
                # Fallback to Pydantic V1 method
                cleaned_output = result.pydantic.json()
        else:
            # Fallback to raw string parsing
            raw_output = str(result)
            # Remove Markdown
            cleaned_output = raw_output.replace("```json", "").replace("```", "").strip()
            # Remove Bad Characters (Newlines, tabs, carriage returns)
            cleaned_output = cleaned_output.replace("\n", " ").replace("\r", "").replace("\t", " ")
        
        # Attempt to parse and validate
        parsed = None
        try:
            parsed = json.loads(cleaned_output)
        except json.JSONDecodeError as e:
            print(f"DEBUG: Direct JSON parse failed: {e}")
            # Robust Fallback: Try to extract JSON object with Regex
            try:
                match = re.search(r'\{.*\}', cleaned_output, re.DOTALL)
                if match:
                    print("DEBUG: Extracted JSON via Regex")
                    parsed = json.loads(match.group())
            except Exception as e2:
                print(f"DEBUG: Regex extraction failed: {e2}")
                print(f"DEBUG: FAILED STRING: {cleaned_output[:500]}...") # Print first 500 chars to log
        
        if parsed:
            # Post-processing
            if "guardrails" in parsed:
                for gr in parsed["guardrails"]:
                    if gr.get("name", "").upper().startswith("MISSING"):
                        gr["location"] = ""
                    if "enforcement" not in gr or not gr["enforcement"]:
                        gr["enforcement"] = "Log" 
                    if "location" not in gr:
                        gr["location"] = "" 
                    if "complexity_tier" not in gr:
                        gr["complexity_tier"] = 2
            
            cleaned_output = json.dumps(parsed)
        else:
            # If all parsing fails, return a safe error object so frontend handles it gracefully
            print("ERROR: Could not parse output from LLM.")
            # Note: We return the raw string hoping the frontend can maybe salvage it, 
            # or so the error message in frontend is meaningful.
            pass

        return {"result": cleaned_output}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')