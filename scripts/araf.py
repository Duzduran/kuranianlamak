#!/usr/bin/env python3
from __future__ import annotations

import argparse
import unicodedata as ud
import xml.etree.ElementTree as ET
from pathlib import Path


NS = {"tei": "http://www.tei-c.org/ns/1.0"}
XML_NS = "{http://www.w3.org/XML/1998/namespace}"

ALEF_LIKE = {
    "ٱ": "ا",
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ٲ": "ا",
    "ٳ": "ا",
    "ٵ": "ا",
}

IGNORED = {"ٰ", "ۡ", "ۖ", "۟", "ٓ", "ٔ", "ٕ", "ـ"}

ABJAD = {
    "ا": 1,
    "ل": 30,
    "م": 40,
    "ص": 90,
}

LETTERS = set("المص")
BASMALA = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"


def normalize(text: str) -> str:
    out: list[str] = []
    for ch in text:
        if ch in ALEF_LIKE:
            out.append("ا")
            continue
        if ch in IGNORED:
            continue
        if ud.category(ch).startswith("M"):
            continue
        if ud.category(ch).startswith("L"):
            out.append(ch)
    return "".join(out)


def mod_from_digits(digits: str, modulus: int) -> int:
    value = 0
    for ch in digits:
        value = (value * 10 + int(ch)) % modulus
    return value


def build_digits(xml_path: Path) -> tuple[str, dict[str, int]]:
    root = ET.parse(xml_path).getroot()
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("TEI text body not found.")

    counts = {ch: 0 for ch in LETTERS}
    parts: list[str] = []

    for ch in normalize(BASMALA):
        if ch in LETTERS:
            counts[ch] += 1
            parts.append(str(ABJAD[ch]))

    for lg in text_root.iter(f"{{{NS['tei']}}}lg"):
        xml_id = lg.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-007-"):
            continue

        words = [normalize(word.text.strip()) for word in lg.findall(".//tei:w", NS) if word.text]
        for ch in "".join(words):
            if ch in LETTERS:
                counts[ch] += 1
                parts.append(str(ABJAD[ch]))

    return "".join(parts), counts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compute the ALMS (المص) digit sequence for Surah 7 from a Cairo-style TEI Quran XML."
    )
    parser.add_argument("xml", type=Path, help="Path to the TEI/XML mushaf file")
    parser.add_argument("--write", type=Path, help="Optional output file for the full digit string")
    args = parser.parse_args()

    digits, counts = build_digits(args.xml)

    print("include_basmala = True")
    print(f"counts = {counts}")
    print(f"digit_length = {len(digits)}")
    print(f"mod_19 = {mod_from_digits(digits, 19)}")
    print(f"mod_7 = {mod_from_digits(digits, 7)}")

    if args.write:
        args.write.write_text(digits, encoding="utf-8")
        print(f"written_to = {args.write}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
