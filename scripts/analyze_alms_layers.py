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

from analyze_basmala import ABJAD, normalize_word
from query_cairo_quran import DEFAULT_XML, NS, XML_NS


BASMALA_TEXT = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"
ALMS_FAMILY_SURAHS = [2, 3, 7, 29, 30, 31, 32]
ARAF_SURAH = 7
ARAF_LETTERS = "المص"
FAMILY_LETTERS = "الم"


def mod_from_digit_string(digit_string: str, modulus: int) -> int:
    mod = 0
    for ch in digit_string:
        mod = (mod * 10 + int(ch)) % modulus
    return mod


def sequence_from(values: list[int]) -> str:
    return " ".join(str(value) for value in values)


def cumulative_sums(values: list[int]) -> list[int]:
    out: list[int] = []
    total = 0
    for value in values:
        total += value
        out.append(total)
    return out


def collect_surah_texts(xml_path: Path, surahs: list[int]) -> dict[int, list[tuple[int, str]]]:
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    texts = {surah: [] for surah in surahs}
    for elem in text_root.iter():
        if elem.tag != f"{{{NS['tei']}}}lg":
            continue
        xml_id = elem.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-"):
            continue

        surah, ayah = map(int, xml_id.split("-")[1:3])
        if surah not in texts:
            continue

        words = [word.text.strip() for word in elem.findall(".//tei:w", NS) if word.text]
        text = "".join(normalize_word(word) for word in words)
        texts[surah].append((ayah, text))

    return texts


def counts_for_text(text: str, allowed_letters: str, report_letters: str | None = None) -> dict[str, int]:
    filtered = "".join(ch for ch in text if ch in set(allowed_letters))
    letters = report_letters or allowed_letters
    return {letter: filtered.count(letter) for letter in letters}


def digits_for_text(text: str, letters: str) -> str:
    allowed = set(letters)
    return "".join(str(ABJAD[ch]) for ch in text if ch in allowed)


def digits_for_single_letter(text: str, letter: str) -> str:
    return "".join(str(ABJAD[letter]) for ch in text if ch == letter)


def build_surah_layer(xml_path: Path, surah: int) -> dict:
    texts = collect_surah_texts(xml_path, [surah])[surah]
    basmala = "".join(normalize_word(word) for word in BASMALA_TEXT.split())
    full_text = basmala + "".join(text for _ayah, text in texts)
    natural_digits = digits_for_text(full_text, ARAF_LETTERS)
    counts = counts_for_text(full_text, ARAF_LETTERS)
    total_count = sum(counts.values())

    verse_rows = []
    basmala_counts = counts_for_text(basmala, ARAF_LETTERS)
    basmala_digits = digits_for_text(basmala, ARAF_LETTERS)
    verse_rows.append(
        {
            "ayah": 0,
            "label": "unnumbered-basmala",
            "counts": basmala_counts,
            "total_count": sum(basmala_counts.values()),
            "digit_length": len(basmala_digits),
        }
    )

    for ayah, text in texts:
        row_counts = counts_for_text(text, ARAF_LETTERS)
        row_digits = digits_for_text(text, ARAF_LETTERS)
        verse_rows.append(
            {
                "ayah": ayah,
                "label": str(ayah),
                "counts": row_counts,
                "total_count": sum(row_counts.values()),
                "digit_length": len(row_digits),
            }
        )

    per_letter_streams = {}
    for letter in ARAF_LETTERS:
        letter_digits = digits_for_single_letter(full_text, letter)
        per_letter_streams[letter] = {
            "count": counts[letter],
            "digit_length": len(letter_digits),
            "mod19": mod_from_digit_string(letter_digits, 19) if letter_digits else 0,
            "mod7": mod_from_digit_string(letter_digits, 7) if letter_digits else 0,
            "preview": letter_digits[:80],
        }

    return {
        "surah": surah,
        "letters": ARAF_LETTERS,
        "counts": counts,
        "total_count": total_count,
        "digit_length": len(natural_digits),
        "mod19": mod_from_digit_string(natural_digits, 19),
        "mod7": mod_from_digit_string(natural_digits, 7),
        "natural_preview": natural_digits[:120],
        "verse_rows": verse_rows,
        "per_letter_streams": per_letter_streams,
    }


def build_family_layer(xml_path: Path) -> dict:
    texts = collect_surah_texts(xml_path, ALMS_FAMILY_SURAHS)
    basmala = "".join(normalize_word(word) for word in BASMALA_TEXT.split())

    rows = []
    family_counts = {letter: 0 for letter in ARAF_LETTERS}
    family_digit_string_parts: list[str] = []
    per_surah_totals: list[int] = []
    per_surah_digit_lengths: list[int] = []
    per_surah_vectors: list[int] = []
    letterwise_by_surah = {letter: [] for letter in ARAF_LETTERS}

    for surah in ALMS_FAMILY_SURAHS:
        letters = ARAF_LETTERS if surah == ARAF_SURAH else FAMILY_LETTERS
        full_text = basmala + "".join(text for _ayah, text in texts[surah])
        surah_digits = digits_for_text(full_text, letters)
        counts = counts_for_text(full_text, letters, ARAF_LETTERS)
        total_count = sum(counts.values())
        per_surah_totals.append(total_count)
        per_surah_digit_lengths.append(len(surah_digits))
        per_surah_vectors.extend(counts[letter] for letter in ARAF_LETTERS)
        for letter in ARAF_LETTERS:
            family_counts[letter] += counts[letter]
            letterwise_by_surah[letter].append(counts[letter])
        family_digit_string_parts.append(surah_digits)

        rows.append(
            {
                "surah": surah,
                "letters": letters,
                "counts": counts,
                "total_count": total_count,
                "digit_length": len(surah_digits),
            }
        )

    family_digit_string = "".join(family_digit_string_parts)
    family_count_values = [family_counts[letter] for letter in ARAF_LETTERS]
    family_count_sequence = sequence_from(family_count_values)
    family_cumulative_counts = cumulative_sums(family_count_values)
    family_cumulative_digit_lengths = cumulative_sums(per_surah_digit_lengths)
    letterwise_flat = [value for letter in ARAF_LETTERS for value in letterwise_by_surah[letter]]

    raw_sequences = {
        "family_counts": family_count_sequence,
        "family_per_surah_totals": sequence_from(per_surah_totals),
        "family_per_surah_digit_lengths": sequence_from(per_surah_digit_lengths),
        "family_per_surah_count_vectors": sequence_from(per_surah_vectors),
        "family_letterwise_by_surah": sequence_from(letterwise_flat),
    }

    return {
        "surahs": ALMS_FAMILY_SURAHS,
        "rows": rows,
        "family_counts": family_counts,
        "family_count_values": family_count_values,
        "family_count_sequence": family_count_sequence,
        "family_cumulative_counts": family_cumulative_counts,
        "per_surah_totals": per_surah_totals,
        "per_surah_digit_lengths": per_surah_digit_lengths,
        "per_surah_count_vectors": per_surah_vectors,
        "letterwise_by_surah": letterwise_by_surah,
        "combined_digit_length": len(family_digit_string),
        "combined_mod19": mod_from_digit_string(family_digit_string, 19),
        "combined_mod7": mod_from_digit_string(family_digit_string, 7),
        "cumulative_surah_digit_lengths": family_cumulative_digit_lengths,
        "raw_sequences": {
            name: {
                "sequence": digits,
                "digit_length": len("".join(digits.split())),
                "mod19": mod_from_digit_string("".join(digits.split()), 19),
                "mod7": mod_from_digit_string("".join(digits.split()), 7),
            }
            for name, digits in raw_sequences.items()
        },
    }


def build_report(xml_path: Path) -> dict:
    araf = build_surah_layer(xml_path, ARAF_SURAH)
    family = build_family_layer(xml_path)

    counts = araf["counts"]
    structural_locks = {
        "sad_single_equals_family": counts["ص"] == family["family_counts"]["ص"],
        "araf_total_embedded_in_family_totals": araf["total_count"] in family["per_surah_totals"],
        "araf_length_embedded_in_family_lengths": araf["digit_length"] in family["per_surah_digit_lengths"],
        "ailede_sad_sadece_araf": family["family_counts"]["ص"] == next(
            row["counts"]["ص"] for row in family["rows"] if row["surah"] == ARAF_SURAH
        ),
    }

    methodology = {
        "foundational_candidates": [
            "ELMS-1 large natural stream",
            "A'raf letter-frequency row 2347-1530-1164-98",
            "Family raw count matrix in surah order",
            "Family per-surah total counts",
            "Family per-surah natural digit lengths",
        ],
        "not_foundational_by_default": [
            "cumulative frequencies",
            "cumulative digit lengths",
            "length + total concatenations",
            "cross-spine concatenations",
            "small Ebced summaries such as 1-31-71-161",
        ],
    }

    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
            "basmala_policy": "Unnumbered basmala included for surahs other than 1 and 9.",
        },
        "araf": araf,
        "family": family,
        "structural_locks": structural_locks,
        "methodology": methodology,
    }


def print_report(report: dict) -> None:
    print("Source")
    print(f"  XML: {report['source']['xml']}")
    print(f"  Edition: {report['source']['edition']}")
    print(f"  Basmala policy: {report['source']['basmala_policy']}")
    print("")

    araf = report["araf"]
    print("A'raf Raw Layer")
    print(f"  Surah: {araf['surah']}")
    print(f"  Counts: {araf['counts']}")
    print(f"  Total count: {araf['total_count']}")
    print(f"  Natural digit length: {araf['digit_length']}")
    print(f"  Natural stream mod 19: {araf['mod19']}")
    print(f"  Natural stream mod 7: {araf['mod7']}")
    print("  Per-letter streams:")
    for letter, data in araf["per_letter_streams"].items():
        print(
            f"    {letter}: count={data['count']} len={data['digit_length']} "
            f"mod19={data['mod19']} mod7={data['mod7']}"
        )
    print("")

    family = report["family"]
    print("ALMS Family Raw Layer")
    print(f"  Surahs: {family['surahs']}")
    for row in family["rows"]:
        print(
            f"    {row['surah']}: letters={row['letters']} counts={row['counts']} "
            f"total={row['total_count']} len={row['digit_length']}"
        )
    print(f"  Family counts: {family['family_counts']}")
    print(f"  Combined natural length: {family['combined_digit_length']}")
    print(f"  Combined natural stream mod 19: {family['combined_mod19']}")
    print(f"  Combined natural stream mod 7: {family['combined_mod7']}")
    print("")

    print("Foundational Raw Sequences")
    for name, row in family["raw_sequences"].items():
        print(
            f"  {name}: len={row['digit_length']} mod19={row['mod19']} mod7={row['mod7']}"
        )
        print(f"    {row['sequence']}")
    print("")

    print("Structural Locks")
    for key, value in report["structural_locks"].items():
        print(f"  {key}: {value}")
    print("")

    print("Methodology")
    print("  Foundational candidates:")
    for item in report["methodology"]["foundational_candidates"]:
        print(f"    - {item}")
    print("  Not foundational by default:")
    for item in report["methodology"]["not_foundational_by_default"]:
        print(f"    - {item}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a Ha-Mim-style foundational research report for the ALMS family."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    args = parser.parse_args()

    report = build_report(args.xml)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print_report(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
