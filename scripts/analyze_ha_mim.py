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

from analyze_basmala import normalize_word
from query_cairo_quran import DEFAULT_XML, NS, XML_NS


HA_MIM_SURAHS = list(range(40, 47))
ASK_SURAH = 42
BASMALA_TEXT = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"


def mod_from_digit_string(digit_string: str, modulus: int) -> int:
    mod = 0
    for ch in digit_string:
        mod = (mod * 10 + int(ch)) % modulus
    return mod


def hm_parts(text: str) -> list[str]:
    out: list[str] = []
    for ch in text:
        if ch == "ح":
            out.append("8")
        elif ch == "م":
            out.append("40")
    return out


def ask_parts(text: str) -> list[str]:
    out: list[str] = []
    for ch in text:
        if ch == "ع":
            out.append("70")
        elif ch == "س":
            out.append("60")
        elif ch == "ق":
            out.append("100")
    return out


def hm_ask_parts(text: str) -> list[str]:
    out: list[str] = []
    for ch in text:
        if ch == "ح":
            out.append("8")
        elif ch == "م":
            out.append("40")
        elif ch == "ع":
            out.append("70")
        elif ch == "س":
            out.append("60")
        elif ch == "ق":
            out.append("100")
    return out


def load_surah_texts(xml_path: Path) -> dict[int, list[str]]:
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    texts = {surah: [] for surah in HA_MIM_SURAHS}
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


def build_report(xml_path: Path) -> dict:
    texts = load_surah_texts(xml_path)
    basmala_text = "".join(normalize_word(word) for word in BASMALA_TEXT.split())

    hm_sequence: list[str] = []
    ask_sequence: list[str] = []
    combined_sequence: list[str] = []

    for surah in HA_MIM_SURAHS:
        hm_basmala = hm_parts(basmala_text)
        hm_sequence.extend(hm_basmala)
        combined_sequence.extend(hm_basmala)

        for verse_text in texts[surah]:
            hm_sequence.extend(hm_parts(verse_text))
            if surah == ASK_SURAH:
                ask_sequence.extend(ask_parts(verse_text))
                combined_sequence.extend(hm_ask_parts(verse_text))
            else:
                combined_sequence.extend(hm_parts(verse_text))

    hm_digits = "".join(hm_sequence)
    ask_digits = "".join(ask_sequence)
    combined_digits = "".join(combined_sequence)

    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "ha_mim": {
            "surahs": HA_MIM_SURAHS,
            "digit_length": len(hm_digits),
            "mod19": mod_from_digit_string(hm_digits, 19),
            "counts": {
                "ha_8": hm_sequence.count("8"),
                "mim_40": hm_sequence.count("40"),
            },
            "preview": hm_digits[:120],
        },
        "ayn_sin_kaf": {
            "surah": ASK_SURAH,
            "digit_length": len(ask_digits),
            "mod19": mod_from_digit_string(ask_digits, 19),
            "mod7": mod_from_digit_string(ask_digits, 7),
            "counts": {
                "ayn_70": ask_sequence.count("70"),
                "sin_60": ask_sequence.count("60"),
                "qaf_100": ask_sequence.count("100"),
            },
            "preview": ask_digits[:120],
        },
        "combined": {
            "digit_length": len(combined_digits),
            "mod19": mod_from_digit_string(combined_digits, 19),
            "mod7": mod_from_digit_string(combined_digits, 7),
            "preview": combined_digits[:120],
        },
        "notes": {
            "ha_mim_basmala_policy": "For surahs 40-46, the unnumbered basmala contributes only Ha/Mim letters.",
            "ask_basmala_policy": "For surah 42, Ayn-Sin-Kaf is counted from verse text only, not from the unnumbered basmala.",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reproduce the Ha-Mim / Ayn-Sin-Kaf digit sequences from the Cairo Quran TEI transcription."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    args = parser.parse_args()

    report = build_report(args.xml)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print("Source")
    print(f"  XML: {report['source']['xml']}")
    print(f"  Edition: {report['source']['edition']}")
    print("")
    print("Ha-Mim")
    print(f"  Surahs: {report['ha_mim']['surahs']}")
    print(f"  Digit length: {report['ha_mim']['digit_length']}")
    print(f"  mod 19: {report['ha_mim']['mod19']}")
    print(f"  Counts: {report['ha_mim']['counts']}")
    print("")
    print("Ayn-Sin-Kaf")
    print(f"  Surah: {report['ayn_sin_kaf']['surah']}")
    print(f"  Digit length: {report['ayn_sin_kaf']['digit_length']}")
    print(f"  mod 19: {report['ayn_sin_kaf']['mod19']}")
    print(f"  mod 7: {report['ayn_sin_kaf']['mod7']}")
    print(f"  Counts: {report['ayn_sin_kaf']['counts']}")
    print("")
    print("Combined")
    print(f"  Digit length: {report['combined']['digit_length']}")
    print(f"  mod 19: {report['combined']['mod19']}")
    print(f"  mod 7: {report['combined']['mod7']}")
    print("")
    print("Notes")
    for key, value in report["notes"].items():
        print(f"  {key}: {value}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
