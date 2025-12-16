# green_ai_plugin.py
from crewai import Agent, Task
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, Union

# --- Data Model ---
class GreenAIAnalysis(BaseModel):
    # Made status flexible to handle case sensitivity automatically
    status: str = Field(description="Energy efficiency status: Green, Amber, or Red")
    energy_score: int = Field(description="0-100 efficiency score (100 is best)")
    estimated_kwh_per_1k_req: float = Field(description="Estimated kWh per 1000 requests")
    reasoning: str = Field(description="Summarize score and provide reasoning. Keep it 2-3 sentences.")
    optimization_tip: str = Field(description="1-2 tips to reduce compute usage. Start with action verb. Keep it 1-2 sentences.")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = ["Green", "Amber", "Red"]
        normalized = v.strip().capitalize()
        # Fallback to 'Green' if the LLM outputs something weird, preventing a crash
        return normalized if normalized in valid else "Green"

# --- Agent & Task Configuration ---
class GreenAIPlugin:
    def get_agent(self, llm,agents_config):
        return Agent(config=agents_config['green_ai_officer'], llm=llm, verbose=True, allow_delegation=False)

    def get_task(self, agent, instruction, tasks_config):
        return Task(config=tasks_config['green_ai_analysis_task'], agent=agent, output_pydantic=GreenAIAnalysis)