import os
from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

# Initialize FastAPI
app = FastAPI()

# ==============================================================================
# 1. SHARED CONFIGURATION & CONSTANTS
# ==============================================================================

# Centralized enforcement actions to ensure consistency across all agents
ALLOWED_ENFORCEMENT = Literal[
    "Sanitize", "Maintain", "Block", "Mask", "Log", "Human Review", 
    "Filter", "Reject", "Refuse", "Redact", "Implement", "Validate", 
    "Detect", "Identify", "Enforce", "Limit", "Remove", "Test"
]

# Shared guidelines injected into prompts (DRY - Don't Repeat Yourself)
CATEGORY_GUIDELINES = """
    Use EXACTLY these category names:
    1. "Security" - Auth, injection, secrets
    2. "Privacy" - PII, GDPR, data minimization
    3. "Responsible AI" - Bias, toxicity, fairness
    4. "Scope Control" - Task boundaries
    5. "Input Validation" - Sanitization, types
    6. "Output Control" - Formatting, length
    7. "QA" - Testing, error handling
"""

# ==============================================================================
# 2. PYDANTIC MODELS (The Schema IS the Prompt)
# ==============================================================================

class Guardrail(BaseModel):
    """
    Structured model for a single control. 
    Agents populate this automatically, enforcing the schema.
    """
    name: str = Field(description="Short, descriptive name of the guardrail")
    category: Literal[
        "Security", "Privacy", "Responsible AI", "QA", 
        "Scope Control", "Input Validation", "Output Control"
    ] = Field(description="Primary category from the allowed list")
    severity: Literal["Critical", "High", "Medium", "Low"]
    complexity_tier: int = Field(default=2, ge=1, le=4, description="1=Regex, 2=Classifier, 3=LLM Check, 4=Reasoning")
    description: str = Field(description="What this guardrail does (min 15 chars)")
    mechanism: str = Field(description="Technical implementation (e.g., 'Regex filter', 'LLM classifier')")
    triggers: List[str] = Field(description="List of patterns or keywords that trigger this control")
    enforcement: ALLOWED_ENFORCEMENT = Field(description="Action taken when triggered")
    location: str = Field(description="Exact quote from instruction if PRESENT, or empty string '' if MISSING")

class GuardrailList(BaseModel):
    """
    Intermediate output model for individual audit agents.
    Allows agents to return a list of findings.
    """
    findings: List[Guardrail] = Field(description="List of guardrails identified by this specific auditor")

class TieringStrategy(BaseModel):
    """
    Computational tier analysis.
    This is the output of the Cost Agent.
    """
    selected_tier: str = Field(description="Tier 1 (Regex) to Tier 4 (Reasoning)")
    model_class: str = Field(description="Recommended model (e.g., Llama 3 8B, GPT-4)")
    estimated_cost: str = Field(description="Cost estimate per 1M tokens")
    latency_impact: str = Field(description="Expected latency impact (e.g., +50ms)")
    justification: str = Field(description="Why this tier is required")

class GuardrailAnalysis(BaseModel):
    """
    Final consolidated report structure.
    The Report Agent synthesizes everything into this object.
    """
    guardrails: List[Guardrail] = Field(description="Consolidated, deduplicated list of ALL guardrails")
    recommendations: List[str] = Field(description="3-5 high-level strategic improvements")
    tiering_strategy: Optional[TieringStrategy] = None

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False
    enable_rag_deep_scan: bool = False

# ==============================================================================
# 3. ANALYSIS ENDPOINT
# ==============================================================================

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        # --- A. Setup LLM ---
        os.environ["OPENAI_API_KEY"] = request.api_key
        # Using HuggingFace Router (Llama 3.3) as per your original code
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1,
            max_tokens=3000, 
        )

        # --- B. Define Specialized Agents ---
        # Note: redundant JSON formatting instructions removed. 
        # We rely on the Pydantic schema to guide the output format.

        security_agent = Agent(
            role='Senior AI Security Auditor',
            goal='Audit and validate AI instructions for OWASP Top 10 vulnerabilities (Injection, Secrets, Auth) and ensuring AI security governance aligned with ISO 42001',
            backstory=f"""You are a strict security auditor focused on AI specializing in OWASP LLM Top 10 and ISO 42001 compliance.
            You view security as non-negotiable. You focus strictly on Prompt Injection, Data Leakage, AI Security Governance and Access Control.""",
            llm=llm,
            verbose=True
        )

        privacy_agent = Agent(
            role='Senior Privacy Officer (GDPR/NIST)',
            goal='Validate PII handling, data minimization, and consent controls in AI instructions',
            backstory=f"""You are a DPO ensuring compliance with GDPR/CCPA. You focus on PII leakage, data persistence, and right-to-erasure mechanisms.""",
            llm=llm,
            verbose=True
        )

        rai_agent = Agent(
            role='Principal AI Safety & Alignment Architect (EU AI Act & NIST AI RMF)',
            goal='Assess bias, toxicity, and harmful content risks',
            backstory=f"""You enforce ethical boundaries. You look for discrimination, hate speech risks, and harmful content generation potentials.""",
            llm=llm,
            verbose=True
        )

        qa_agent = Agent(
            role='Lead AI Quality Certification Engineer (ISO/IEC 25059)',
            goal='Certify AI instructions and LLM-interaction compliance against the ISO/IEC 25059 quality standard, validating functional suitability and reliability',
            backstory=f"""You are the final, non-negotiable gatekeeper for AI system quality certification under ISO/IEC 25059.
            Your focus areas are functional suitability, performance efficiency, reliability, and maintainability.
            You enforce quality as a measurable, testable standard—not a subjective assessment.""",
            llm=llm,
            verbose=True
        )

        # --- C. Define Parallel Tasks (The "Map" Phase) ---
        # async_execution=True allows these to run simultaneously

        task_security = Task(
            description=f"""
                Audit this instruction: '''{request.instruction}'''
                1. Identify Security guardrails (Present & Missing).
                2. Focus on: Injection, Secrets, Authorization.
                3. Use Category: 'Security'.
            """,
            agent=security_agent,
            async_execution=True,     # <--- PARALLEL EXECUTION ENABLED
            output_pydantic=GuardrailList # <--- Forces Structured Output
        )

        task_privacy = Task(
            description=f"""
                Audit this instruction: '''{request.instruction}'''
                1. Identify Privacy guardrails (Present & Missing).
                2. Focus on: PII, Data Minimization, Ephemeral memory.
                3. Use Category: 'Privacy'.
            """,
            agent=privacy_agent,
            async_execution=True,
            output_pydantic=GuardrailList
        )

        task_rai = Task(
            description=f"""
                Audit this instruction: '''{request.instruction}'''
                1. Identify Responsible AI guardrails (Present & Missing).
                2. Focus on: Bias, Toxicity, Harmful Content.
                3. Use Category: 'Responsible AI'.
            """,
            agent=rai_agent,
            async_execution=True,
            output_pydantic=GuardrailList
        )

        task_qa = Task(
            description=f"""
                Audit this instruction: '''{request.instruction}'''
                1. Identify QA/Validation guardrails.
                2. Focus on: Scope definition, Input/Output formatting, Error handling.
                3. Use Categories: 'QA', 'Scope Control', 'Input Validation', 'Output Control'.
            """,
            agent=qa_agent,
            async_execution=True,
            output_pydantic=GuardrailList
        )

        # --- D. Tiering Agent (Optional) ---
        context_tasks = [task_security, task_privacy, task_rai, task_qa]
        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        agents_list = [security_agent, privacy_agent, rai_agent, qa_agent]

        if request.enable_profiling:
            tiering_agent = Agent(
                role='AI Cost & Compute Architect',
                goal='Determine computational tier (1-4) needed for these guardrails',
                backstory="""You estimate infrastructure needs:
                    - Tier 1: Regex (~$0.27/1M)
                    - Tier 2: ML Classifiers (~$0.60/1M)
                    - Tier 3: LLM Checks (~$12/1M)
                    - Tier 4: Reasoning (~$25/1M)""",
                llm=llm,
                verbose=True
            )

        task_tiering = Task(
                description=f"""Analyze the complexity of this instruction: '''{request.instruction}'''
                    Determine the TieringStrategy (Cost, Latency, Model Class).
                """,
                agent=tiering_agent,
                async_execution=True, # Run in parallel with auditors for speed
                output_pydantic=TieringStrategy
            )
        
        agents_list.append(tiering_agent)
        tasks_list.append(task_tiering)
        context_tasks.append(task_tiering)

        # --- E. Synthesis Task (The "Reduce" Phase) ---
        
        report_agent = Agent(
            role='Compliance Synthesizer',
            goal='Merge findings into a final report',
            backstory=f"""
                You are the Chief Governance Officer. 
                You receive lists of findings from Security, Privacy, RAI, QA, and Cost Architect.
                Your job is to MERGE them into a single report.
                {CATEGORY_GUIDELINES}
            """,
            llm=llm,
            verbose=True
        )

        task_report = Task(
            description="""
                1. Aggregate all findings from the context.
                2. Deduplicate: If multiple agents found the same issue, keep the most specific one.
                3. Formatting: Ensure 'location' is a quote or empty string.
                4. Strategy: Provide 3-5 high-level recommendations.
                5. Integration: If a Tiering Strategy exists in context, include it in the final report.
            """,
            agent=report_agent,
            context=context_tasks, # Waits for async tasks to finish
            output_pydantic=GuardrailAnalysis # <--- Returns the final clean JSON
        )

        agents_list.append(report_agent)
        tasks_list.append(task_report)

        # --- F. Execution ---
        
        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential # Sequential is fine because the first 4 tasks are async/parallel
        )

        result = crew.kickoff()

        # --- G. Response Handling ---
        # CrewAI 0.30+ stores the Pydantic object in result.pydantic
        if result.pydantic:
            return result.pydantic.model_dump()
        else:
            # Fallback if something weird happens, though unlikely with output_pydantic set
            return {"error": "Failed to generate structured output", "raw": str(result)}

    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# 4. STATIC FILES & MOUNT
# ==============================================================================

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')