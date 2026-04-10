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

from analyze_basmala import (
    ABJAD,
    cumulative,
    mod_from_parts,
    normalize_word,
    prime_factor_sum,
    sliding_window_digit_sum,
)
from query_cairo_quran import DEFAULT_XML, NS, XML_NS


ABJAD_EXTRA = {
    "ؤ": "ء",
    "ئ": "ء",
}


def abjad_values_for_word(word: str) -> tuple[int, list[int]]:
    total = 0
    values: list[int] = []
    for ch in word:
        mapped = ABJAD_EXTRA.get(ch, ch)
        if mapped not in ABJAD:
            raise KeyError(mapped)
        value = ABJAD[mapped]
        values.append(value)
        total += value
    return total, values


def iter_verses(xml_path: Path):
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    for elem in text_root.iter():
        if elem.tag != f"{{{NS['tei']}}}lg":
            continue
        xml_id = elem.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-"):
            continue
        surah, ayah = map(int, xml_id.split("-")[1:3])
        words = [word.text.strip() for word in elem.findall(".//tei:w", NS) if word.text]
        yield surah, ayah, words


def analyze_four_word_block(reference: str, raw_words: list[str]) -> dict | None:
    normalized_words = [normalize_word(word) for word in raw_words]
    if len(normalized_words) != 4:
        return None

    letter_counts = [len(word) for word in normalized_words]
    if sum(letter_counts) != 19:
        return None

    try:
        abjad_values: list[int] = []
        per_letter_values: list[list[int]] = []
        for word in normalized_words:
            total, values = abjad_values_for_word(word)
            abjad_values.append(total)
            per_letter_values.append(values)
    except KeyError:
        return None

    cumulative_letters = cumulative(letter_counts)
    cumulative_abjad = cumulative(abjad_values)

    _, b2_mod = mod_from_parts([4, 19, sum(abjad_values)])
    _, b3_mod = mod_from_parts([part for pair in zip(range(1, 5), letter_counts) for part in pair])
    _, b4_mod = mod_from_parts([part for pair in zip(range(1, 5), cumulative_letters) for part in pair])

    b5_parts = [part for pair in zip(range(1, 5), abjad_values) for part in pair]
    _, b5_mod = mod_from_parts(b5_parts)

    b6_parts = [part for pair in zip(range(1, 5), cumulative_abjad) for part in pair]
    _, b6_mod = mod_from_parts(b6_parts)

    b6_1_values = [prime_factor_sum(value) for value in b6_parts]
    _, b6_1_mod = mod_from_parts(b6_1_values)

    b7_parts: list[int] = []
    for word_index, values in enumerate(per_letter_values, start=1):
        b7_parts.append(word_index)
        b7_parts.extend(values)
    b7_digits, b7_mod = mod_from_parts(b7_parts)
    b7_digit_sum_mod = sum(int(ch) for ch in b7_digits) % 19
    _, b7_window_mod = mod_from_parts(sliding_window_digit_sum(b7_digits))

    running_total = 0
    b8_parts: list[int] = []
    for word_index, values in enumerate(per_letter_values, start=1):
        b8_parts.append(word_index)
        for value in values:
            running_total += value
            b8_parts.append(running_total)
    _, b8_mod = mod_from_parts(b8_parts)

    b9_parts: list[int] = []
    for word_index, values in enumerate(per_letter_values, start=1):
        b9_parts.append(word_index)
        for letter_index, value in enumerate(values, start=1):
            b9_parts.extend([letter_index, value])
    _, b9_mod = mod_from_parts(b9_parts)

    return {
        "reference": reference,
        "text": " ".join(raw_words),
        "normalized_words": normalized_words,
        "letter_counts": letter_counts,
        "abjad_sum": sum(abjad_values),
        "criteria": {
            "B2": b2_mod,
            "B3": b3_mod,
            "B4": b4_mod,
            "B5": b5_mod,
            "B6": b6_mod,
            "B6_1": b6_1_mod,
            "B7": b7_mod,
            "B7_digit_sum": b7_digit_sum_mod,
            "B7_window": b7_window_mod,
            "B8": b8_mod,
            "B9": b9_mod,
        },
    }


def summarize_candidates(candidates: list[dict], label: str, xml_path: Path) -> dict:
    criteria_keys = [
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

    counts = {
        key: len([candidate for candidate in candidates if candidate["criteria"][key] == 0])
        for key in criteria_keys
    }
    counts["B2_B3_B4"] = len(
        [
            candidate
            for candidate in candidates
            if candidate["criteria"]["B2"] == candidate["criteria"]["B3"] == candidate["criteria"]["B4"] == 0
        ]
    )
    counts["B5_to_B9_all"] = len(
        [
            candidate
            for candidate in candidates
            if all(candidate["criteria"][key] == 0 for key in criteria_keys[3:])
        ]
    )
    counts["B2_to_B9_all"] = len(
        [
            candidate
            for candidate in candidates
            if all(candidate["criteria"][key] == 0 for key in criteria_keys)
        ]
    )

    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "summary": {
            "candidate_count": len(candidates),
            "filter": label,
        },
        "criteria_zero_counts": counts,
        "candidates": candidates,
    }


def build_verse_report(xml_path: Path) -> dict:
    candidates: list[dict] = []

    for surah, ayah, raw_words in iter_verses(xml_path):
        candidate = analyze_four_word_block(f"{surah}:{ayah}", raw_words)
        if candidate:
            candidates.append(candidate)

    return summarize_candidates(candidates, "4-word verses with 19 normalized letters", xml_path)


def build_window_report(xml_path: Path) -> dict:
    candidates: list[dict] = []
    for surah, ayah, raw_words in iter_verses(xml_path):
        for offset in range(0, max(0, len(raw_words) - 3)):
            block = raw_words[offset : offset + 4]
            candidate = analyze_four_word_block(f"{surah}:{ayah}@{offset + 1}", block)
            if candidate:
                candidates.append(candidate)

    return summarize_candidates(candidates, "all 4-word windows with 19 normalized letters", xml_path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure how often Basmala-like criteria appear among 4-word / 19-letter verses in the Cairo Quran TEI."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument(
        "--scope",
        choices=["verses", "windows"],
        default="verses",
        help="Analyze only full 4-word verses, or all 4-word windows inside verses.",
    )
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    args = parser.parse_args()

    report = build_verse_report(args.xml) if args.scope == "verses" else build_window_report(args.xml)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print("Source")
    print(f"  XML: {report['source']['xml']}")
    print(f"  Edition: {report['source']['edition']}")
    print("")
    print("Summary")
    print(f"  Candidates: {report['summary']['candidate_count']}")
    print(f"  Filter: {report['summary']['filter']}")
    print("")
    print("Zero counts")
    for key, value in report["criteria_zero_counts"].items():
        print(f"  {key}: {value}")
    print("")
    print("Candidates with B2+B3+B4 = 0")
    for candidate in report["candidates"]:
        if candidate["criteria"]["B2"] == candidate["criteria"]["B3"] == candidate["criteria"]["B4"] == 0:
            print(f"  {candidate['reference']}: {candidate['text']}")
    print("")
    print("Candidates with B5..B9 all = 0")
    for candidate in report["candidates"]:
        if all(candidate["criteria"][key] == 0 for key in ["B5", "B6", "B6_1", "B7", "B7_digit_sum", "B7_window", "B8", "B9"]):
            print(f"  {candidate['reference']}: {candidate['text']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
