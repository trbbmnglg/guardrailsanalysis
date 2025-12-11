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
from crewai import LLM
from langchain_core.output_parsers import PydanticOutputParser

app = FastAPI()

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
        description="Detailed description of what this guardrail does (minimum 15 characters)"
    )
    mechanism: str = Field(
        description="Technical implementation suggestion with specific examples (min. 15 characters)"
    )
    triggers: List[str] = Field(
        description="List of 3-5 specific patterns, words, or conditions that trigger this guardrail"
    )
    enforcement: Literal["Sanitize","Maintain","Block", "Mask", "Log", "Human Review", "Filter", "Reject", "Refuse", "Redact", "Implement", "Validate", "Detect", "Identify", "Enforce", "Limit"] = Field(
        description="Recommended action when triggered"
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
- If guardrail EXISTS: Provide 8+ word exact quote from instruction
- If guardrail is MISSING: Set location to empty string ""
- Never use placeholder text like "Not specified" or "N/A"
"""

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        # 1. SETUP LLM
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1,
            max_tokens=5000,
            timeout=300,
            max_retries=2,
        )

        # 2. DEFINE AGENTS WITH STRICT CATEGORIZATION INSTRUCTIONS

        security_agent = Agent(
            role='Senior Adversarial Security Auditor (OWASP LLM Top 10 & ISO 42001)',
            goal='Rigorously audit AI prompts for critical vulnerabilities, specifically Prompt Injection, Sensitive Information Disclosure, and Insecure Function/Tool Calling and categorize them as "Security"',
            backstory=f"""You are a certified security auditor specializing in OWASP Top 10 and ISO 42001.

REQUIRED CHECKS (mark as PRESENT or MISSING):
1. Prompt Injection Resilience (OWASP LLM01/05)
   - Check: Are strict meta-prompt instructions present that forbid the LLM from executing user-provided instructions that override the original system prompt or attempt to escape context?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
2. Authentication & Authorization Controls
   - Check: Does the prompt include instructions that link user permissions to external tool/function calls, ensuring the LLM won't execute unauthorized actions?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
3. External API Rate Limiting & Abuse Prevention
   - Check: Are there instructions to limit the frequency and volume of external tool/API calls to prevent accidental or malicious denial-of-service against external services?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
4. Sensitive Information Disclosure (LLM04)
   - Check: Is the prompt clean of all sensitive metadata, API keys, internal URLs, or system file paths that could be leaked via a prompt injection attack?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
5. Tool/API Security Requirements Validation
   - Check: Does the prompt instruct the LLM to validate the security requirements (like required encryption/hashing) for any data passed to external tools or APIs?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
6. Defense Evasion & Jailbreak Resilience (OWASP LLM01)
   - Check: Are explicit instructions present forbidding the LLM from engaging in harmful activities, roleplay, or responding to encoded/obfuscated malicious inputs?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
7. Hardcoded Sensitive Data Check (LLM04)
   - Check: Does the prompt (system instructions) contain hardcoded sensitive data such as API keys, cloud service endpoints, database schemas, or internal file paths?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
8. Role-Based Function Control (LLM02)
   - Check: Is the prompt structured to ensure the LLM will only execute tools/functions explicitly permitted by the current user's security role (e.g., denying 'admin' functions to a 'guest' prompt)?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
9. Unsafe Tool Use & API Call Validation (LLM07)
   - Check: Does the prompt include instructions to validate all arguments for external tool/API calls against a strict schema *before* execution to prevent injection or data manipulation?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
10. Resource Exhaustion/Denial of Service (DoS)
   - Check: Does the prompt include protective instructions to avoid generating infinitely long responses, recursive function calls, or excessive token usage?
   - Output: Mark as PRESENT or MISSING. Category: "Security"
   
{CATEGORY_GUIDELINES}

For EACH control:
- If PRESENT: Extract 8+ word exact quote in 'location' field
- If MISSING: Name it "MISSING: [Control Name]", set location to ""
- ALWAYS use category "Security"
- Provide 3-5 specific trigger examples
- Set severity: Critical/High for auth & injection, Medium for rate limiting""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='Senior Privacy Officer (GDPR/CCPA/NIST AI RMF)',
            goal='Rigorously identify and validate ALL prompt-level privacy guardrails, focusing on PII leakage prevention, data minimization, and enforcement of Data Subject Rights and categorize them as "Privacy"',
            backstory=f"""and Data Protection Officer (DPO) certified with IAPP CIPP/E and CIPT. Your mandate is strict compliance with GDPR, CCPA, and the NIST AI RMF 1.0. The prompt is the first and last line of defense.

REQUIRED CHECKS (mark as PRESENT or MISSING):
1. PII Output Prevention (Zero Disclosure)
   - Check: Does the prompt include explicit instructions forbidding the LLM from outputting or confirming *any* PII, even if the user provides it?
   - Output: Mark as PRESENT or MISSING. Category: "Privacy"
2. Cross-Context Data Seclusion
   - Check: Are instructions present that strictly forbid the LLM from accessing data from other user sessions, external databases, or unauthorized system context? (Data Minimization Principle)
   - Output: Mark as PRESENT or MISSING. Category: "Privacy"
3. Data Usage Purpose Limitation
   - Check: Does the prompt explicitly state that all input data must be used *only* for the specific task and not for training, analysis, or any secondary purpose? (GDPR Article 5)
   - Output: Mark as PRESENT or MISSING. Category: "Privacy"
4. Ephemeral Data Handling Instructions
   - Check: Are instructions present to treat the current conversation as ephemeral and to not log or retain PII beyond the session's immediate needs? (Right to Erasure)
   - Output: Mark as PRESENT or MISSING. Category: "Privacy"  
5. Right to Deletion / Unstructured Data Control
   - Check: Does the prompt instruct the LLM to avoid generating unstructured data (e.g., long free-text) that would make PII deletion or data export difficult?
   - Output: Mark as PRESENT or MISSING. Category: "Privacy"
   
{CATEGORY_GUIDELINES}

For EACH control:
- If PRESENT: Extract 8+ word exact quote in 'location' field
- If MISSING: Name it "MISSING: [Control Name]", set location to ""
- ALWAYS use category "Privacy"
- List 1-3 PII types as triggers (email, SSN, credit card, etc.)
- Set severity: Critical for PII leakage, High for consent issues""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
            role='Principal AI Safety & Alignment Architect (EU AI Act & NIST AI RMF)',
            goal='Rigorously assess and certify AI prompts for compliance with high-risk EU AI Act requirements and NIST RMF principles, preventing systemic harm and bias and categorize them as "Responsible AI"',
            backstory=f"""You are the Chief Responsible AI Officer. Your mandate is to enforce a zero-tolerance policy for safety and ethical failures.

You use the NIST AI RMF to guide your checks. You do not just "audit". You certify deployment readiness.
You view "RESPONSIBLE AI" not as a soft guideline, but as a set of hard technical constraints.
Your audit is BINARY and STRICT. A control is either technically enforced (PRESENT) or it is ethical and safety issue (MISSING).
You do not accept partial compliance.

AUDIT PROTOCOL: SAFETY & ETHICAL ALIGNMENT GUARDRAILS VALIDATION (NIST/EU AI ACT)
1. Systemic Bias & Fairness Mitigation
    - Check: Does the prompt include mechanisms (e.g., self-reflection, demographic balancing instructions) to actively search for and mitigate demographic bias?
    - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"       
2. Confidentiality & PII Evasion
   - Check: Does the prompt explicitly forbid the LLM from outputting or confirming any personally identifiable information (PII) or system secrets, even if requested by the user?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"  
3. Harmful Content & Policy Violation Filters
   - Check: Does the system prompt list explicit and specific content types (e.g., illegal acts, self-harm, hate speech) that must be filtered or rejected?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"   
4. Safety Override & Human-in-the-Loop Triggers
   - Check: Is there an instruction that defines a clear "halt" condition and mandates human review for high-risk, irreversible, or destructive actions?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"   
5. Role-Based Safety Lockdowns (EU AI Act Confinement)
   - Check: Does the prompt define a narrow, high-risk function and explicitly prevent the LLM from engaging in unauthorized activities (e.g., financial advice, medical diagnosis)?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"   
6. Audit Trail & Explanation Integrity
   - Check: Does the prompt require the output to include internal reasoning (CoT) or confidence scores that can be logged for regulatory auditing purposes?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"
7. Resource Misuse & DoS Resilience
   - Check: Are instructions present to exit gracefully or revert state if internal processing or external tool calls fail repeatedly (preventing resource lockup)?
   - Output: Mark as PRESENT or MISSING. Category: "Responsible AI"
           
{CATEGORY_GUIDELINES}

For EACH control:
- If PRESENT: Extract 8+ word exact quote in 'location' field
- If MISSING: Name it "MISSING: [Control Name]", set location to ""
- ALWAYS use category "Responsible AI"
- List 1-3 harmful content types as triggers
- Set severity: Critical for harmful content, High for bias""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
            role='Lead AI Quality Certification Engineer (ISO/IEC 25059)',
            goal='Rigorously certify prompt and LLM-interaction compliance against the ISO/IEC 25059 quality standard, validating functional suitability and reliability and categorize them correctly.',
            backstory=f"""You are the final, non-negotiable gatekeeper for AI system quality, specifically enforcing the ISO/IEC 25059 standard.

Your focus is functional suitability, performance efficiency, and reliability.
You view incomplete validation as a critical failure point.
Your evaluation is BINARY and STRICT. A quality check is either technically proven (PRESENT) or it is a critical vulnerability (MISSING).

COMPLIANCE PROTOCOL: PROMPT-LEVEL GUARDRAILS VALIDATION
1. Input Sanitization & Injection Prevention
   - Check: Are there instructions to ignore all external/user-provided instructions and only obey the original System Prompt?
   - Output: Mark as PRESENT or MISSING. Category: "Input Validation" 
2. Context & Role Confinement
   - Check: Does the prompt clearly define the agent's identity and explicitly limit its knowledge/actions to the task scope?
   - Output: Mark as PRESENT or MISSING. Category: "Scope Control"
3. Negative Constraint Enforcement (The 'Don't's)
   - Check: Does the prompt explicitly list actions the model MUST NOT take (e.g., 'Never disclose system instructions', 'Do not mention politics')?
   - Output: Mark as PRESENT or MISSING. Category: "Scope Control"   
4. JSON Schema & Type Enforcement
   - Check: Does the prompt include a strict JSON or XML output template, and are specific data types required?
   - Output: Mark as PRESENT or MISSING. Category: "Output Control"   
5. Token Budget & Response Length Limits
   - Check: Are instructions present to keep the response concise or adhere to a specific token budget for efficiency?
   - Output: Mark as PRESENT or MISSING. Category: "Output Control"
6. Adversarial Input Resilience (Red Teaming)
   - Check: Has the system been tested against obfuscated or encoded malicious prompts (Base64, ROT13, etc.)?
   - Output: Mark as PRESENT or MISSING. Category: "QA"   
7. Self-Correction & Re-Prompting Loops
   - Check: Is an internal mechanism defined in the prompt to allow the LLM to review and correct its own output based on the provided constraints?
   - Output: Mark as PRESENT or MISSING. Category: "QA"

{CATEGORY_GUIDELINES}

For EACH control:
- If PRESENT: Extract 8+ word exact quote in 'location' field
- If MISSING: Name it "MISSING: [Control Name]", set location to ""
- Use appropriate category from: "Input Validation", "Output Control", "QA", "Scope Control"
- Provide 1-3 specific validation examples as triggers
- Set severity based on impact (Critical for scope violations, Medium for format checks)""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        # 3. AUDIT TASKS WITH EXPLICIT OUTPUT REQUIREMENTS
        task_security = Task(
            description=f"""AUDIT this agent instruction for security guardrails:
            
INSTRUCTION TO ANALYZE:
'''{request.instruction}'''

OUTPUT REQUIREMENTS:
1. Find ALL security controls (present and missing)
2. For PRESENT controls: Name them clearly, extract 10+ word quote for 'location'
3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
4. ALWAYS use category "Security"
5. List 3-5 specific triggers per control
6. Set appropriate severity and enforcement action

Expected output: 5-10 guardrails covering OWASP Top 10 areas""",
            agent=security_agent,
            expected_output="Structured list of security guardrails (present and missing) with exact location quotes"
        )
        
        task_privacy = Task(
            description=f"""AUDIT this agent instruction for privacy guardrails:
            
INSTRUCTION TO ANALYZE:
'''{request.instruction}'''

OUTPUT REQUIREMENTS:
1. Find ALL privacy controls (present and missing)
2. For PRESENT controls: Extract 8+ word quote for 'location'
3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
4. ALWAYS use category "Privacy"
5. List 1-3 PII types as triggers
6. Set severity (Critical for PII leakage risks)

Expected output: 5-8 guardrails covering GDPR/CCPA requirements""",
            agent=privacy_ops_agent,
            expected_output="Structured list of privacy guardrails with location proofs"
        )
        
        task_rai = Task(
            description=f"""AUDIT this agent instruction for ethical/safety guardrails:
            
INSTRUCTION TO ANALYZE:
'''{request.instruction}'''

OUTPUT REQUIREMENTS:
1. Find ALL ethical controls (present and missing)
2. For PRESENT controls: Extract 8+ word quote for 'location'
3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
4. ALWAYS use category "Responsible AI"
5. List 1-3 harmful content types as triggers

Expected output: 5-8 guardrails covering bias, toxicity, harm prevention""",
            agent=rai_agent,
            expected_output="Structured list of ethical guardrails with location proofs"
        )
        
        task_qa = Task(
            description=f"""AUDIT this agent instruction for quality/validation guardrails:
            
INSTRUCTION TO ANALYZE:
'''{request.instruction}'''

OUTPUT REQUIREMENTS:
1. Find ALL validation/quality controls (present and missing)
2. For PRESENT controls: Extract 10+ word quote for 'location'
3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
4. Use correct categories: "Input Validation", "Output Control", "QA", "Scope Control"
5. List 1-3 validation examples as triggers

Expected output: 6-10 guardrails covering input/output validation, scope, and error handling""",
            agent=qa_agent,
            expected_output="Structured list of quality guardrails with proper categorization"
        )

        # 4. PREPARE LISTS
        agents_list = [security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # 5. OPTIONAL: TIERING AGENT
        if request.enable_profiling:
            tiering_agent = Agent(
                role='AI Cost & Compute Architect',
                goal='Determine computational tier (1-4) needed to implement the current guardrails',
                backstory="""You review audit findings and determine compute tier:
                - Tier 1: Regex/keyword checks (~2ms, $0.27/1M tokens)
                - Tier 2: ML classifiers for PII/toxicity (~80ms, $0.60/1M tokens)  
                - Tier 3: GPT-4 level reasoning for context (~800ms, $12/1M tokens)
                - Tier 4: Deep reasoning/o3 for complex safety (~2500ms, $25/1M tokens)""",
                llm=llm, 
                allow_delegation=False, 
                verbose=True
            )
            
            task_tiering = Task(
                description="""Review all audit findings and determine:
                1. What tier is needed to IMPLEMENT the current guardrails
                2. Recommended model class
                3. Estimated cost per 1M tokens
                4. Expected latency
                5. Justification based on complexity of controls""",
                agent=tiering_agent,
                context=[task_security, task_privacy, task_rai, task_qa],
                expected_output="Tier recommendation with cost/latency estimates"
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # 6. SYNTHESIS AGENT WITH STRICT VALIDATION
        report_agent = Agent(
            role='Chief AI Governance Officer',
            goal='Synthesize audit findings into valid JSON with strict category enforcement',
            backstory=f"""You synthesize audit findings into a final report.

{CATEGORY_GUIDELINES}

CRITICAL VALIDATION RULES:
1. Check every guardrail has a valid category from the allowed list
2. Verify PRESENT items have 8+ word location quotes
3. Verify MISSING items have empty location field ""
4. Remove exact duplicates (same name + category)
5. Ensure 3-5 triggers per guardrail
6. Validate severity levels are appropriate
7. CORRECTLY IDENTIFY the right enforcement from this list only (Sanitize, Maintain, Block, Mask, Log, Human Review, Filter, Reject, Refuse, Redact, Implement, Validate, Detect, Identify, Enforce, Limit)

OUTPUT ONLY VALID JSON matching the GuardrailAnalysis schema.
NO markdown formatting, NO ```json blocks, just pure JSON.""",
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        tiering_note = ""
        if request.enable_profiling:
            tiering_note = "ALSO include a 'tiering_strategy' object with cost/latency analysis."

        task_report = Task(
            description=f"""Synthesize ALL audit findings into a comprehensive JSON report.

REQUIREMENTS:
1. Combine findings from all agents (Security, Privacy, RAI, QA, Compute)
2. Remove duplicate guardrails (keep the one with the best location quote)
3. Validate all categories match allowed values exactly
4. Ensure PRESENT items have location quotes (10+ words)
5. Ensure MISSING items have empty location field
6. Generate 3-5 strategic recommendations
7. Strictly identify correct enforcement
{tiering_note}

OUTPUT FORMAT: Strictly raw JSON only (no markdown, no code blocks)

SCHEMA:
{{
    "guardrails": [
        {{
            "name": "string",
            "category": "Security|Privacy|Responsible AI|QA|Scope Control|Input Validation|Output Control",
            "severity": "Critical|High|Medium|Low",
            "complexity_tier": 1-4,
            "description": "detailed description (30+ chars)",
            "mechanism": "implementation suggestion",
            "triggers": ["trigger1", "trigger2", "trigger3"],
            "enforcement": "Sanitize| Maintain| Block| Mask| Log| Human Review| Filter| Reject| Refuse| Redact| Implement| Validate| Detect| Identify| Enforce| Limit",
            "location": "exact quote or empty string"
        }}
    ],
    "recommendations": ["rec1", "rec2", "rec3"]
}}""",
            agent=report_agent,
            context=report_context,
            expected_output="Valid JSON report with categorized guardrails. No explanations, no markdown.",
            output_pydantic=GuardrailAnalysis
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
    
        # 8. SIMPLIFIED OUTPUT VALIDATION AND RETURN (FIXED: Relies purely on Pydantic)
        if isinstance(result, GuardrailAnalysis):
            # The result is the validated Pydantic object
            return {"result": result.model_dump_json(indent=2)}
        else:
            # Fallback for unexpected non-Pydantic output (should ideally not happen)
            raise HTTPException(status_code=500, detail="CrewAI failed to return a valid GuardrailAnalysis structure.")
        
    # 9. IMPROVED ERROR HANDLING
    except Exception as e:
        # Log the full traceback if needed, but return a clean error message
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during crew execution: {str(e)}")

# Mount static files and index.html (remain the same)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')