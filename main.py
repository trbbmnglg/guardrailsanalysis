import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

app = FastAPI()

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
        # Note: Using Router for flexible model routing
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1
        )

        # 2. DEFINE AGENTS
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

        # 3. DEFINE TASKS
        task_security = Task(description=f"Analyze for Security risks: '{request.instruction}'", agent=security_agent, expected_output="Security assessment.")
        task_privacy = Task(description=f"Analyze for Privacy risks: '{request.instruction}'", agent=privacy_ops_agent, expected_output="Privacy assessment.")
        task_rai = Task(description=f"Analyze for Ethical risks: '{request.instruction}'", agent=rai_agent, expected_output="RAI assessment.")
        task_qa = Task(description=f"Analyze for QA risks: '{request.instruction}'", agent=qa_agent, expected_output="QA assessment.")

        # 4. PREPARE LISTS
        agents_list = [security_agent, privacy_ops_agent, rai_agent, qa_agent]
        tasks_list = [task_security, task_privacy, task_rai, task_qa]
        report_context = [task_security, task_privacy, task_rai, task_qa]

        # 5. OPTIONAL: TIERING AGENT
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
            
            agents_list.append(tiering_agent)
            tasks_list.append(task_tiering)
            report_context.append(task_tiering)

        # 6. REPORT AGENT & DYNAMIC JSON SCHEMA construction
        report_agent = Agent(
            role='Chief Governance Officer',
            goal='Synthesize findings into JSON',
            backstory='You output ONLY valid JSON. No markdown formatting.',
            llm=llm, allow_delegation=False, verbose=True
        )

        # Construct the conditional JSON schema parts
        complexity_field = '"complexity_tier": 1, ' if request.enable_profiling else ''
        
        tiering_section = ""
        if request.enable_profiling:
            tiering_section = """, 
            "tiering_strategy": {
                "selected_tier": "Tier 1 | Tier 2 | Tier 3 | Tier 4",
                "model_class": "e.g. GPT-4",
                "estimated_cost": "$X.XX",
                "latency_impact": "~XXms",
                "justification": "Why this tier?"
            }"""

        # Build the final prompt
        report_description = f"""
            Synthesize the findings from ALL agents into a final JSON response.
            
            STRICT JSON SCHEMA TO FOLLOW:
            {{
                "guardrails": [
                    {{
                        "name": "Short Risk Name",
                        "category": "Security | Privacy | Responsible AI | QA",
                        "severity": "Critical | High | Medium | Low",
                        {complexity_field}
                        "description": "Brief description of the risk",
                        "mechanism": "Technical fix (e.g., Regex, Filter)",
                        "triggers": ["trigger_word_1", "trigger_word_2"],
                        "enforcement": "Block | Mask | Log | Human Review",
                        "location": "Quote the specific part of the user input that triggered this"
                    }}
                ],
                "recommendations": [
                    "High level recommendation 1",
                    "High level recommendation 2"
                ]{tiering_section}
            }}

            RULES:
            1. Output ONLY raw JSON. Do not use markdown code blocks (```json).
            2. If no risks are found, return an empty "guardrails" array.
            3. Ensure "location" quotes the actual text from the input if applicable.
        """

        task_report = Task(
            description=report_description,
            agent=report_agent,
            context=report_context, 
            expected_output="Valid JSON String"
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
        
        # Clean the output to ensure it's valid JSON (sometimes LLMs wrap in ```json)
        raw_output = str(result)
        cleaned_output = raw_output.replace("```json", "").replace("```", "").strip()

        return {"result": cleaned_output}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')