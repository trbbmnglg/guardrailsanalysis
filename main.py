import os
import json
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
    category: Literal["Security", "Privacy", "Responsible AI", "QA", "Scope Control", "Input Validation", "Output Control"] = Field(description="Primary category")
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
            temperature=0.1
        )

        # 2. DEFINE AGENTS - AUDITORS WHO CHECK FOR PRESENCE/ABSENCE OF CONTROLS
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
            2. If MISSING: Flag it as a risk, explain why it's needed, suggest implementation
            
            Example MISSING control:
            - Name: "SQL Injection Prevention"
            - Severity: "Critical"
            - Description: "No input sanitization detected. Agent may execute unsafe SQL queries."
            - Location: "" (or quote relevant section)
            - Enforcement: "Block"
            - Mechanism: "Implement regex/AST parser to detect SQL patterns before execution"
            
            Example PRESENT control:
            - Name: "PII Redaction Control"
            - Location: "Never share customer email addresses or phone numbers"
            - Enforcement: "Mask"
            - Mechanism: "Existing rule prohibits PII sharing"
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='IAPP (International Association of Privacy Professionals) Privacy & Data Governance Auditor',
            goal='Audit for privacy controls. Flag MISSING privacy guardrails as risks.',
            backstory="""You are a privacy auditor following NIST AI RMF 1.0, GDPR, and CCPA.
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - PII handling and redaction
            - Data residency and storage limits
            - User consent mechanisms
            - Data retention policies
            - Scope boundaries (what data the agent can access)
            
            For EACH expected privacy control:
            1. If PRESENT: Document with location and enforcement
            2. If MISSING: Flag as risk with severity, explain need, suggest implementation
            
            Example MISSING:
            - Name: "PII Masking Requirement"
            - Severity: "Critical"
            - Description: "No controls for handling customer PII. Risk of data leakage."
            - Enforcement: "Mask"
            - Mechanism: "Add regex patterns to detect and mask SSN, credit cards, emails"
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            role='RAI (Responsible AI) Institute Ethics Auditor',
            goal='Audit for ethical controls. Flag MISSING fairness and accountability guardrails.',
            backstory="""You are an ethics auditor focusing on bias, fairness, and accountability.
            Your job is to CHECK if the agent instruction contains proper guardrails for:
            - Bias detection and mitigation
            - Fairness across demographics
            - Explainability requirements
            - Human oversight and escalation paths
            - Harmful content filtering
            
            For EACH expected ethical control:
            1. If PRESENT: Document with location and enforcement
            2. If MISSING: Flag as risk with severity
            
            Example MISSING:
            - Name: "Human Review for High-Stakes Decisions"
            - Severity: "High"
            - Description: "No human-in-the-loop for critical actions like account closures."
            - Enforcement: "Human Review"
            - Mechanism: "Require human approval for actions tagged as 'high-impact'"
            """,
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
            - Edge case coverage
            - Testing requirements
            
            For EACH expected quality control:
            1. If PRESENT: Document with location
            2. If MISSING: Flag as risk
            
            Example MISSING:
            - Name: "Output Length Limit"
            - Severity: "Medium"
            - Description: "No constraints on response length. May cause token overages."
            - Enforcement: "Filter"
            - Mechanism: "Truncate responses to 500 tokens maximum"
            """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # 3. AUDIT TASKS - CHECK FOR PRESENCE/ABSENCE
        task_security = Task(
            description=f"""AUDIT this agent instruction for security guardrails: '{request.instruction}'
            
            Your task is to VERIFY if proper security controls are present:
            
            Expected Controls Checklist:
            ✓ Input sanitization (SQL, XSS, prompt injection)
            ✓ Authentication/authorization checks
            ✓ Rate limiting
            ✓ Secure API key handling
            ✓ Command injection prevention
            
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
            
            Expected Privacy Controls Checklist:
            ✓ PII detection and masking
            ✓ Data retention limits
            ✓ User consent tracking
            ✓ Data access boundaries
            ✓ GDPR/CCPA compliance measures
            
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK with severity
            
            Focus on what's NOT there that SHOULD be there.""",
            agent=privacy_ops_agent,
            expected_output="Privacy audit: present and missing controls with severity ratings"
        )
        
        task_rai = Task(
            description=f"""AUDIT this agent instruction for ethical guardrails: '{request.instruction}'
            
            Expected Ethical Controls Checklist:
            ✓ Bias/fairness checks
            ✓ Harmful content filtering
            ✓ Human oversight for critical decisions
            ✓ Explainability requirements
            ✓ Accountability logging
            
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK
            
            Example: If there's no mention of human review for high-stakes decisions, flag this as "Missing: Human Review Requirement" with High severity.""",
            agent=rai_agent,
            expected_output="Ethics audit: present and missing controls"
        )
        
        task_qa = Task(
            description=f"""AUDIT this agent instruction for quality guardrails: '{request.instruction}'
            
            Expected Quality Controls Checklist:
            ✓ Output format validation
            ✓ Response length limits
            ✓ Error handling
            ✓ Timeout policies
            ✓ Edge case handling
            
            For EACH control:
            - If PRESENT: Document it
            - If MISSING: Flag as RISK
            
            Focus especially on missing validation that could cause operational issues.""",
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
                - Tier 4: Deep reasoning/o3 for complex safety (~2500ms, $25/1M tokens)
                
                Base your tier on the COMPLEXITY of missing controls, not just count.""",
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
                5. Justification
                
                Example: If missing controls require semantic understanding (like bias detection), recommend Tier 3.
                If only missing simple validation (regex patterns), recommend Tier 1.""",
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
            
            You MUST distinguish between:
            1. PRESENT GUARDRAILS: Controls that exist in the agent instruction
            2. MISSING GUARDRAILS: Controls that are ABSENT and pose risks
            
            For MISSING guardrails (these are the primary concern):
            - Severity reflects the RISK of not having this control
            - Description explains WHY this control is needed
            - Mechanism suggests HOW to implement it
            - Enforcement recommends the action type (Block, Mask, Log, Human Review, Filter)
            - Location can be empty or suggest where it should be added
            
            For PRESENT guardrails:
            - Quote where they're defined (location)
            - Document their enforcement method
            
            Output ONLY valid JSON matching this structure:
            {
                "guardrails": [
                    {
                        "name": "Control name (e.g., 'SQL Injection Prevention' or 'MISSING: SQL Injection Prevention')",
                        "category": "Security|Privacy|Responsible AI|QA|Scope Control|Input Validation|Output Control",
                        "severity": "Critical|High|Medium|Low (severity of RISK if missing, or Low if present)",
                        "complexity_tier": 1-4,
                        "description": "What this control does OR why it's needed if missing",
                        "mechanism": "How it's implemented OR how to implement if missing",
                        "triggers": ["patterns or conditions"],
                        "enforcement": "Block|Mask|Log|Human Review|Filter",
                        "location": "quote from input where defined, or empty string if missing"
                    }
                ],
                "recommendations": ["High-level suggestions"],
                "tiering_strategy": {...} or null
            }
            
            CRITICAL: Most guardrails in output will be MISSING controls (the gaps/risks).
            Present controls should also be documented for completeness.""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # Build tiering section only if profiling enabled
        tiering_note = ""
        if request.enable_profiling:
            tiering_note = """
            ALSO include a 'tiering_strategy' object with:
            - selected_tier: "Tier 1|2|3|4"
            - model_class: example model name
            - estimated_cost: cost per 1M tokens
            - latency_impact: expected latency
            - justification: reasoning based on control complexity
            """

        report_description = f"""
        Synthesize ALL audit findings into a comprehensive JSON report.
        
        You MUST:
        1. REVIEW the audit findings.
        2. REMOVE redundant guardrails.
        
        CRITICAL REQUIREMENTS:
        1. Output ONLY raw JSON (no markdown, no ```json blocks)
        2. Include BOTH present and missing guardrails
        3. MISSING guardrails are the PRIMARY focus - these are the RISKS
        4. Every guardrail MUST include:
           - enforcement: one of [Block, Mask, Log, Human Review, Filter]
           - location: quote from input (if present) or empty string (if missing)
        5. Severity reflects RISK level if control is missing
        
        {tiering_note}
        
        EXAMPLES:
        
        MISSING Control:
        {{
            "name": "MISSING: SQL Injection Prevention",
            "category": "Security",
            "severity": "Critical",
            "description": "No input sanitization detected. Agent may execute unsafe database queries.",
            "mechanism": "Implement parameterized queries and input validation with regex: ^[a-zA-Z0-9_]+$",
            "triggers": ["SELECT", "DROP", "INSERT", "UPDATE", "--", "';"],
            "enforcement": "Block",
            "location": ""
        }}
        
        PRESENT Control:
        {{
            "name": "PII Redaction Policy",
            "category": "Privacy",
            "severity": "Low",
            "description": "Existing control prevents sharing customer PII",
            "mechanism": "Policy explicitly prohibits PII disclosure",
            "triggers": ["email", "phone", "SSN"],
            "enforcement": "Mask",
            "location": "Never share customer email addresses or phone numbers"
        }}
        """

        task_report = Task(
            description=report_description,
            agent=report_agent,
            context=report_context,
            expected_output="Valid JSON report with present and missing guardrails",
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
        
        # Check if we got a structured Pydantic output (CrewAI feature)
        # When output_pydantic is used, result.pydantic contains the model instance
        if hasattr(result, 'pydantic') and result.pydantic:
            try:
                # Try Pydantic V2 method
                cleaned_output = result.pydantic.model_dump_json()
            except AttributeError:
                # Fallback to Pydantic V1 method
                cleaned_output = result.pydantic.json()
        else:
            # Fallback to raw string parsing (for normal requests or if pydantic fails)
            raw_output = str(result)
            cleaned_output = raw_output.replace("```json", "").replace("```", "").strip()
        
        # Attempt to parse and validate
        try:
            parsed = json.loads(cleaned_output)
            
            # Post-processing: Ensure all guardrails have enforcement and location
            if "guardrails" in parsed:
                for gr in parsed["guardrails"]:
                    if "enforcement" not in gr or not gr["enforcement"]:
                        gr["enforcement"] = "Log"  # Default fallback
                    if "location" not in gr:
                        gr["location"] = ""  # Default to empty string
                    # Ensure complexity_tier exists
                    if "complexity_tier" not in gr:
                        # Infer tier from mechanism if possible
                        mech_lower = gr.get("mechanism", "").lower()
                        if any(word in mech_lower for word in ["regex", "keyword", "pattern"]):
                            gr["complexity_tier"] = 1
                        elif any(word in mech_lower for word in ["classifier", "ml", "model"]):
                            gr["complexity_tier"] = 2
                        elif any(word in mech_lower for word in ["llm", "gpt", "semantic"]):
                            gr["complexity_tier"] = 3
                        else:
                            gr["complexity_tier"] = 2  # Default to tier 2
                    if gr.get("name", "").upper().startswith("MISSING"):
                        gr["location"] = ""
                    if "enforcement" not in gr or not gr["enforcement"]:
                        
            cleaned_output = json.dumps(parsed)
        except json.JSONDecodeError as e:
            print(f"JSON parsing failed: {e}")
            # Continue with cleaned output - let frontend handle

        return {"result": cleaned_output}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')