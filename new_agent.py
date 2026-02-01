from dataclasses import dataclass, field
from typing import List


@dataclass
class Agent:
    name: str
    role: str
    goals: List[str] = field(default_factory=list)

    def next_action(self) -> str:
        if not self.goals:
            return f"{self.name} has no goals yet."
        return f"{self.name} will work on: {', '.join(self.goals)}"


def create_new_agent() -> Agent:
    return Agent(
        name="NewAgent",
        role="assistant",
        goals=[
            "understand the request",
            "propose a solution",
            "deliver the change",
        ],
    )


if __name__ == "__main__":
    agent = create_new_agent()
    print(agent.next_action())
