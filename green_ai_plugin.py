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
    reasoning: str = Field(description="Why this status was assigned")
    optimization_tip: str = Field(description="One tip to reduce compute usage")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = ["Green", "Amber", "Red"]
        normalized = v.strip().capitalize()
        # Fallback to 'Green' if the LLM outputs something weird, preventing a crash
        return normalized if normalized in valid else "Green"

# --- Agent & Task Configuration ---
class GreenAIPlugin:
    def get_agent(self, llm):
        return Agent(
            role="Eco-Efficiency Architect",
            goal="Minimize the carbon footprint of AI systems by detecting computationally expensive patterns.",
            backstory=(
                "You are a Green AI researcher specializing in Sustainable Computing. "
                "You analyze prompts for *compute intensity*. "
                "You know that 'Chain of Thought' or 'System 2' thinking consumes significantly more energy. "
                "You flag potential for infinite loops or unnecessary massive context windows. "
                "Always output correct JSON format."
            ),
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

    def get_task(self, agent, instruction):
        return Task(
            description=f"""
                Analyze the following AI instruction for Energy Consumption impact:
                '''{instruction}'''

                Determine the 'Green AI' status:
                1. GREEN: Simple, direct tasks, low token output.
                2. AMBER: Moderate reasoning, large context, or multiple steps.
                3. RED: Deep recursive reasoning, o1/o3 models, or massive generation.

                Rules:
                - energy_score: 100 (efficient) to 0 (wasteful).
                - estimated_kwh_per_1k_req: Tier 1=0.001 to Tier 4=0.05.
                - Ensure all fields in the output schema are populated.
            """,
            expected_output="A GreenAIAnalysis JSON object with status, energy_score, kwh, reasoning, and tip.",
            agent=agent,
            output_pydantic=GreenAIAnalysis
        )