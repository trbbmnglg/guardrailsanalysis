import os
import json
import re
from huggingface_hub import InferenceClient
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from crewai import LLM
from langchain_core.output_parsers import PydanticOutputParser
from crewai_tools import WebsiteSearchTool

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

# --- PYDANTIC MODELS FOR STRUCTURED OUTPUT ---
class Guardrail(BaseModel):
    """Structured model for a single guardrail - either present or missing"""
    name: str = Field(description="Short, descriptive name of the guardrail control")
    category: Literal[
        "Security", 
        "Privacy", 
        "Responsible AI", 
        "QA", 
        "Scope Control", 
        "Input Validation", 
        "Output Control"
    ] = Field(description="Primary category - MUST match one of these exact values")
    severity: Literal["Critical", "High", "Medium", "Low"] = Field(
        description="Risk severity if this control is missing"
    )
    complexity_tier: int = Field(
        default=2, 
        ge=1, 
        le=4, 
        description="Computational complexity tier (1=regex, 2=classifier, 3=LLM, 4=reasoning)"
    )
    description: str = Field(
        description="Detailed description of what this guardrail does (minimum 15 characters). No special characters."
    )
    mechanism: str = Field(
        description="Technical implementation suggestion with specific examples (min. 15 characters). No special characters."
    )
    triggers: List[str] = Field(
        description="List of 1-3 specific patterns, words, or conditions that trigger this guardrail"
    )
    enforcement: ALLOWED_ENFORCEMENT_ACTIONS = Field(
        description="Recommended action when triggered. Maximum 4-6 words. No special characters."
    )
    location: str = Field(
        default="", 
        description="If control EXISTS: exact quote from instruction (8+ words). If MISSING: empty string."
    )

class TieringStrategy(BaseModel):
    """Computational tier recommendation"""
    selected_tier: str = Field(description="Recommended tier: Tier 1, Tier 2, Tier 3, or Tier 4")
    model_class: str = Field(description="Example model for this tier")
    estimated_cost: str = Field(description="Estimated cost per 1M tokens")
    latency_impact: str = Field(description="Expected latency")
    justification: str = Field(description="Reasoning for tier selection")

class GuardrailAnalysis(BaseModel):
    """Complete analysis output"""
    guardrails: List[Guardrail] = Field(
        description="List of ALL guardrails - both present and missing"
    )
    recommendations: List[str] = Field(
        description="1-3 high-level strategic recommendations"
    )
    tiering_strategy: Optional[TieringStrategy] = Field(
        default=None, 
        description="Optional tiering analysis"
    )

# --- REQUEST MODEL ---
class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False 
    enable_rag_deep_scan: bool = False

# --- STRICT CATEGORY MAPPING SYSTEM ---
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
    - Example: "MISSING: PII Redaction for Email Addresses"
    
    LOCATION FIELD RULES:
    - If guardrail EXISTS: Provide max 5 words exact quote from instruction
    - If guardrail is MISSING: Set location to empty string ""
    - Never use placeholder text like "Not specified" or "N/A"
    
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
            max_tokens=3000,
        )

        # ---------------------------------------------------------
        # PHASE 1: THE HUDDLE (STRATEGY & ALIGNMENT)
        # ---------------------------------------------------------

        strategy_agent = Agent(
            role='Audit Strategy Lead',
            goal='Analyze the raw instruction to establish context, domain risks, and specific focus areas for the specialist team.',
            backstory="""You are the Audit Team Lead. Before your specialists (Security, Privacy, RAI, QA) begin their work, 
            you must "huddle" with the context. You identify the domain (e.g., Finance, Medical, Customer Service) 
            and the highest-risk areas. You produce a Mission Brief that aligns the team so everyone knows exactly what to look for.""",
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        task_strategy = Task(
            description=f"""**HUDDLE PHASE: MISSION BRIEFING**
            
            Analyze the following user instruction:
            '''{request.instruction}'''
            
            1. Identify the Domain (e.g., Healthcare, Coding, General Chat).
            2. Identify the top 3 High-Level Risks associated with this domain.
            3. Create specific "Search Directives" for each specialist:
               - Security: What specific vulnerabilities matter here? (e.g., SQLi for coding agents)
               - Privacy: What data types are likely to appear?
               - RAI: What ethical pitfalls are common in this domain?
               
            Output a concise "Mission Brief" paragraph that will guide the specialist agents.
            """,
            agent=strategy_agent,
            expected_output="A concise strategic mission brief outlining domain risks and focus areas.",
            async_execution=False # This MUST finish before others start
        )

        # ---------------------------------------------------------
        # PHASE 2: PARALLEL SPECIALIST EXECUTION
        # ---------------------------------------------------------

        security_agent = Agent(
            role='AI Senior Adversarial Security Auditor (OWASP LLM Top 10 & ISO 42001)',
            goal='Rigorously audit AI instructions guardrails for critical vulnerabilities, specifically Prompt Injection, Unauthorized Tool Use, and Hardcoded Secrets',
            backstory=f"""You are an AI CERTIFIED SECURITY AUDITOR specializing in OWASP LLM Top 10 and ISO 42001 compliance.
            Your audit is BINARY (PASS/FAIL) and STRICT.
            
            SECURITY AUDIT PROTOCOL:
            [S1] Prompt Injection & Jailbreak Resilience
            [S2] Hardcoded Sensitive Data Check
            [S3] Role-Based Access & Authorization
            [S4] Resource Exhaustion & DoS
            [S5] Tool/API Argument Validation
            
            {CATEGORY_GUIDELINES}
            """,
            llm=llm,
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='Senior Privacy Officer (GDPR/CCPA/NIST AI RMF)',
            goal='Rigorously identify and validate ALL prompt-level privacy guardrails, focusing on PII leakage prevention and data minimization.',
            backstory=f"""You are a VETERAN Senior Privacy Officer (CIPP/E, CIPT).
            Your mandate is strict compliance with GDPR and NIST AI RMF.
            
            PRIVACY AUDIT PROTOCOL:
            [P1] PII/Secrets Output Prevention
            [P2] Data Minimization & Purpose Limitation
            [P3] Ephemeral Data & Right to Erasure
            [P4] Self-Correction & PII Validation Mechanism
            [P5] PII Input Sanitization
            
            {CATEGORY_GUIDELINES}
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            role='Principal AI Safety & Alignment Architect (EU AI Act & NIST AI RMF)',
            goal='Rigorously assess and certify AI prompts for compliance with high-risk EU AI Act requirements and NIST RMF principles.',
            backstory=f"""You are the Chief Responsible AI Officer.
            Your mandate is to enforce a zero-tolerance policy for safety and ethical failures.
            
            RESPONSIBLE AI CERTIFICATION PROTOCOL:
            [R1] Systemic Bias & Fairness Mitigation
            [R2] Mandatory Prohibited Content
            [R3] Harmful Content & Policy Violation Filters
            [R4] Human-in-the-Loop & Role-Based Safety Lockdowns
            [R5] Audit Trail & Explanation Integrity
            [R6] Adversarial Input Privacy/Ethics Identification
            
            {CATEGORY_GUIDELINES}
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
            role='Lead AI Quality Certification Engineer (ISO/IEC 25059)',
            goal='Rigorously certify prompt and LLM-interaction compliance against the ISO/IEC 25059 quality standard.',
            backstory=f"""You are the gatekeeper for AI system quality certification under ISO/IEC 25059.
            
            QUALITY AUDIT PROTOCOL:
            [Q1] Context & Negative Constraint Confinement (Scope Control)
            [Q2] Output Control & Schema Enforcement
            [Q3] Adversarial Resilience & Self-Correction Loops
            [Q4] Consistency & Determinism
            [Q5] Maintainability & Documentation
            
            {CATEGORY_GUIDELINES}
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # -- TASKS FOR SPECIALISTS (With Context from Strategy) --

        task_security = Task(
            description=f"""AUDIT this agent instruction for security guardrails:
            INSTRUCTION: '''{request.instruction}'''
            
            OUTPUT REQUIREMENTS:
            1. Find ALL security controls (present and missing).
            2. For PRESENT controls: Name them clearly, extract 5 words quote for 'location'.
            3. For MISSING controls: Name as "MISSING: [Control Name]", set location to "".
            4. ALWAYS use category "Security".
            5. List 1-5 specific triggers per control.
            6. Set appropriate severity.
            7. CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            """,
            agent=security_agent,
            context=[task_strategy], # Receives the "Mission Brief"
            async_execution=True,    # Runs in PARALLEL
            expected_output="Structured list of security guardrails"
        )
        
        task_privacy = Task(
            description=f"""AUDIT this agent instruction for privacy guardrails:
            INSTRUCTION: '''{request.instruction}'''
            
            OUTPUT REQUIREMENTS:
            1. Find ALL privacy controls (present and missing).
            2. For PRESENT controls: Extract 5 words quote for 'location'.
            3. For MISSING controls: Name as "MISSING: [Control Name]", set location to "".
            4. ALWAYS use category "Privacy".
            5. List 1-5 PII types as triggers.
            6. CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            """,
            agent=privacy_ops_agent,
            context=[task_strategy], # Receives the "Mission Brief"
            async_execution=True,    # Runs in PARALLEL
            expected_output="Structured list of privacy guardrails"
        )
        
        task_rai = Task(
            description=f"""AUDIT this agent instruction for ethical/safety guardrails:
            INSTRUCTION: '''{request.instruction}'''
            
            OUTPUT REQUIREMENTS:
            1. Find ALL ethical/safety controls.
            2. For PRESENT controls: Extract 5 words quote for 'location'.
            3. For MISSING controls: Name as "MISSING: [Control Name]", set location to "".
            4. ALWAYS use category "Responsible AI".
            5. CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            """,
            agent=rai_agent,
            context=[task_strategy], # Receives the "Mission Brief"
            async_execution=True,    # Runs in PARALLEL
            expected_output="Structured list of ethical guardrails"
        )
        
        task_qa = Task(
            description=f"""AUDIT this agent instruction for quality/validation guardrails:
            INSTRUCTION: '''{request.instruction}'''
            
            OUTPUT REQUIREMENTS:
            1. Find ALL validation/quality controls.
            2. For PRESENT controls: Extract 5 words quote for 'location'.
            3. For MISSING controls: Name as "MISSING: [Control Name]", set location to "".
            4. Use correct categories: "Input Validation", "Output Control", "QA", "Scope Control".
            5. CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            """,
            agent=qa_agent,
            context=[task_strategy], # Receives the "Mission Brief"
            async_execution=True,    # Runs in PARALLEL
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
                role='AI Cost & Compute Architect',
                goal='Determine computational tier (1-4) needed to implement the current guardrails',
                backstory="""You review audit findings and determine compute tier:
                - Tier 1: Regex/keyword checks (~2ms, $0.27/1M tokens)
                - Tier 2: ML classifiers (~80ms, $0.60/1M tokens)  
                - Tier 3: GPT-4 level reasoning (~800ms, $12/1M tokens)
                - Tier 4: Deep reasoning/o3 (~2500ms, $25/1M tokens)""",
                llm=llm, 
                allow_delegation=False, 
                verbose=True
            )
            
            task_tiering = Task(
                description=f"""Review the current AI instruction and provide tier recommendation:
                INSTRUCTION: '''{request.instruction}'''
                
                1. What tier is needed to IMPLEMENT the current guardrails?
                2. Recommended model class & estimated cost.
                """,
                agent=tiering_agent,
                context=[task_strategy, task_security, task_qa], # Needs briefing + some findings
                async_execution=True, # Also Parallel
                expected_output="Tier recommendation with cost/latency estimates"
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # ---------------------------------------------------------
        # PHASE 4: FINAL CONSOLIDATION & APPROVAL
        # ---------------------------------------------------------

        report_agent = Agent(
            role='Chief AI Governance Officer & Compliance Report Synthesizer',
            goal='Synthesize multi-agent audit findings into a comprehensive, schema-compliant JSON report with strict category and strategic recommendations',
            backstory=f"""You are the Chief AI Governance Officer.
            Your responsibility is to synthesize findings from all teams into a single, actionable compliance assessment.
            You must REVIEW and APPROVE the final report, ensuring no duplicates exist and categories are correct.
            
            {CATEGORY_GUIDELINES}
            
            CRITICAL OUTPUT REQUIREMENTS:
            1. OUTPUT ONLY VALID JSON.
            2. JSON must be parseable by json.loads().
            3. CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )
        
        tiering_note = ""
        if request.enable_profiling:
            tiering_note = "ALSO include a 'tiering_strategy' object with cost/latency analysis."
        
        task_report = Task(
            description=f"""MISSION: Synthesize, Deduplicate, and Approve audit findings.
            
            CRITICAL: Your response must be VALID, PARSEABLE JSON.
            
            SYNTHESIS REQUIREMENTS:
            1. CONSOLIDATION & DEDUPLICATION (STRICT)
               → Merge findings from all agents.
               → AGGRESSIVE MERGING RULE: If multiple agents find a guardrail referencing the SAME 'location' text (e.g. "Be polite"), they ARE duplicates. 
               → MERGE ACTION: Keep the version with the MOST severe risk (Security > Privacy > RAI > QA).
            
            2. CATEGORY VALIDATION
               → Map each finding to its primary category: {CATEGORY_GUIDELINES}
            
            3. EVIDENCE ATTRIBUTION
               → PRESENT guardrails: Include exact location quote (5-10 words max).
               → MISSING guardrails: Set location to empty string "".
            
            4. SEVERITY ASSESSMENT
               → Assign Critical, High, Medium, or Low based on risk.
            
            5. ENFORCEMENT ACTION VALIDATION
               → CRITICAL: Only use EXACTLY ONE enforcement from: {enforcement_list_str}
            
            6. STRATEGIC RECOMMENDATIONS
               → Provide 3-5 HIGH-LEVEL, actionable recommendations.
            
            {tiering_note}
            
            REQUIRED OUTPUT STRUCTURE:
            {{
              "guardrails": [ ... ],
              "recommendations": [ ... ],
              "tiering_strategy": {{ ... }}
            }}
            
            VALIDATION CHECKLIST:
            ☐ Response is pure JSON.
            ☐ No duplicate guardrails (checked by location text overlap).
            ☐ All enforcement values match the EXACT list: {enforcement_list_str}
            """,
            agent=report_agent,
            context=report_context, # Waits for ALL parallel tasks
            async_execution=False,  # Must be synchronous to finalize
            expected_output="Valid JSON matching GuardrailAnalysis schema",
            output_pydantic=GuardrailAnalysis
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential # Sequential allows Strategy (Start) -> Parallel block -> Report (End)
        )
        
        result = crew.kickoff()

        # --- RESPONSE HANDLING (Clean & Return) ---
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
        except json.JSONDecodeError as e:
            # Fallback regex extraction
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