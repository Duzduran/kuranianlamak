#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


NS = {"tei": "http://www.tei-c.org/ns/1.0"}
XML_NS = "{http://www.w3.org/XML/1998/namespace}"
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XML = REPO_ROOT / "external" / "corpus-coranicum-tei" / "data" / "cairo_quran" / "cairoquran.xml"


@dataclass
class SurfaceInfo:
    surface_id: str
    label: str
    image_url: str | None


@dataclass
class VerseResult:
    surah: int
    ayah: int
    verse_index: int
    xml_id: str
    words: list[str]
    word_ids: list[str]
    page: SurfaceInfo | None

    @property
    def text(self) -> str:
        return " ".join(self.words)

    @property
    def word_count(self) -> int:
        return len(self.words)


def parse_reference(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"\s*(\d{1,3})\s*[:/]\s*(\d{1,3})\s*", value)
    if not match:
        raise argparse.ArgumentTypeError("Reference must look like 57:19")
    return int(match.group(1)), int(match.group(2))


def load_surfaces(root: ET.Element) -> dict[str, SurfaceInfo]:
    surfaces: dict[str, SurfaceInfo] = {}
    for surface in root.findall(".//tei:surface", NS):
        surface_id = surface.attrib.get(f"{XML_NS}id")
        if not surface_id:
            continue
        graphic = surface.find("tei:graphic", NS)
        surfaces[surface_id] = SurfaceInfo(
            surface_id=surface_id,
            label=surface.attrib.get("n", ""),
            image_url=graphic.attrib.get("url") if graphic is not None else None,
        )
    return surfaces


def find_verse(xml_path: Path, surah: int, ayah: int) -> VerseResult:
    root = ET.parse(xml_path).getroot()
    surfaces = load_surfaces(root)
    text_root = root.find(".//tei:text", NS)
    if text_root is None:
        raise RuntimeError("Could not find TEI text body in Cairo Quran XML.")

    target_id = f"verse-{surah:03d}-{ayah:03d}"
    current_page_id: str | None = None
    verse_index = 0

    for elem in text_root.iter():
        if elem.tag == f"{{{NS['tei']}}}pb":
            facs = elem.attrib.get("facs", "")
            current_page_id = facs[1:] if facs.startswith("#") else facs or None
            continue

        if elem.tag != f"{{{NS['tei']}}}lg":
            continue

        xml_id = elem.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-"):
            continue

        verse_index += 1
        if xml_id != target_id:
            continue

        words: list[str] = []
        word_ids: list[str] = []
        for word in elem.findall(".//tei:w", NS):
            if word.text:
                words.append(word.text.strip())
            word_ids.append(word.attrib.get(f"{XML_NS}id", ""))

        return VerseResult(
            surah=surah,
            ayah=ayah,
            verse_index=verse_index,
            xml_id=xml_id,
            words=words,
            word_ids=word_ids,
            page=surfaces.get(current_page_id) if current_page_id else None,
        )

    raise RuntimeError(f"Verse {surah}:{ayah} was not found in {xml_path}.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Query the digital 1924 Cairo Quran TEI transcription by surah:ayah."
    )
    parser.add_argument("reference", type=parse_reference, help="Verse reference, for example 57:19")
    parser.add_argument(
        "--xml",
        type=Path,
        default=DEFAULT_XML,
        help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})",
    )
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument(
        "--word-ids",
        action="store_true",
        help="Include TEI word ids in text output",
    )
    args = parser.parse_args()

    surah, ayah = args.reference
    result = find_verse(args.xml, surah, ayah)

    if args.json:
        payload = {
            "surah": result.surah,
            "ayah": result.ayah,
            "verse_index": result.verse_index,
            "xml_id": result.xml_id,
            "text": result.text,
            "word_count": result.word_count,
            "words": result.words,
            "word_ids": result.word_ids,
            "page": {
                "surface_id": result.page.surface_id,
                "label": result.page.label,
                "image_url": result.page.image_url,
            }
            if result.page
            else None,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f"Reference: {result.surah}:{result.ayah}")
    print(f"Global verse index: {result.verse_index}")
    print(f"XML id: {result.xml_id}")
    print(f"Word count: {result.word_count}")
    if result.page:
        print(f"Page: {result.page.label}")
        if result.page.image_url:
            print(f"Image: {result.page.image_url}")
    print("")
    print(result.text)

    if args.word_ids:
        print("")
        print("Words:")
        for idx, (word, word_id) in enumerate(zip(result.words, result.word_ids), start=1):
            print(f"{idx:02d}. {word}    [{word_id}]")

    return 0


if __name__ == "__main__":
    sys.exit(main())
