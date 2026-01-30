from __future__ import annotations

import argparse
from pathlib import Path

from .agent import Agent
from .storage import list_agents, load_agent, save_agent


def _repo_root() -> Path:
    # Пакет лежит в корне репозитория, поднимаемся на 1 уровень вверх.
    return Path(__file__).resolve().parents[1]


def cmd_create(args: argparse.Namespace) -> int:
    agent = Agent(name=args.name)
    p = save_agent(_repo_root(), agent)
    print(agent.id)
    if args.verbose:
        print(f"saved: {p}")
    return 0


def cmd_list(_: argparse.Namespace) -> int:
    agents = list_agents(_repo_root())
    for a in agents:
        print(f"{a.id}\t{a.name}\t{a.created_at}")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    a = load_agent(_repo_root(), args.id)
    print(f"id: {a.id}")
    print(f"name: {a.name}")
    print(f"created_at: {a.created_at}")
    print(f"messages: {len(a.messages)}")
    return 0


def cmd_say(args: argparse.Namespace) -> int:
    repo_root = _repo_root()
    a = load_agent(repo_root, args.id)
    reply = a.say(args.text)
    save_agent(repo_root, a)
    print(reply)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="local_agent")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create", help="создать нового агента")
    p_create.add_argument("--name", required=True, help="имя агента")
    p_create.add_argument("-v", "--verbose", action="store_true", help="показать путь сохранения")
    p_create.set_defaults(func=cmd_create)

    p_list = sub.add_parser("list", help="показать список агентов")
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="показать информацию об агенте")
    p_show.add_argument("--id", required=True, help="id агента")
    p_show.set_defaults(func=cmd_show)

    p_say = sub.add_parser("say", help="отправить сообщение агенту (с сохранением истории)")
    p_say.add_argument("--id", required=True, help="id агента")
    p_say.add_argument("--text", required=True, help="сообщение")
    p_say.set_defaults(func=cmd_say)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))
