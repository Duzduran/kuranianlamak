#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from query_cairo_quran import DEFAULT_XML, NS


def mod_from_digits(value: int | str, modulus: int = 19) -> int:
    mod = 0
    for ch in str(value):
        if not ch.isdigit():
            continue
        mod = (mod * 10 + int(ch)) % modulus
    return mod


def load_surah_counts(xml_path: Path) -> list[tuple[int, int]]:
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    counts: list[list[int]] = []
    for elem in text_root.iter():
        if elem.tag != f"{{{NS['tei']}}}lg":
            continue
        xml_id = elem.attrib.get("{http://www.w3.org/XML/1998/namespace}id", "")
        if not xml_id.startswith("verse-"):
            continue

        surah = int(xml_id.split("-")[1])
        if not counts or counts[-1][0] != surah:
            counts.append([surah, 0])
        counts[-1][1] += 1

    return [(surah, count) for surah, count in counts]


def build_fihrist_analysis(xml_path: Path) -> dict:
    counts = load_surah_counts(xml_path)
    surah_count = len(counts)
    total_verses = sum(count for _, count in counts)
    cumulative_endpoints: list[int] = []
    running_total = 0
    for _, count in counts:
        running_total += count
        cumulative_endpoints.append(running_total)

    even_surahs = [surah for surah, count in counts if count % 2 == 0]
    odd_surahs = [surah for surah, count in counts if count % 2 == 1]

    verse_count_sequence = [count for _, count in counts]
    parity_sequence = ["E" if count % 2 == 0 else "O" for _, count in counts]

    longest = max(counts, key=lambda item: item[1])
    shortest = min(counts, key=lambda item: item[1])
    surah_9 = next((count for surah, count in counts if surah == 9), None)
    surah_57 = next((count for surah, count in counts if surah == 57), None)

    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "summary": {
            "surah_count": surah_count,
            "total_numbered_verses": total_verses,
            "even_verse_count_surahs": len(even_surahs),
            "odd_verse_count_surahs": len(odd_surahs),
            "surah_9_verse_count": surah_9,
            "surah_57_verse_count": surah_57,
            "longest_surah": {"surah": longest[0], "verses": longest[1]},
            "shortest_surah": {"surah": shortest[0], "verses": shortest[1]},
        },
        "mod19": {
            "surah_count": mod_from_digits(surah_count),
            "total_numbered_verses": mod_from_digits(total_verses),
            "even_odd_pair": mod_from_digits(f"{len(even_surahs)}{len(odd_surahs)}"),
            "surah_9_verse_count": mod_from_digits(surah_9) if surah_9 is not None else None,
            "cumulative_endpoints_sequence": mod_from_digits("".join(str(value) for value in cumulative_endpoints)),
        },
        "surah_counts": [{"surah": surah, "verses": count} for surah, count in counts],
        "even_surahs": even_surahs,
        "odd_surahs": odd_surahs,
        "verse_count_sequence": verse_count_sequence,
        "cumulative_endpoints": cumulative_endpoints,
        "parity_sequence": parity_sequence,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Analyze the mushaf fihrist (surah / verse-count index) from the Cairo 1924 TEI transcription."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON")
    args = parser.parse_args()

    analysis = build_fihrist_analysis(args.xml)

    if args.json:
        print(json.dumps(analysis, ensure_ascii=False, indent=2))
        return 0

    print("Source")
    print(f"  XML: {analysis['source']['xml']}")
    print(f"  Edition: {analysis['source']['edition']}")
    print("")
    print("Summary")
    print(f"  Surahs: {analysis['summary']['surah_count']}")
    print(f"  Numbered verses: {analysis['summary']['total_numbered_verses']}")
    print(
        f"  Surahs with even verse counts: {analysis['summary']['even_verse_count_surahs']}"
    )
    print(
        f"  Surahs with odd verse counts: {analysis['summary']['odd_verse_count_surahs']}"
    )
    print(
        f"  Surah 9 verse count: {analysis['summary']['surah_9_verse_count']}"
    )
    print(
        f"  Surah 57 verse count: {analysis['summary']['surah_57_verse_count']}"
    )
    print(
        f"  Longest surah: {analysis['summary']['longest_surah']['surah']} ({analysis['summary']['longest_surah']['verses']} verses)"
    )
    print(
        f"  Shortest surah: {analysis['summary']['shortest_surah']['surah']} ({analysis['summary']['shortest_surah']['verses']} verses)"
    )
    print("")
    print("mod 19")
    print(f"  114 -> {analysis['mod19']['surah_count']}")
    print(f"  6236 -> {analysis['mod19']['total_numbered_verses']}")
    print(
        f"  6054 (even/odd surah counts) -> {analysis['mod19']['even_odd_pair']}"
    )
    print(f"  129 (surah 9 verse count) -> {analysis['mod19']['surah_9_verse_count']}")
    print(
        "  cumulative verse endpoints sequence -> "
        f"{analysis['mod19']['cumulative_endpoints_sequence']}"
    )
    print("")
    print("First 10 surahs")
    for item in analysis["surah_counts"][:10]:
        print(f"  {item['surah']:>3}: {item['verses']}")
    print("")
    print("Last 10 surahs")
    for item in analysis["surah_counts"][-10:]:
        print(f"  {item['surah']:>3}: {item['verses']}")
    print("")
    print("First 10 cumulative endpoints")
    print(" ", ", ".join(str(value) for value in analysis["cumulative_endpoints"][:10]))
    print("Last 10 cumulative endpoints")
    print(" ", ", ".join(str(value) for value in analysis["cumulative_endpoints"][-10:]))

    return 0


if __name__ == "__main__":
    sys.exit(main())
