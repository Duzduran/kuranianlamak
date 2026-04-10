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

FAMILIES = {
    "ALM7_FAMILY": {
        "surahs": [2, 3, 7, 29, 30, 31, 32],
        "base_letters": "الم",
        "extensions": {7: "ص"},
    },
    "ALM_FAMILY": {
        "surahs": [2, 3, 7, 13, 29, 30, 31, 32],
        "base_letters": "الم",
        "extensions": {7: "ص", 13: "ر"},
    },
    "ALR_FAMILY": {
        "surahs": [10, 11, 12, 13, 14, 15],
        "base_letters": "الر",
        "extensions": {13: "م"},
    },
    "TS_FAMILY": {
        "surahs": [26, 27, 28],
        "base_letters": "طس",
        "extensions": {26: "م", 28: "م"},
    },
    "HM_FAMILY": {
        "surahs": [40, 41, 42, 43, 44, 45, 46],
        "base_letters": "حم",
        "extensions": {42: "عسق"},
    },
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
        texts[surah].append("".join(normalize_word(word) for word in words))
    return texts


def parts_for_letters(text: str, letters: str) -> list[str]:
    allowed = set(letters)
    out: list[str] = []
    for ch in text:
        if ch in allowed:
            out.append(str(ABJAD[ch]))
    return out


def analyze_family(xml_path: Path, key: str, include_basmala: bool) -> dict:
    spec = FAMILIES[key]
    surahs = spec["surahs"]
    base_letters = spec["base_letters"]
    extensions: dict[int, str] = spec["extensions"]
    texts = collect_surah_texts(xml_path, surahs)
    basmala_text = "".join(normalize_word(word) for word in BASMALA_TEXT.split())

    base_sequence: list[str] = []
    combined_sequence: list[str] = []

    for surah in surahs:
        if include_basmala and surah not in {1, 9}:
            base_basmala = parts_for_letters(basmala_text, base_letters)
            base_sequence.extend(base_basmala)
            combined_sequence.extend(base_basmala)

        for verse_text in texts[surah]:
            base_sequence.extend(parts_for_letters(verse_text, base_letters))
            if surah in extensions:
                combined_sequence.extend(parts_for_letters(verse_text, base_letters + extensions[surah]))
            else:
                combined_sequence.extend(parts_for_letters(verse_text, base_letters))

    base_digits = "".join(base_sequence)
    combined_digits = "".join(combined_sequence)
    return {
        "family": key,
        "surahs": surahs,
        "base_letters": base_letters,
        "extensions": extensions,
        "include_basmala": include_basmala,
        "base": {
            "digit_length": len(base_digits),
            "mod19": mod_from_digit_string(base_digits, 19),
            "mod7": mod_from_digit_string(base_digits, 7),
            "preview": base_digits[:120],
        },
        "combined": {
            "digit_length": len(combined_digits),
            "mod19": mod_from_digit_string(combined_digits, 19),
            "mod7": mod_from_digit_string(combined_digits, 7),
            "preview": combined_digits[:120],
        },
    }


def build_report(xml_path: Path) -> dict:
    reports = []
    for key in FAMILIES:
        reports.append(analyze_family(xml_path, key, include_basmala=False))
        reports.append(analyze_family(xml_path, key, include_basmala=True))
    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "reports": reports,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan core+extension muqatta families such as HM+ASK, ALM+S/R, and TS+M."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    parser.add_argument("--only-zero", action="store_true", help="Print only family rows where base or combined mod 19 = 0")
    args = parser.parse_args()

    report = build_report(args.xml)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    rows = report["reports"]
    if args.only_zero:
        rows = [
            row
            for row in rows
            if row["base"]["mod19"] == 0 or row["combined"]["mod19"] == 0 or row["base"]["mod7"] == 0 or row["combined"]["mod7"] == 0
        ]

    for row in rows:
        print(
            f"{row['family']:>10} basmala={'yes' if row['include_basmala'] else 'no ':<3} "
            f"base(len={row['base']['digit_length']}, mod19={row['base']['mod19']}, mod7={row['base']['mod7']}) "
            f"combined(len={row['combined']['digit_length']}, mod19={row['combined']['mod19']}, mod7={row['combined']['mod7']})"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
