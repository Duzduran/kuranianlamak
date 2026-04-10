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


MIXED_INITIAL_SURAHS = [10, 11, 12, 13, 14, 15, 27, 38, 50, 68]
ALLAH_FORMS = {"الله", "اللهم", "بالله", "تالله", "لله", "ولله", "فالله"}


def is_allah_form(word: str) -> bool:
    return word in ALLAH_FORMS or word.endswith("الله")


def build_report(xml_path: Path) -> dict:
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    occurrence_counts = {surah: 0 for surah in MIXED_INITIAL_SURAHS}
    verse_counts = {surah: 0 for surah in MIXED_INITIAL_SURAHS}
    form_breakdown = {surah: {} for surah in MIXED_INITIAL_SURAHS}

    for elem in text_root.iter():
        if elem.tag != f"{{{NS['tei']}}}lg":
            continue
        xml_id = elem.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-"):
            continue

        surah, _ayah = map(int, xml_id.split("-")[1:3])
        if surah not in occurrence_counts:
            continue

        words = [normalize_word(word.text.strip()) for word in elem.findall(".//tei:w", NS) if word.text]
        matches = [word for word in words if is_allah_form(word)]
        occurrence_counts[surah] += len(matches)
        if matches:
            verse_counts[surah] += 1
            for word in matches:
                form_breakdown[surah][word] = form_breakdown[surah].get(word, 0) + 1

    first_nine = MIXED_INITIAL_SURAHS[:9]
    return {
        "source": {
            "xml": str(xml_path),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
        },
        "mixed_initial_surahs": MIXED_INITIAL_SURAHS,
        "allah_form_occurrences": occurrence_counts,
        "allah_form_verse_counts": verse_counts,
        "allah_form_breakdown": form_breakdown,
        "summary": {
            "first_nine_surahs": first_nine,
            "first_nine_allah_form_total": sum(occurrence_counts[surah] for surah in first_nine),
            "first_nine_surah_sum": sum(surah for surah in first_nine if occurrence_counts[surah] > 0),
            "surah_68_allah_forms": occurrence_counts[68],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reproduce the 017.00 mixed-initial surah Allah-form counts from the Cairo Quran TEI transcription."
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
    print("Mixed-Initial Surahs")
    print(f"  Surahs: {report['mixed_initial_surahs']}")
    print("")
    print("Allah-form occurrences by surah")
    for surah in report["mixed_initial_surahs"]:
        print(
            f"  {surah:>2}: occurrences={report['allah_form_occurrences'][surah]:>3} "
            f"verses={report['allah_form_verse_counts'][surah]:>3} forms={report['allah_form_breakdown'][surah]}"
        )
    print("")
    print("Summary")
    print(f"  First nine surah total: {report['summary']['first_nine_allah_form_total']}")
    print(f"  First nine surah sum: {report['summary']['first_nine_surah_sum']}")
    print(f"  Surah 68 Allah-form total: {report['summary']['surah_68_allah_forms']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
