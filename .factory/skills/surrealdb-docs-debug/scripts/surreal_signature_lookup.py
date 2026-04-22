#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def resolve_dts_path(explicit: str | None) -> Path | None:
    if explicit:
        path = Path(explicit).expanduser().resolve()
        return path if path.exists() else None

    start = Path.cwd().resolve()
    for base in [start, *start.parents]:
        candidate = base / "node_modules" / "surrealdb" / "dist" / "surrealdb.d.ts"
        if candidate.exists():
            return candidate
    return None


def find_matches(lines: list[str], symbol: str, context: int) -> list[tuple[int, int, list[str]]]:
    pattern = re.compile(rf"\b{re.escape(symbol)}\b")
    hits: list[tuple[int, int, list[str]]] = []
    for index, line in enumerate(lines):
        if pattern.search(line):
            start = max(0, index - context)
            end = min(len(lines), index + context + 1)
            snippet = lines[start:end]
            hits.append((start + 1, end, snippet))
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description="Lookup SurrealDB SDK signatures from local surrealdb.d.ts")
    parser.add_argument("symbols", nargs="+", help="Symbols or method names to search")
    parser.add_argument("--dts", dest="dts_path", help="Explicit path to surrealdb.d.ts")
    parser.add_argument("--context", type=int, default=2, help="Lines of context around each hit")
    args = parser.parse_args()

    dts_path = resolve_dts_path(args.dts_path)
    if not dts_path:
        print("Could not locate surrealdb.d.ts. Set --dts explicitly.", file=sys.stderr)
        return 2

    lines = dts_path.read_text(encoding="utf-8", errors="replace").splitlines()
    print(f"# Using: {dts_path}")

    any_hit = False
    for symbol in args.symbols:
        matches = find_matches(lines, symbol, args.context)
        if not matches:
            print(f"\n## {symbol}\n(no matches)")
            continue

        any_hit = True
        print(f"\n## {symbol}")
        for start, end, snippet in matches:
            print(f"[lines {start}-{end}]")
            for offset, text in enumerate(snippet, start=start):
                print(f"{offset:>6}: {text}")
            print()

    return 0 if any_hit else 1


if __name__ == "__main__":
    raise SystemExit(main())
