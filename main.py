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
        # --- FIX: CONFIGURE LITELLM ENVIRONMENT ---
        # CrewAI/LiteLLM needs these to know "how" to call the model
        os.environ["OPENAI_API_KEY"] = request.api_key
        os.environ["OPENAI_API_BASE"] = "https://router.huggingface.co/v1"

        # --- FIX: INITIALIZE LLM WITH PROVIDER PREFIX ---
        # We add 'openai/' so LiteLLM knows to use the OpenAI protocol
        # for this custom Hugging Face endpoint.
        llm = ChatOpenAI(
            model="openai/meta-llama/Llama-3.3-70B-Instruct",
            base_url="https://router.huggingface.co/v1",
            api_key=request.api_key,
            temperature=0.1
        )

        # Define Agents
        security_agent = Agent(
            role='Security Auditor',
            goal='Identify OWASP & NIST security vulnerabilities',
            backstory='Expert in prompt injection and data exfiltration risks.',
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        privacy_agent = Agent(
            role='Privacy Validator',
            goal='Detect PII and GDPR compliance risks',
            backstory='Specialist in data residency and user privacy protection.',
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        report_agent = Agent(
            role='Chief Governance Officer',
            goal='Synthesize all findings into a single JSON report',
            backstory='You merge findings from all auditors into the final JSON structure.',
            llm=llm,
            allow_delegation=False,
            verbose=True
        )

        # Define Task
        analysis_task = Task(
            description=f"""
            Analyze this Agent Instruction:
            "{request.instruction}"
            
            1. Have the Security Agent check for OWASP risks.
            2. Have the Privacy Agent check for PII risks.
            3. Synthesize EVERYTHING into this JSON format:
            {{
                "guardrails": [
                    {{ "name": "Name", "category": "Security/Privacy...", "severity": "Critical", "description": "Desc", "mechanism": "How", "triggers": ["Trigger"] }}
                ],
                "recommendations": ["Rec1"]
            }}
            
            CRITICAL: RETURN ONLY VALID JSON. NO MARKDOWN. NO CONVERSATION.
            """,
            agent=report_agent,
            expected_output="Valid JSON String"
        )

        # Run Crew
        crew = Crew(
            agents=[security_agent, privacy_agent, report_agent],
            tasks=[analysis_task],
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