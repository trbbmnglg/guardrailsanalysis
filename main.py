import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

app = FastAPI()

class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        # --- CONFIG: LITELLM / OPENAI ENVIRONMENT ---
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

        # --- LLM CONFIGURATION ---
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1
        )

        # ---------------------------------------------------------
        # 1. DEFINE AGENTS
        # ---------------------------------------------------------

        security_agent = Agent(
            role='Security & Safety Engineer',
            goal='Enforce OWASP Top 10, MITRE ATLAS, and ISO 42001 Safety standards',
            backstory="""
                You are responsible for the 'Red Team' defense. 
                You validate Input Validation (MITRE AML.T0051), check for Prompt Injection (LLM01), 
                and verify Safety Controls (ISO 42001 A.8).
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        privacy_ops_agent = Agent(
            role='Privacy & Operations Controller',
            goal='Enforce NIST AI RMF 1.0 standards for Privacy, Scope, and Limits',
            backstory="""
                You focus on operational boundaries. 
                You check for Privacy (NIST Map 1.5 - PII/Redaction), Scope Control (NIST Map 1.1), 
                and Operational Limits (NIST Manage 2.4).
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        rai_agent = Agent(
            role='Accenture Responsible AI Specialist',
            goal='Enforce Ethical Conduct and Accountability (Google SAIF & ISO 42001)',
            backstory="""
                You represent the Accenture Responsible AI framework.
                You check for bias and fairness (Google SAIF) and ensure Accountability (ISO 42001 A.6.1).
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        qa_agent = Agent(
            role='Prompt QA Lead',
            goal='Ensure Functional Suitability (ISO/IEC 25059)',
            backstory="""
                You are the Quality Assurance lead. 
                You evaluate the prompt against ISO/IEC 25059 for Functional Suitability.
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        # UPDATED AGENT: Receives inputs from others to decide Tier
        tiering_agent = Agent(
            role='Cost & Compute Architect',
            goal='Determine the final Latency/Cost Tier (1-4) based on identified risks',
            backstory="""
                You are the resource architect. You do NOT analyze the raw prompt alone.
                Instead, you review the findings from the Security, Privacy, RAI, and QA agents.
                
                Your logic:
                - If they found PII risks -> Require Tier 2 (PII Scrubbing).
                - If they found complex injection risks -> Require Tier 3 (Deep inspection).
                - If they found logic gaps requiring deep thought -> Require Tier 4 (Agentic Planning).
                - If all is safe and simple -> Tier 1 (Regex).
            """,
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        report_agent = Agent(
            role='Chief Governance Officer',
            goal='Synthesize all findings into a single JSON report',
            backstory='You aggregate findings from all agents into the final compliance report.',
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        # ---------------------------------------------------------
        # 2. DEFINE TASKS
        # ---------------------------------------------------------

        task_security = Task(
            description=f"Analyze for Security/Safety risks: '{request.instruction}'",
            agent=security_agent,
            expected_output="Security risk assessment."
        )

        task_privacy = Task(
            description=f"Analyze for Privacy/Ops risks: '{request.instruction}'",
            agent=privacy_ops_agent,
            expected_output="Privacy and Ops assessment."
        )

        task_rai = Task(
            description=f"Analyze for Ethical/Accountability risks: '{request.instruction}'",
            agent=rai_agent,
            expected_output="RAI assessment."
        )

        task_qa = Task(
            description=f"Analyze for Prompt Quality: '{request.instruction}'",
            agent=qa_agent,
            expected_output="QA assessment."
        )

        # UPDATED TASK: Uses Context from previous tasks
        task_tiering = Task(
            description="""
            Review the findings from the Security, Privacy, RAI, and QA agents.
            
            Based on the *identified risks* and *required mitigations*, assign a Complexity Tier:
            
            1. **Tier 1 (Low):** If only Regex/Keywords are needed. (e.g., Simple blocking).
            2. **Tier 2 (Standard):** If PII was found or basic classification is needed.
            3. **Tier 3 (High):** If RAG, Vector Search, or complex Legal Compliance is flagged.
            4. **Tier 4 (Extreme):** If the agents found deep logic flaws requiring "Deep Thinking" or Agentic Planning.
            
            Output the Tier, Model, and Cost based on the collective findings.
            """,
            agent=tiering_agent,
            context=[task_security, task_privacy, task_rai, task_qa], # <--- CRITICAL INPUTS
            expected_output="Tier recommendation based on agent findings."
        )

        task_report = Task(
            description="""
            Synthesize findings from ALL agents into a JSON report.
            
            Structure:
            {
                "guardrails": [ ... findings from security, privacy, rai, qa ... ],
                "tiering_strategy": {
                    "selected_tier": "Tier X",
                    "reasoning": "e.g. 'Privacy Agent found PII, necessitating Tier 2 compute.'",
                    "model_class": "Model Name",
                    "estimated_cost": "$XX.XX"
                }
            }
            
            CRITICAL: RETURN ONLY VALID JSON.
            """,
            agent=report_agent,
            context=[task_security, task_privacy, task_rai, task_qa, task_tiering],
            expected_output="Valid JSON String"
        )

        # ---------------------------------------------------------
        # 3. RUN CREW
        # ---------------------------------------------------------
        
        crew = Crew(
            agents=[security_agent, privacy_ops_agent, rai_agent, qa_agent, tiering_agent, report_agent],
            tasks=[task_security, task_privacy, task_rai, task_qa, task_tiering, task_report],
            verbose=True,
            process=Process.sequential
        )

        result = crew.kickoff()
        
        return {"result": str(result)}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')