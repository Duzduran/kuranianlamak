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

MUKATTAA_GROUPS = {
    "ALM": {"surahs": [2, 3, 29, 30, 31, 32], "letters": "الم"},
    "ALMS": {"surahs": [7], "letters": "المص"},
    "ALR": {"surahs": [10, 11, 12, 14, 15], "letters": "الر"},
    "ALMR": {"surahs": [13], "letters": "المر"},
    "KHYAS": {"surahs": [19], "letters": "كهيعص"},
    "TH": {"surahs": [20], "letters": "طه"},
    "TSM": {"surahs": [26, 28], "letters": "طسم"},
    "TS": {"surahs": [27], "letters": "طس"},
    "YS": {"surahs": [36], "letters": "يس"},
    "SAD": {"surahs": [38], "letters": "ص"},
    "HM": {"surahs": [40, 41, 42, 43, 44, 45, 46], "letters": "حم"},
    "QAF": {"surahs": [50], "letters": "ق"},
    "NUN": {"surahs": [68], "letters": "ن"},
}


def mod_from_digit_string(digit_string: str, modulus: int) -> int:
    mod = 0
    for ch in digit_string:
        mod = (mod * 10 + int(ch)) % modulus
    return mod


def collect_surah_texts(xml_path: Path, surahs: list[int]) -> dict[int, list[str]]:
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

        surah, _ayah = map(int, xml_id.split("-")[1:3])
        if surah not in texts:
            continue

        words = [word.text.strip() for word in elem.findall(".//tei:w", NS) if word.text]
        text = "".join(normalize_word(word) for word in words)
        texts[surah].append(text)
    return texts


def parts_for_letters(text: str, letters: str) -> list[str]:
    allowed = set(letters)
    out: list[str] = []
    for ch in text:
        if ch in allowed:
            out.append(str(ABJAD[ch]))
    return out


def analyze_group(xml_path: Path, key: str, include_basmala: bool) -> dict:
    spec = MUKATTAA_GROUPS[key]
    surahs = spec["surahs"]
    letters = spec["letters"]
    texts = collect_surah_texts(xml_path, surahs)
    basmala_text = "".join(normalize_word(word) for word in BASMALA_TEXT.split())

    sequence: list[str] = []
    per_surah_counts: dict[int, dict[str, int]] = {}

    for surah in surahs:
        per_surah_counts[surah] = {letter: 0 for letter in letters}

        if include_basmala and surah not in {1, 9}:
            basmala_parts = parts_for_letters(basmala_text, letters)
            sequence.extend(basmala_parts)
            for ch in basmala_text:
                if ch in per_surah_counts[surah]:
                    per_surah_counts[surah][ch] += 1

        for verse_text in texts[surah]:
            sequence.extend(parts_for_letters(verse_text, letters))
            for ch in verse_text:
                if ch in per_surah_counts[surah]:
                    per_surah_counts[surah][ch] += 1

    digit_string = "".join(sequence)
    value_counts = {f"{letter}_{ABJAD[letter]}": sequence.count(str(ABJAD[letter])) for letter in letters}
    char_counts = {letter: sum(per_surah_counts[surah][letter] for surah in surahs) for letter in letters}
    return {
        "group": key,
        "letters": letters,
        "surahs": surahs,
        "include_basmala": include_basmala,
        "digit_length": len(digit_string),
        "mod19": mod_from_digit_string(digit_string, 19),
        "mod7": mod_from_digit_string(digit_string, 7),
        "char_counts": char_counts,
        "value_counts": value_counts,
        "preview": digit_string[:120],
    }


def build_report(xml_path: Path) -> dict:
    reports = []
    for key in MUKATTAA_GROUPS:
        reports.append(analyze_group(xml_path, key, include_basmala=False))
        reports.append(analyze_group(xml_path, key, include_basmala=True))
    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "reports": reports,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan all muqatta groups in the Cairo Quran TEI with and without unnumbered basmala inclusion."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    parser.add_argument("--only-zero", action="store_true", help="Print only entries where mod 19 = 0 or mod 7 = 0")
    args = parser.parse_args()

    report = build_report(args.xml)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    rows = report["reports"]
    if args.only_zero:
        rows = [row for row in rows if row["mod19"] == 0 or row["mod7"] == 0]

    for row in rows:
        print(
            f"{row['group']:>5}  letters={row['letters']:<6} basmala={'yes' if row['include_basmala'] else 'no ':<3} "
            f"len={row['digit_length']:<5} mod19={row['mod19']:<2} mod7={row['mod7']:<2} "
            f"char_counts={row['char_counts']}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
