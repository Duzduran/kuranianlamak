#!/usr/bin/env python3
from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from analyze_alms_layers import build_report
from query_cairo_quran import DEFAULT_XML


def mod_from_values(values: list[int], modulus: int) -> int:
    mod = 0
    for value in values:
        for ch in str(value):
            mod = (mod * 10 + int(ch)) % modulus
    return mod


def digit_length(values: list[int]) -> int:
    return sum(len(str(value)) for value in values)


def flatten_rows(rows: list[dict[str, int]], fields: tuple[str, ...]) -> list[int]:
    values: list[int] = []
    for row in rows:
        values.extend(row[field] for field in fields)
    return values


def flatten_columns(rows: list[dict[str, int]], fields: tuple[str, ...]) -> list[int]:
    values: list[int] = []
    for field in fields:
        values.extend(row[field] for row in rows)
    return values


def build_araf_rows(include_basmala: bool) -> list[dict[str, int]]:
    report = build_report(DEFAULT_XML)
    verse_rows = report["araf"]["verse_rows"]
    if not include_basmala:
      verse_rows = [row for row in verse_rows if row["ayah"] != 0]

    rows = []
    for row in verse_rows:
        counts = row["counts"]
        rows.append(
            {
                "ayah": row["ayah"],
                "elif": counts["ا"],
                "lam": counts["ل"],
                "mim": counts["م"],
                "sad": counts["ص"],
                "total": row["total_count"],
                "length": row["digit_length"],
            }
        )
    return rows


def build_candidates(rows: list[dict[str, int]], field_names: list[str], max_fields: int) -> list[dict]:
    candidates = []
    for size in range(1, min(max_fields, len(field_names)) + 1):
        for fields in itertools.combinations(field_names, size):
            for mode, flattener in (("row", flatten_rows), ("col", flatten_columns)):
                values = flattener(rows, fields)
                mod19 = mod_from_values(values, 19)
                mod7 = mod_from_values(values, 7)
                if mod19 != 0 and mod7 != 0:
                    continue
                candidates.append(
                    {
                        "mode": mode,
                        "fields": list(fields),
                        "digit_length": digit_length(values),
                        "mod19": mod19,
                        "mod7": mod7,
                        "preview": values[:24],
                    }
                )
    return candidates


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Search raw A'raf verse-table serializations that verify modulo 19 and/or 7."
    )
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    parser.add_argument("--no-basmala", action="store_true", help="Exclude the unnumbered basmala row")
    parser.add_argument("--max-fields", type=int, default=5, help="Maximum number of fields to combine")
    args = parser.parse_args()

    rows = build_araf_rows(include_basmala=not args.no_basmala)
    field_names = ["ayah", "elif", "lam", "mim", "sad", "total", "length"]
    candidates = build_candidates(rows, field_names, args.max_fields)
    candidates.sort(key=lambda item: (item["mod19"] != 0, item["mod7"] != 0, len(item["fields"]), item["digit_length"]))

    report = {
        "include_basmala": not args.no_basmala,
        "row_count": len(rows),
        "candidates": candidates,
    }

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print(f"Include basmala: {report['include_basmala']}")
    print(f"Rows: {report['row_count']}")
    print("")
    for candidate in candidates[:80]:
        print(
            f"{candidate['mode']:>3} fields={candidate['fields']} len={candidate['digit_length']} "
            f"mod19={candidate['mod19']} mod7={candidate['mod7']} preview={candidate['preview']}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
