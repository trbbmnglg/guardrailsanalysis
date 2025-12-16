# green_ai_plugin.py
from crewai import Agent, Task
from pydantic import BaseModel, Field
from typing import Literal, Optional

# --- Data Model ---
class GreenAIAnalysis(BaseModel):
    status: Literal["Green", "Amber", "Red"] = Field(description="Energy efficiency status")
    energy_score: int = Field(description="0-100 efficiency score (100 is best)")
    estimated_kwh_per_1k_req: float = Field(description="Estimated kWh per 1000 requests")
    reasoning: str = Field(description="Why this status was assigned")
    optimization_tip: str = Field(description="One tip to reduce compute usage")

# --- Agent & Task Configuration ---
class GreenAIPlugin:
    def get_agent(self, llm):
        return Agent(
            role="Eco-Efficiency Architect",
            goal="Minimize the carbon footprint of AI systems by detecting computationally expensive patterns.",
            backstory=(
                "You are a Green AI researcher specializing in Sustainable Computing. "
                "You analyze prompts not for security, but for *compute intensity*. "
                "You know that 'Chain of Thought' consumes 10x more energy than a simple regex. "
                "You flag infinite loops, recursive logic, and unnecessary massive context windows "
                "that contribute to global warming via data center heat."
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

                Determine the 'Green AI' status based on compute intensity:
                
                1. **GREEN (Healthy)**: 
                   - Simple, direct tasks (Classification, Extraction, Formatting).
                   - Uses standard models (Tier 1/2). 
                   - Low token output expected.
                
                2. **AMBER (Withering)**:
                   - Moderate reasoning required.
                   - Multiple steps or large context retrieval.
                   - Uses complex models (Tier 3).
                
                3. **RED (Withered)**:
                   - Deep recursive reasoning or 'System 2' thinking (o1/o3).
                   - Potential for infinite loops or massive generation.
                   - Extremely high token count per request.

                Calculate an 'energy_score' (100 = perfectly efficient, 0 = wasteful).
                Estimate kWh based on model complexity (Assume Tier 1=0.001, Tier 4=0.05 kWh per 1k reqs).
            """,
            expected_output="GreenAIAnalysis JSON object.",
            agent=agent,
            output_pydantic=GreenAIAnalysis
        )