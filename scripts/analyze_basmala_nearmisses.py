#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from analyze_basmala_uniqueness import analyze_four_word_block, iter_verses
from query_cairo_quran import DEFAULT_XML


CRITERIA_ORDER = [
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B6_1",
    "B7",
    "B7_digit_sum",
    "B7_window",
    "B8",
    "B9",
]

BASMALA_TEXT = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"


def build_candidates(xml_path: Path) -> list[dict]:
    candidates: list[dict] = []
    for surah, ayah, raw_words in iter_verses(xml_path):
        for offset in range(0, max(0, len(raw_words) - 3)):
            block = raw_words[offset : offset + 4]
            candidate = analyze_four_word_block(f"{surah}:{ayah}@{offset + 1}", block)
            if not candidate:
                continue
            zero_count = sum(candidate["criteria"][key] == 0 for key in CRITERIA_ORDER)
            failures = [key for key in CRITERIA_ORDER if candidate["criteria"][key] != 0]
            candidate["zero_count"] = zero_count
            candidate["failures"] = failures
            candidates.append(candidate)
    return candidates


def sort_key(candidate: dict) -> tuple:
    return (-candidate["zero_count"], candidate["reference"])


def build_report(xml_path: Path, top_n: int) -> dict:
    candidates = build_candidates(xml_path)
    basmalas = [c for c in candidates if c["text"] == BASMALA_TEXT]
    non_basmalas = [c for c in candidates if c["text"] != BASMALA_TEXT]
    ranked = sorted(non_basmalas, key=sort_key)[:top_n]

    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "summary": {
            "candidate_count": len(candidates),
            "basmala_windows": len(basmalas),
            "best_non_basmala_zero_count": max((c["zero_count"] for c in non_basmalas), default=0),
        },
        "basmala_windows": basmalas,
        "top_non_basmala_windows": ranked,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rank the closest non-Basmala 4-word / 19-letter windows against the Basmala criteria."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--top", type=int, default=10, help="How many near-misses to show")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    args = parser.parse_args()

    report = build_report(args.xml, args.top)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print("Source")
    print(f"  XML: {report['source']['xml']}")
    print(f"  Edition: {report['source']['edition']}")
    print("")
    print("Summary")
    print(f"  Total candidates: {report['summary']['candidate_count']}")
    print(f"  Basmala windows: {report['summary']['basmala_windows']}")
    print(f"  Best non-Basmala zero count: {report['summary']['best_non_basmala_zero_count']}")
    print("")
    print("Basmala windows")
    for candidate in report["basmala_windows"]:
        print(f"  {candidate['reference']}: zero_count={candidate['zero_count']} failures={candidate['failures']}")
    print("")
    print("Top non-Basmala windows")
    for candidate in report["top_non_basmala_windows"]:
        print(
            f"  {candidate['reference']}: zero_count={candidate['zero_count']} failures={candidate['failures']} text={candidate['text']}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
