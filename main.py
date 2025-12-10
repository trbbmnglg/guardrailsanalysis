import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

app = FastAPI()

# --- UPDATED REQUEST MODEL ---
class AnalysisRequest(BaseModel):
    instruction: str
    api_key: str
    enable_profiling: bool = False  # New Flag, default to False

@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    try:
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1
        )

        # 1. CORE AGENTS (Always Run)
        security_agent = Agent(
            role='Security & Safety Engineer',
            goal='Enforce OWASP Top 10 & ISO 42001 Safety standards',
            backstory="You validate Input Validation, Prompt Injection, and Safety Controls.",
            llm=llm, allow_delegation=False, verbose=True
        )

        privacy_ops_agent = Agent(
            role='Privacy & Operations Controller',
            goal='Enforce NIST AI RMF 1.0 standards',
            backstory="You check for Privacy (PII), Scope Control, and Operational Limits.",
            llm=llm, allow_delegation=False, verbose=True
        )

        rai_agent = Agent(
            role='Accenture Responsible AI Specialist',
            goal='Enforce Ethical Conduct & Accountability',
            backstory="You check for bias, fairness, and accountability (human oversight).",
            llm=llm, allow_delegation=False, verbose=True
        )

        qa_agent = Agent(
            role='Prompt QA Lead',
            goal='Ensure Functional Suitability (ISO/IEC 25059)',
            backstory="You evaluate prompt logic, clarity, and robustness.",
            llm=llm, allow_delegation=False, verbose=True
        )

        # 2. CORE TASKS
        task_security = Task(description=f"Analyze for Security risks: '{request.instruction}'", agent=security_agent, expected_output="Security assessment.")
        task_privacy = Task(description=f"Analyze for Privacy risks: '{request.instruction}'", agent=privacy_ops_agent, expected_output="Privacy assessment.")
        task_rai = Task(description=f"Analyze for Ethical risks: '{request.instruction}'", agent=rai_agent, expected_output="RAI assessment.")
        task_qa = Task(description=f"Analyze for QA risks: '{request.instruction}'", agent=qa_agent, expected_output="QA assessment.")

        # 3. DYNAMIC CREW CONSTRUCTION
        agents_list = [security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # --- OPTIONAL: TIERING AGENT ---
        if request.enable_profiling:
            tiering_agent = Agent(
                role='Cost & Compute Architect',
                goal='Determine Tier (1-4) based on risks',
                backstory="You review findings and assign a compute tier (Tier 1=Regex, Tier 4=Reasoning).",
                llm=llm, allow_delegation=False, verbose=True
            )
            
            task_tiering = Task(
                description="Review findings. Assign Tier (1-4). Output Model, Cost, Reason.",
                agent=tiering_agent,
                context=[task_security, task_privacy, task_rai, task_qa],
                expected_output="Tier recommendation."
            )
            
            # Add to lists
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # 4. REPORT AGENT
        report_agent = Agent(
            role='Chief Governance Officer',
            goal='Synthesize findings into JSON',
            backstory='You output ONLY valid JSON.',
            llm=llm, allow_delegation=False, verbose=True
        )

        # Update prompt to handle missing tiering data gracefully
        report_prompt = """
            Synthesize findings into JSON.
            Strict Schema:
            {
                "guardrails": [{ "name": "...", "category": "...", "severity": "...", "description": "...", "mechanism": "...", "triggers": [...] }],
                "tiering_strategy": { "selected_tier": "...", "model_class": "...", "estimated_cost": "...", "latency_impact": "...", "justification": "..." }
            }
            
            CRITICAL: 
            1. If 'Cost & Compute Architect' findings are MISSING or empty, set "tiering_strategy" to null.
            2. Output ONLY raw JSON.
        """

# ... inside run_analysis ...

        # UPDATE THIS TASK DEFINITION
        task_report = Task(
            description="""
            Synthesize the findings from ALL agents into a JSON response.
            
            You must strictly follow this JSON schema:
            {
                "guardrails": [
                    {
                        "name": "Short Name (e.g. Prompt Injection)",
                        "category": "Security" | "Privacy" | "Responsible AI" | "Quality Assurance",
                        "severity": "Critical" | "High" | "Medium" | "Low",
                        "description": "Risk description.",
                        "mechanism": "Specific fix for this risk.",
                        "triggers": ["trigger word"]
                    }
                ],
                "recommendations": [
                    "General high-level suggestion 1",
                    "General high-level suggestion 2"
                ],
                "tiering_strategy": {
                    "selected_tier": "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4",
                    "model_class": "e.g. GPT-4",
                    "estimated_cost": "$X.XX",
                    "latency_impact": "~XXms",
                    "justification": "Why this tier?"
                }
            }
            
            CRITICAL: 
            1. If 'Cost & Compute Architect' findings are MISSING, set "tiering_strategy" to null.
            2. Output ONLY raw JSON.
            """,
            agent=report_agent,
            context=report_context, 
            expected_output="Valid JSON String"
        )
        
        agents_list.append(report_agent)
        tasks_list.append(task_report)

        # 5. RUN CREW
        crew = Crew(
            agents=agents_list,
            tasks=tasks_list,
            verbose=True,
            process=Process.sequential
        )

        result = crew.kickoff()
        return {"result": str(result)}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')