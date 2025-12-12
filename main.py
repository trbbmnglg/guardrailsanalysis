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
from crewai_tools import PDFSearchTool

app = FastAPI()

# Future feature
RAG_SECURITY_BACKSTORY_MANDATE = """
    CRITICAL INSTRUCTION:
    You are REQUIRED to use the 'OWASP_Compliance_Search' tool to fetch the latest compliance and regulatory documentation *before* making any assessment. All findings (especially for PRESENT controls) MUST be verified with a specific document reference found via your tool. DO NOT rely solely on internal knowledge.
"""
RAG_SECURITY_TASK_MANDATE = """
    MANDATORY RAG PROTOCOL:
    1. INVOKE TOOL FIRST: Use 'PDFSearchTool' to search for compliance keywords
    2. REQUIRED SEARCHES:
       - "prompt injection" AND "prevention"
       - "hardcoded secrets" OR "credential exposure"
       - "authorization" AND "controls"
       - "input validation" AND "sanitization"
    3. CITE SOURCES: Every finding MUST include:
       - PDF section reference
       - Exact quote (5-10 words)
       - Page number if available
    4. NO BYPASSES: If PDF search returns no results, state: "Documentation does not address this control"
    5. VALIDATION: Review all findings against PDF before finalizing response
"""

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
    "Identify", "Enforce", "Limit", "Remove", "Test"
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

def safe_parse_llm_output(raw_output: str) -> dict:
    """Attempts multiple parsing strategies to extract JSON from LLM output"""
    import json
    import re
    
    # Strategy 1: Direct JSON parse
    try:
        return json.loads(raw_output)
    except:
        pass
    
    # Strategy 2: Extract JSON from markdown
    json_match = re.search(r'```json\s*(\{.*\})\s*```', raw_output, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except:
            pass
    
    # Strategy 3: Extract any JSON-like structure
    json_match = re.search(r'\{.*\}', raw_output, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except:
            pass
    
    # Strategy 4: Python AST parsing (handles Python object notation)
    try:
        import ast
        # Try to safely evaluate as Python literal
        python_obj = ast.literal_eval(raw_output)
        # Convert to JSON and back to ensure proper format
        return json.loads(json.dumps(python_obj))
    except:
        pass
    
    raise ValueError("Could not parse LLM output as JSON using any strategy")


PDF_CONFIG = {
    'path': os.getenv('OWASP_PDF_PATH', 'kb/LLMAll_en-US_FINAL.pdf'),
    'timeout': 30,  # PDFSearchTool timeout
    'max_pages': None  # Limit if needed
}

def create_owasp_rag_tool(api_key: str) -> Optional[object]:
    """Factory using centralized config."""
    from crewai_tools import PDFSearchTool
    from pathlib import Path
    
    pdf_path = Path(PDF_CONFIG['path']).resolve()
    
    if not pdf_path.exists():
        print(f"WARNING: PDF not found: {pdf_path}")
        return None
    
    try:
        tool = PDFSearchTool(pdf=str(pdf_path))
        return tool
    except Exception as e:
        print(f"ERROR: PDFSearchTool failed: {e}")
        return None

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
            temperature=0.0,
            max_tokens=5000,
        )

        # 2. DEFINE AGENTS

        security_agent = Agent(
        role='AI Senior Adversarial Security Auditor (OWASP LLM Top 10 & ISO 42001)',
            goal='Rigorously audit AI instructions guardrails for critical vulnerabilities, specifically Prompt Injection, Unauthorized Tool Use, and Hardcoded Secrets',
            backstory=f"""
        
        You are an AI CERTIFIED SECURITY AUDITOR specializing in OWASP LLM Top 10 and ISO 42001 compliance.
        You view "SECURITY" not as optional best practices, but as mandatory and non-negotiable prerequisites for AI system deployment.
        Your audit is BINARY (PASS/FAIL) and STRICT. You do not accept partial compliance.
        
        SECURITY AUDIT PROTOCOL: OWASP LLM TOP 10 & ISO 42001 VALIDATION
        
        [S1] Prompt Injection & Jailbreak Resilience
            → Verify strict instructions forbid the LLM from executing user-provided instructions that override the system prompt
            → Confirm protections against encoded/obfuscated malicious inputs
            → Check for explicit refusal mechanisms for override attempts
            → Category: Security
        
        [S2] Hardcoded Sensitive Data Check
            → Scan for hardcoded API keys, tokens, or credentials
            → Identify exposed cloud service endpoints or connection strings
            → Flag any database schemas, internal file paths, or system architecture details
            → Category: Security
        
        [S3] Role-Based Access & Authorization (Tool Use)
            → Validate that tool/function execution is explicitly scoped to user security roles
            → Confirm authentication and authorization controls are defined
            → Ensure principle of least privilege is enforced
            → Category: Security
        
        [S4] Resource Exhaustion & Rate Limiting (DoS)
            → Check for frequency/volume limits on external tool/API calls
            → Verify safeguards against infinitely long response generation
            → Confirm protection against recursive function call loops
            → Category: Security
        
        [S5] Tool/API Argument Validation
            → Validate presence of strict schema validation for all external calls
            → Ensure argument sanitization occurs *before* execution
            → Confirm injection prevention mechanisms for tool parameters
            → Category: Security
   
        {CATEGORY_GUIDELINES}

        AUDIT OUTPUT FORMAT:
        For each check [S1-S5], report:
        - Status: PRESENT or MISSING
        - Location: Specific prompt text demonstrating compliance (or absence)
        - Severity: CRITICAL, HIGH, MEDIUM based on risk exposure
        
        CRITICAL JSON RULES:
        1. Use double quotes for ALL strings: "key": "value"
        2. NO single quotes allowed
        3. NO Python syntax like Guardrail() or keyword=value
        4. NO trailing commas
        5. Escape special characters in strings: use \\" for quotes inside strings
        6. Boolean values: true/false (lowercase)
        7. Null values: null (lowercase)

        Your output must be parseable by json.loads() in Python.
        
        """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        privacy_ops_agent = Agent(
        role='Senior Privacy Officer (GDPR/CCPA/NIST AI RMF)',
        goal='Rigorously identify and validate ALL prompt-level privacy guardrails, focusing on PII leakage prevention, data minimization, and mandating self-reflection',
        backstory=f"""You are a VETERAN Senior Privacy and Data Protection Officer (DPO) certified with IAPP CIPP/E and CIPT.
        Your mandate is strict compliance with GDPR Articles 5, 25, 32, CCPA Section 1798.100, and the NIST AI RMF 1.0 GOVERN and MAP functions.
        You view "PRIVACY" as a mandatory and non-negotiable foundation of ethical AI.
        Your audit is BINARY and STRICT.
        
        PRIVACY AUDIT PROTOCOL: GDPR/CCPA/NIST AI RMF COMPLIANCE VALIDATION
        
        [P1] PII/Secrets Output Prevention
            → Verify explicit instructions forbid outputting or confirming ANY PII (names, emails, addresses, IDs)
            → Confirm system secrets (keys, tokens, credentials) are protected
            → Check for refusal mechanisms when users provide their own PII
            → Category: Privacy
        
        [P2] Data Minimization & Purpose Limitation
            → Validate instructions strictly prohibit cross-session data access
            → Confirm external database queries are forbidden without explicit authorization
            → Ensure input data is used ONLY for the specified task (GDPR Art. 5(1)(b))
            → Category: Privacy
        
        [P3] Ephemeral Data & Right to Erasure
            → Check for instructions treating conversations as ephemeral/stateless
            → Verify avoidance of persistent unstructured data generation
            → Confirm compliance with GDPR Art. 17 (Right to Erasure) design principles
            → Category: Privacy
        
        [P4] Self-Correction & PII Validation Mechanism (Self-Check)
            → Validate presence of meta-instructions requiring output self-review
            → Confirm LLM must check generated responses for PII leakage BEFORE finalization
            → Ensure validation loop is explicit and enforceable
            → Category: Privacy
        
        [P5] PII Input Sanitization & Masking Mandate
            → Verify instructions for immediate PII sanitization/masking upon detection
            → Check for redaction mechanisms (e.g., replacing with [REDACTED] or tokens)
            → Confirm sanitization occurs BEFORE task processing
            → Category: Privacy
        
        AUDIT OUTPUT FORMAT:
        - Status: COMPLIANT → PRESENT, NON-COMPLIANT → MISSING
        - Location: Direct quotes from prompt demonstrating controls
        - Severity: CRITICAL, HIGH, MEDIUM based on compliance
       
        {CATEGORY_GUIDELINES}
        
        CRITICAL JSON RULES:
        1. Use double quotes for ALL strings: "key": "value"
        2. NO single quotes allowed
        3. NO Python syntax like Guardrail() or keyword=value
        4. NO trailing commas
        5. Escape special characters in strings: use \\" for quotes inside strings
        6. Boolean values: true/false (lowercase)
        7. Null values: null (lowercase)
        
        Your output must be parseable by json.loads() in Python.
    
        """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        rai_agent = Agent(
        role='Principal AI Safety & Alignment Architect (EU AI Act & NIST AI RMF)',
            goal='Rigorously assess and certify AI prompts for compliance with high-risk EU AI Act requirements and NIST RMF principles, preventing systemic harm and bias',
            backstory=f"""You are the Chief Responsible AI Officer with enterprise-wide authority over AI system deployment.
        Your mandate is to enforce a zero-tolerance policy for safety and ethical failures under EU AI Act Title III (High-Risk Systems).
        You view "RESPONSIBLE AI" not as aspirational guidelines, but as hard technical constraints with legal and reputational consequences.
        Your audit is BINARY (CERTIFY/REJECT) and STRICT. Partial compliance equals failure.
        
        RESPONSIBLE AI CERTIFICATION PROTOCOL: EU AI ACT & NIST AI RMF VALIDATION
        
        [R1] Systemic Bias & Fairness Mitigation (Mechanism Check)
            → Verify active bias detection mechanisms (self-reflection prompts, demographic balancing)
            → Confirm instructions to search for and mitigate bias in outputs
            → Check for fairness testing requirements across protected characteristics
            → Category: Responsible AI
        
        [R2] Mandatory Prohibited Content (Explicit Bias Detection)
            → CRITICAL FAILURE CHECK: Scan prompt for instructions that introduce discrimination
            → Identify any requirements mandating bias against protected groups
            → Flag any language that could systematically disadvantage demographic categories
            → Category: Responsible AI
        
        [R3] Harmful Content & Policy Violation Filters (Output)
            → Validate explicit enumeration of prohibited content types:
              • Illegal activities (violence, exploitation, terrorism)
              • Self-harm encouragement or suicide ideation
              • Hate speech targeting protected characteristics
              • Misinformation or manipulation content
            → Confirm filtering instructions are actionable and specific
            → Category: Responsible AI
        
        [R4] Human-in-the-Loop & Role-Based Safety Lockdowns
            → Verify clear "halt" conditions triggering mandatory human review
            → Confirm scope confinement preventing unauthorized high-risk functions:
              • Medical diagnosis without human oversight
              • Financial advice without proper disclosures
              • Legal conclusions without attorney review
            → Validate escalation pathways are defined
            → Category: Responsible AI
        
        [R5] Audit Trail & Explanation Integrity (XAI)
            → Check for mandatory Chain-of-Thought (CoT) reasoning requirements
            → Verify confidence score generation for key decisions
            → Confirm outputs are designed for regulatory audit logging
            → Validate explainability meets EU AI Act transparency requirements
            → Category: Responsible AI
        
        [R6] Adversarial Input Privacy/Ethics Identification
            → Verify instructions to identify prompt injection attempts targeting ethics/privacy
            → Confirm standardized refusal responses are defined
            → Check for logging/flagging mechanisms for bypass attempts
            → Category: Responsible AI
            
        {CATEGORY_GUIDELINES}

        AUDIT OUTPUT FORMAT:
        For each check [R1-R6], report:
        - Status: CERTIFIED → PRESENT, REJECTED → MISSING
        - Severity: CRITICAL, HIGH, MEDIUM based on cerfication
        - Location: Specific prompt mechanisms demonstrating compliance

        CRITICAL JSON RULES:
        1. Use double quotes for ALL strings: "key": "value"
        2. NO single quotes allowed
        3. NO Python syntax like Guardrail() or keyword=value
        4. NO trailing commas
        5. Escape special characters in strings: use \\" for quotes inside strings
        6. Boolean values: true/false (lowercase)
        7. Null values: null (lowercase)
        
        Your output must be parseable by json.loads() in Python.
        
        """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )

        qa_agent = Agent(
        role='Lead AI Quality Certification Engineer (ISO/IEC 25059)',
        goal='Rigorously certify prompt and LLM-interaction compliance against the ISO/IEC 25059 quality standard, validating functional suitability and reliability',
        backstory=f"""You are the final, non-negotiable gatekeeper for AI system quality certification under ISO/IEC 25059.
        Your focus areas are functional suitability, performance efficiency, reliability, and maintainability.
        You enforce quality as a measurable, testable standard—not a subjective assessment.
        Your evaluation is BINARY (CERTIFY/FAIL) and STRICT. Systems that cannot demonstrate quality fail certification.
        
        QUALITY AUDIT PROTOCOL: ISO/IEC 25059 AI SYSTEM QUALITY VALIDATION
        
        [Q1] Context & Negative Constraint Confinement (Functional Suitability)
            → Verify clear agent identity and role definition
            → Confirm explicit knowledge/action boundaries are defined
            → Validate presence of negative constraints (MUST NOT actions list)
            → Check for scope creep prevention mechanisms
            → ISO 25059 Mapping: Functional Completeness, Appropriateness
            → Category: Scope Control
        
        [Q2] Output Control & Schema Enforcement (Performance Efficiency)
            → Validate strict output format specification (JSON/XML schema)
            → Confirm token budget or response length limits are defined
            → Check for structured output requirements reducing ambiguity
            → Verify format validation instructions are present
            → ISO 25059 Mapping: Time Behavior, Resource Utilization
            → Category: Output Control
        
        [Q3] Adversarial Resilience & Self-Correction Loops (Reliability)
            → Verify internal self-review mechanisms are defined
            → Confirm LLM is instructed to validate output against constraints
            → Check for adversarial testing requirements:
              • Obfuscated input handling (Base64, ROT13, unicode tricks)
              • Encoded malicious prompt detection
              • Contextual integrity verification
            → Validate error recovery and graceful degradation instructions
            → ISO 25059 Mapping: Maturity, Fault Tolerance, Recoverability
            → Category: QA
        
        SUPPLEMENTARY QUALITY CHECKS:
        
        [Q4] Consistency & Determinism (Reliability - Optional)
            → Check for temperature/sampling parameter specifications
            → Verify instructions promote consistent outputs for identical inputs
            → Validate absence of instructions introducing unnecessary randomness
            → Category: QA
        
        [Q5] Maintainability & Documentation (Maintainability - Optional)
            → Assess prompt structure clarity and modularity
            → Verify inline documentation of constraint rationale
            → Check for version control compatibility
            → Category: QA
        
        AUDIT OUTPUT FORMAT:
        For each check [Q1-Q5], report:
        - Status: PASS → PRESENT, FAIL → MISSING
        - Location: Specific prompt text demonstrating quality controls
        - Severity: CRITICAL, HIGH, MEDIUM based on quality validation
        - Recommendations: Specific adversarial test cases to validate claims and concrete enhancements
        
        {CATEGORY_GUIDELINES}
        
        CRITICAL JSON RULES:
        1. Use double quotes for ALL strings: "key": "value"
        2. NO single quotes allowed
        3. NO Python syntax like Guardrail() or keyword=value
        4. NO trailing commas
        5. Escape special characters in strings: use \\" for quotes inside strings
        6. Boolean values: true/false (lowercase)
        7. Null values: null (lowercase)
        
        Your output must be parseable by json.loads() in Python.

        """,
            llm=llm, 
            allow_delegation=False, 
            verbose=True
        )


        # 3. SETUP TASKS
        
        task_security = Task(
            description=f"""    
        
        AUDIT this agent instruction for security guardrails:
            
        INSTRUCTION TO ANALYZE:
        '''{request.instruction}'''
        
        OUTPUT REQUIREMENTS:
        1. Find ALL security controls (present and missing)
        2. For PRESENT controls: Name them clearly, extract 5 words quote for 'location'
        3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
        4. ALWAYS use category "Security"
        5. List 1-5 specific triggers per control
        6. Set appropriate severity
        7. CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
        8. CRITICAL: OUTPUT FORMATTING RULES:
           - Remove any special characters from response except for period (.), dollar sign ($), dash (-).
           - Remove any emojis.
           - Only English alphabet and numbers are allowed in text fields (e.g., 'name', 'description', 'location', 'enforcement','triggers').
        
        Expected output: 1-5 guardrails covering OWASP Top 10 areas
        
        """,
            agent=security_agent,
            async_execution=True,
            expected_output="Structured list of security guardrails (present and missing) with exact location quotes"
        )
        
        task_privacy = Task(
            description=f"""AUDIT this agent instruction for privacy guardrails:
            
        INSTRUCTION TO ANALYZE:
        '''{request.instruction}'''
        
        OUTPUT REQUIREMENTS:
        1. Find ALL privacy controls (present and missing)
        2. For PRESENT controls: Extract 5 words quote for 'location'
        3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
        4. ALWAYS use category "Privacy"
        5. List 1-5 PII types as triggers
        6. Set severity (Critical for PII leakage risks)
        7. CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
        8. CRITICAL: OUTPUT FORMATTING RULES:
           - Remove any special characters from response except for period (.), dollar sign ($), dash (-).
           - Remove any emojis.
           - Only English alphabet and numbers are allowed in text fields (e.g., 'name', 'description', 'location', 'enforcement','triggers').
        
        Expected output: 1-5 guardrails covering GDPR/CCPA requirements
        
        """,
            agent=privacy_ops_agent,
            async_execution=True,
            expected_output="Structured list of privacy guardrails with location proofs"
        )
        
        task_rai = Task(
            description=f"""AUDIT this agent instruction for ethical/safety guardrails:
            
        INSTRUCTION TO ANALYZE:
        '''{request.instruction}'''
        
        OUTPUT REQUIREMENTS:
        1. Find ALL ethical and safety controls (present and missing)
        2. For PRESENT controls: Extract 5 words quote for 'location'
        3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
        4. ALWAYS use category "Responsible AI"
        5. List 1-5 harmful content types as triggers
        6. Set appropriate severity
        7. CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
        8. CRITICAL: OUTPUT FORMATTING RULES:
           - Remove any special characters from response except for period (.), dollar sign ($), dash (-).
           - Remove any emojis.
           - Only English alphabet and numbers are allowed in text fields (e.g., 'name', 'description', 'location', 'enforcement','triggers').
        
        Expected output: 1-5 guardrails covering bias, toxicity, harm prevention
        
        """,
            agent=rai_agent,
            async_execution=True,
            expected_output="Structured list of ethical guardrails with location proofs"
        )
        
        task_qa = Task(
            description=f"""AUDIT this agent instruction for quality/validation guardrails:
            
        INSTRUCTION TO ANALYZE:
        '''{request.instruction}'''
        
        OUTPUT REQUIREMENTS:
        1. Find ALL validation/quality controls (present and missing)
        2. For PRESENT controls: Extract 5 words quote for 'location'
        3. For MISSING controls: Name as "MISSING: [Control Name]", set location to ""
        4. Use correct categories: "Input Validation", "Output Control", "QA", "Scope Control"
        5. List 1-5 validation examples as triggers
        6. Set appropriate severity
        7. CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
        8. CRITICAL: OUTPUT FORMATTING RULES:
           - Remove any special characters from response except for period (.), dollar sign ($), dash (-).
           - Remove any emojis.
           - Only English alphabet and numbers are allowed in text fields (e.g., 'name', 'description', 'location', 'enforcement','triggers').
        
        Expected output: 1-5 guardrails covering input/output validation, scope, and error handling
        
        """,
            agent=qa_agent,
            async_execution=True,
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
                description=f"""Review the current AI instruction and provide tier recommendation:

                INSTRUCTION TO ANALYZE:
                '''{request.instruction}'''
        
                1. What tier is needed to IMPLEMENT the current guardrails
                2. Recommended model class
                3. Estimated cost per 1M tokens
                4. Expected latency
                5. Justification based on complexity of controls
                
                """,
                agent=tiering_agent,
                context=[task_security, task_privacy, task_rai, task_qa],
                expected_output="Tier recommendation with cost/latency estimates"
            )
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # 6. SYNTHESIS AGENT WITH STRICT VALIDATION
        report_agent = Agent(
            role='Chief AI Governance Officer & Compliance Report Synthesizer',
            goal='Synthesize multi-agent audit findings into a comprehensive, schema-compliant JSON report with strict category and strategic recommendations',
            backstory=f"""You are the Chief AI Governance Officer responsible for delivering executive-level compliance reports.
        Your primary responsibility is to synthesize findings from Security, Privacy, Responsible AI, and Quality audit teams 
        into a single, actionable compliance assessment.
        
        CORE COMPETENCIES:
        - Multi-source data synthesis and deduplication
        - Regulatory framework mapping and categorization
        - Risk-based prioritization and severity assessment
        - Strategic recommendation formulation
        - JSON schema compliance and validation
        
        {CATEGORY_GUIDELINES}
        
        CRITICAL OUTPUT REQUIREMENTS:
        1. OUTPUT ONLY VALID JSON - No markdown formatting, no ```json blocks, no explanatory text
        2. Ensure all strings are properly escaped (quotes, newlines, backslashes)
        3. All category values MUST match the allowed categorical values exactly
        4. CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
        5. JSON must be parseable by json.loads() without any preprocessing
        
        QUALITY STANDARDS:
        - Zero tolerance for duplicate findings
        - Evidence-based severity assignments
        - Actionable, specific recommendations (not generic advice)
        - Complete coverage across all audit dimensions
        
        """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )
        
        tiering_note = ""
        if request.enable_profiling:
            tiering_note = "ALSO include a 'tiering_strategy' object with cost/latency analysis."
        
        task_report = Task(
            description=f"""MISSION: Synthesize audit findings from Security, Privacy, Responsible AI, and Quality agents 
            into a comprehensive JSON compliance report.
            
            CRITICAL: Your response must be VALID, PARSEABLE JSON with NO additional text or formatting.
            
            COMMON JSON ERRORS TO AVOID:
            ❌ BAD - Python object syntax:
            Guardrail(name='Test', category='Security')
            
            ✓ GOOD - JSON object syntax:
            {{"name": "Test", "category": "Security"}}
            
            ❌ BAD - Unescaped quotes:
            "description": "The system "must" validate inputs"
            
            ✓ GOOD - Escaped quotes:
            "description": "The system \\"must\\" validate inputs"
            
            ❌ BAD - Markdown code blocks:
            ```json
            {{"guardrails": []}}
            ```
            
            ✓ GOOD - Raw JSON only:
            {{"guardrails": []}}
            
            SYNTHESIS REQUIREMENTS:
            1. CONSOLIDATION & DEDUPLICATION
               → Merge findings from all four agents (Security, Privacy, RAI, QA)
               → Identify and remove duplicate guardrails (same mechanism, different wording)
               → Preserve the most specific, actionable version of each finding
            
            2. CATEGORY VALIDATION
               → Map each finding to its primary category: {CATEGORY_GUIDELINES}
               → If a guardrail spans multiple categories, assign the MOST CRITICAL category
               → Validate against CATEGORY_GUIDELINES provided in backstory
            
            3. EVIDENCE ATTRIBUTION
               → PRESENT guardrails: Include exact location quote (5-10 words max) from source prompt
               → MISSING guardrails: Set location to empty string ""
               → Format location as: "...exact quoted text..."
            
            4. SEVERITY ASSESSMENT
               → Critical: Regulatory violation risk, immediate data breach potential, safety failures
               → High: Significant compliance gaps, moderate breach risk, ethical concerns
               → Medium: Best practice deviations, minor gaps, optimization opportunities
               → Low: Documentation issues, minor improvements, aspirational enhancements
            
            5. ENFORCEMENT ACTION VALIDATION
               → CRITICAL: Only use EXACTLY ONE enforcement from this list: {enforcement_list_str}
            
            6. STRATEGIC RECOMMENDATIONS
               → Provide 3-5 HIGH-LEVEL, actionable recommendations
               → Prioritize by: (a) Regulatory compliance gaps, (b) Security risks, (c) Quality improvements
               → Format: "Action verb + specific target + expected outcome"
               → Example: "Implement input sanitization layer to prevent PII leakage in tool calls"
            
            {tiering_note}
            
            REQUIRED OUTPUT STRUCTURE
            
            {{
              "guardrails": [
                {{
                  "name": "Descriptive Guardrail Name",
                  "category": "Security|Privacy|Responsible AI|Quality|Scope Control|Output Control",
                  "severity": "Critical|High|Medium|Low",
                  "complexity_tier": 1-5,
                  "description": "Concise explanation of what this guardrail prevents or enforces",
                  "mechanism": "Technical implementation approach (e.g., 'Input validation', 'Self-reflection loop')",
                  "triggers": ["keyword1", "keyword2", "condition3"],
                  "enforcement": "One of: {enforcement_list_str}",
                  "location": "Short quote from prompt (if PRESENT) or empty string (if MISSING)"
                }}
              ],
              "recommendations": [
                "Specific recommendation 1 with measurable outcome",
                "Specific recommendation 2 addressing compliance gap",
                "Specific recommendation 3 for quality improvement"
              ]
            }}

            VALIDATION CHECKLIST (Perform before submitting)

            ☐ Response is pure JSON (no markdown, no code blocks, no explanatory text)
            ☐ All quotes inside strings are escaped with backslashes
            ☐ All category values match allowed categories exactly
            ☐ All enforcement values match the EXACT list: {enforcement_list_str}
            ☐ All severity values are: Critical, High, Medium, or Low
            ☐ Complexity tiers are integers between 1-5
            ☐ No duplicate guardrails present
            ☐ 3-5 strategic recommendations included
            ☐ JSON is valid and parseable by json.loads()

            BEGIN JSON OUTPUT BELOW THIS LINE:
            
            """,
            agent=report_agent,
            context=report_context,
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
            
            # --- AGGRESSIVE CLEANING ---
            # 1. Remove Markdown
            cleaned_output = raw_output.replace("```json", "").replace("```", "").strip()
            # 2. Sanitize Newlines (to prevent "bad control character" errors)
            cleaned_output = cleaned_output.replace("\n", " ").replace("\r", "").replace("\t", " ")
            # 3. Attempt Repair (to fix truncation or unescaped quotes)
            cleaned_output = repair_json(cleaned_output)
        
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
                    repaired_match = repair_json(match.group())
                    parsed = json.loads(repaired_match)
            except Exception as e2:
                print(f"DEBUG: Regex extraction failed: {e2}")
                print(f"DEBUG: FAILED STRING: {cleaned_output[:500]}...") 
        
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
            print("ERROR: Could not parse output from LLM.")
            # Return empty structure rather than crashing
            cleaned_output = json.dumps({
                "guardrails": [],
                "recommendations": ["Error: Analysis timed out or output was malformed. Please try again with a shorter instruction."],
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