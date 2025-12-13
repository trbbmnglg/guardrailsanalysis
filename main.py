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
    selected_tier: str
    model_class: str
    estimated_cost: str
    latency_impact: str
    justification: str

class GuardrailAnalysis(BaseModel):
    guardrails: List[Guardrail]
    recommendations: List[str]
    tiering_strategy: Optional[TieringStrategy] = None

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False

# --- STRICT CATEGORY MAPPING SYSTEM ---
CATEGORY_GUIDELINES = """
    CRITICAL CATEGORY RULES:
    1. "Security" - Auth, injection, secrets, DOS.
    2. "Privacy" - PII, GDPR, data minimization.
    3. "Responsible AI" - Bias, toxicity, ethics.
    4. "Scope Control" - Task boundaries, identity.
    5. "Input Validation" - Sanitization, types.
    6. "Output Control" - Formatting, JSON schema.
    7. "QA" - Testing, reliability, error handling.
"""

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
            max_tokens=4000, # Increased for larger contexts
        )

        # ---------------------------------------------------------
        # PHASE 1: THE HUDDLE (STRATEGY & ALIGNMENT)
        # ---------------------------------------------------------

        strategy_agent = Agent(
            role='Lead Audit Strategist (CISSP/CISM)',
            goal='Establish the "Rules of Engagement" for the audit by identifying the specific domain risks (e.g., Healthcare vs. Finance) and directing specialists to focus on high-probability failure points.',
            backstory="""You are a veteran Audit Strategist with 20 years of experience in GRC (Governance, Risk, and Compliance). 
            You believe that generic audits fail; only targeted, context-aware audits succeed. 
            Before the team starts, you analyze the "User Instruction" to determine if it is a Medical Bot (HIPAA risk), a Fintech Agent (GLBA risk), or a Coding Assistant (Injection risk).
            You output a "Mission Brief" that acts as the marching orders for the rest of the crew.""",
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        task_strategy = Task(
            description=f"""**PHASE 1: STRATEGIC RECONNAISSANCE**
            
            **INPUT:**
            User Instruction: '''{request.instruction}'''
            
            **YOUR MISSION:**
            1. **Classify Domain:** Is this Finance, Healthcare, Customer Support, Coding, or General?
            2. **Threat Modeling:** Identify the top 3 specific "Kill Chain" risks for this domain.
            3. **Directives:** Issue specific orders to your team:
               - Tell **Security Agent** what specific injection attacks to look for.
               - Tell **Privacy Agent** what specific PII fields (e.g., SSN, MRN) are likely to appear.
               - Tell **RAI Agent** what ethical boundaries are most fragile here.
            
            **OUTPUT FORMAT:**
            A concise "Mission Brief" paragraph (max 150 words) that starts with "MISSION BRIEF:".
            """,
            agent=strategy_agent,
            expected_output="A strategic Mission Brief defining the domain and top risks.",
            async_execution=False 
        )

        # ---------------------------------------------------------
        # PHASE 2: PARALLEL SPECIALIST EXECUTION
        # ---------------------------------------------------------

        security_agent = Agent(
            role='Senior Adversarial Security Engineer (OWASP Specialist)',
            goal='Protect the organization from catastrophic breach by identifying "Prompt Injection", "Secret Leakage", and "Unauthorized Tool Access" vulnerabilities.',
            backstory=f"""You are a paranoid Security Engineer who assumes every user input is malicious. 
            You specialize in the OWASP Top 10 for LLMs. You do not care about "politeness"; you care about **Exploits**.
            You meticulously scan instructions for loose wording that could allow a "Jailbreak" or "Data Exfiltration".
            
            **YOUR TEXTBOOK:**
            1. Prompt Injection (Direct/Indirect)
            2. Insecure Output Handling (XSS/RCE)
            3. Sensitive Information Disclosure
            """,
            llm=llm,
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='Chief Privacy Officer (GDPR/HIPAA Expert)',
            goal='Ensure zero-tolerance for PII leakage and strict adherence to Data Minimization principles.',
            backstory=f"""You are a certified CIPP/E & CIPM officer. You view data as a "toxic asset"—if we don't need it, we shouldn't touch it.
            You scrutinize prompts for any request that might inadvertently store, log, or repeat sensitive user data (Names, Emails, IDs).
            You demand "Privacy by Design" mechanisms, such as automatic redaction and ephemeral memory.
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            role='AI Ethics & Safety Director',
            goal='Prevent reputational damage and real-world harm by enforcing safety boundaries and anti-bias protocols.',
            backstory=f"""You are the moral compass of the system. You are deeply concerned with "Brand Safety" and "Human Harm".
            You look for systemic bias (gender/race), dangerous content generation (explosives/self-harm), and hallucinations that could lead to liability.
            You enforce the EU AI Act's requirements for transparency and human oversight.
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
            role='Lead QA Automation Engineer (ISO 25059)',
            goal='Validate that the system is deterministic, reliable, and fails gracefully under stress.',
            backstory=f"""You are a pedantic QA Engineer who loves breaking things. You care about "Functional Suitability" and "Reliability".
            You check if the prompt has clear boundaries (Scope Control).
            You check if the output format is strictly defined (JSON/XML Schema).
            You check if there are recovery mechanisms for bad inputs.
            If a prompt is vague, you flag it as a "Quality Defect".
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # -- TASKS --

        task_security = Task(
            description=f"""**PHASE 2: SECURITY AUDIT**
            
            **INPUT:**
            1. User Instruction: '''{request.instruction}'''
            2. **Mission Brief:** (See Context)
            
            **STEPS:**
            1. **Consume Brief:** Read the Strategy Agent's Mission Brief. Focus ONLY on the risks identified there.
            2. **Vulnerability Scan:** Scan the instruction for OWASP LLM vulnerabilities.
            3. **Evidence Extraction:** For every finding, you MUST quote the exact text from the instruction that proves the risk (or proves the control exists).
            
            **MANDATORY OUTPUT:**
            - JSON List of Guardrails.
            - Category MUST be "Security".
            - Enforcement MUST be one of: {enforcement_list_str}
            """,
            agent=security_agent,
            context=[task_strategy], 
            async_execution=True,    
            expected_output="Structured list of security guardrails"
        )
        
        task_privacy = Task(
            description=f"""**PHASE 2: PRIVACY AUDIT**
            
            **INPUT:**
            1. User Instruction: '''{request.instruction}'''
            2. **Mission Brief:** (See Context)
            
            **STEPS:**
            1. **Consume Brief:** Focus on the specific data types (PII) mentioned in the brief.
            2. **Data Flow Analysis:** Where does data go? Is it logged? Is it repeated?
            3. **Gap Analysis:** If the user asks for "names" but doesn't mention "redaction", flag it as MISSING.
            
            **MANDATORY OUTPUT:**
            - JSON List of Guardrails.
            - Category MUST be "Privacy".
            - Enforcement MUST be one of: {enforcement_list_str}
            """,
            agent=privacy_ops_agent,
            context=[task_strategy],
            async_execution=True,
            expected_output="Structured list of privacy guardrails"
        )
        
        task_rai = Task(
            description=f"""**PHASE 2: ETHICS & SAFETY AUDIT**
            
            **INPUT:**
            1. User Instruction: '''{request.instruction}'''
            2. **Mission Brief:** (See Context)
            
            **STEPS:**
            1. **Consume Brief:** Focus on the specific ethical risks (e.g., financial advice, medical diagnosis).
            2. **Safety Check:** specific triggers for harmful content (self-harm, hate speech).
            3. **Oversight:** Check for "Human-in-the-loop" mechanisms.
            
            **MANDATORY OUTPUT:**
            - JSON List of Guardrails.
            - Category MUST be "Responsible AI".
            - Enforcement MUST be one of: {enforcement_list_str}
            """,
            agent=rai_agent,
            context=[task_strategy],
            async_execution=True,
            expected_output="Structured list of ethical guardrails"
        )
        
        task_qa = Task(
            description=f"""**PHASE 2: QUALITY ASSURANCE**
            
            **INPUT:**
            1. User Instruction: '''{request.instruction}'''
            
            **STEPS:**
            1. **Scope Validation:** Does the agent know who it is? Does it know what it MUST NOT do?
            2. **Format Validation:** Is the output schema strictly defined?
            3. **Error Handling:** Are there instructions for when things go wrong?
            
            **MANDATORY OUTPUT:**
            - JSON List of Guardrails.
            - Categories: "Input Validation", "Output Control", "QA", "Scope Control".
            - Enforcement MUST be one of: {enforcement_list_str}
            """,
            agent=qa_agent,
            context=[task_strategy],
            async_execution=True,
            expected_output="Structured list of quality guardrails"
        )

        agents_list = [strategy_agent, security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_strategy, task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # ---------------------------------------------------------
        # PHASE 3: OPTIONAL COST ARCHITECT (PARALLEL)
        # ---------------------------------------------------------
        
        if request.enable_profiling:
            tiering_agent = Agent(
                role='Cloud FinOps Architect',
                goal='Optimize the token economics and latency of the proposed guardrails.',
                backstory="""You are a FinOps specialist who hates waste. You calculate the "Tax" of every guardrail.
                You know that a Regex check costs 1ms, but an LLM Judge costs 500ms.
                Your job is to recommend the cheapest, fastest implementation for each control without sacrificing security.""",
                llm=llm, 
                allow_delegation=False, 
                verbose=True
            )
            
            task_tiering = Task(
                description=f"""**PHASE 2b: COST PROFILING**
                
                Analyze the COMPLEXITY of the guardrails being proposed.
                1. If a guardrail is "Check for email addresses", recommend Regex (Tier 1).
                2. If a guardrail is "Detect sarcasm", recommend LLM (Tier 3).
                
                **OUTPUT:**
                TieringStrategy JSON object with cost/latency estimates.
                """,
                agent=tiering_agent,
                context=[task_strategy, task_security, task_qa],
                async_execution=True,
                expected_output="Tier recommendation with cost/latency estimates"
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # ---------------------------------------------------------
        # PHASE 4: FINAL CONSOLIDATION & APPROVAL
        # ---------------------------------------------------------

        report_agent = Agent(
            role='Chief Governance Officer (Final Approver)',
            goal='Produce a clean, de-duplicated, executive-ready compliance report.',
            backstory=f"""You are the Chief Governance Officer. You have high standards for reporting.
            **YOU HATE REDUNDANCY.** If the Security Agent says "Check for PII" and the Privacy Agent says "Check for PII", you MERGE them instantly.
            You never allow two guardrails to reference the exact same quote from the text.
            You prioritize "Security" findings over "QA" findings if they overlap.
            You ensure the final JSON is perfect, valid, and actionable.
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )
        
        tiering_note = ""
        if request.enable_profiling:
            tiering_note = "ALSO include a 'tiering_strategy' object with cost/latency analysis."
        
        task_report = Task(
            description=f"""**PHASE 3: FINAL REPORT SYNTHESIS**
            
            **INPUT:**
            Findings from ALL Agents (Security, Privacy, RAI, QA, Cost).
            
            **YOUR STRICT RULES:**
            1. **DEDUPLICATION:** Compare the 'location' (quote) and 'mechanism' of every finding. If they overlap > 80%, MERGE THEM. Keep the highest severity.
            2. **VALIDATION:** Ensure every 'present' guardrail has a 'location' quote. Ensure every 'missing' guardrail has location="".
            3. **FORMATTING:** Return ONLY valid JSON. No markdown.
            
            **REQUIRED JSON STRUCTURE:**
            {{
              "guardrails": [ ... ],
              "recommendations": [ ... ],
              "tiering_strategy": {{ ... }}
            }}
            """,
            agent=report_agent,
            context=report_context,
            async_execution=False,
            expected_output="Valid JSON matching GuardrailAnalysis schema",
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
        
        result = crew.kickoff()

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