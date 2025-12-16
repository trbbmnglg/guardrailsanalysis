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
    reasoning: str = Field(description="Why this status was assigned. Not more than 30 characters.")
    optimization_tip: str = Field(description="One tip to reduce compute usage. Not more than 30 characters.")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = ["Green", "Amber", "Red"]
        normalized = v.strip().capitalize()
        # Fallback to 'Green' if the LLM outputs something weird, preventing a crash
        return normalized if normalized in valid else "Green"

# --- Agent & Task Configuration ---
class GreenAIPlugin:
    def get_agent(self, llm,agents_config[]):
        return Agent(config=agents_config['green_ai_officer'], llm=llm, verbose=True, allow_delegation=False)

    def get_task(self, agent, instruction, tasks_config[]):
        return Task(config=tasks_config['green_ai_analysis_task'], agent=agent, output_pydantic=GreenAIAnalysis)