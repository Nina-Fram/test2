from __future__ import annotations

import json
from pathlib import Path

from .agent import Agent


def agents_dir(repo_root: Path) -> Path:
    return repo_root / "agents"


def agent_path(repo_root: Path, agent_id: str) -> Path:
    return agents_dir(repo_root) / f"{agent_id}.json"


def save_agent(repo_root: Path, agent: Agent) -> Path:
    d = agents_dir(repo_root)
    d.mkdir(parents=True, exist_ok=True)

    p = agent_path(repo_root, agent.id)
    p.write_text(json.dumps(agent.to_dict(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return p


def load_agent(repo_root: Path, agent_id: str) -> Agent:
    p = agent_path(repo_root, agent_id)
    data = json.loads(p.read_text(encoding="utf-8"))
    return Agent.from_dict(data)


def list_agents(repo_root: Path) -> list[Agent]:
    d = agents_dir(repo_root)
    if not d.exists():
        return []

    agents: list[Agent] = []
    for p in sorted(d.glob("*.json")):
        try:
            agents.append(Agent.from_dict(json.loads(p.read_text(encoding="utf-8"))))
        except Exception:
            # Пропускаем битые файлы, чтобы list не падал из-за одного агента.
            continue
    return agents
