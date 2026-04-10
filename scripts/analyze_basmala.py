#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import unicodedata as ud
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from query_cairo_quran import DEFAULT_XML, find_verse


ABJAD = {
    "ا": 1,
    "أ": 1,
    "إ": 1,
    "آ": 1,
    "ٱ": 1,
    "ء": 1,
    "ب": 2,
    "ج": 3,
    "د": 4,
    "ه": 5,
    "ة": 5,
    "و": 6,
    "ز": 7,
    "ح": 8,
    "ط": 9,
    "ي": 10,
    "ى": 10,
    "ك": 20,
    "ل": 30,
    "م": 40,
    "ن": 50,
    "س": 60,
    "ع": 70,
    "ف": 80,
    "ص": 90,
    "ق": 100,
    "ر": 200,
    "ش": 300,
    "ت": 400,
    "ث": 500,
    "خ": 600,
    "ذ": 700,
    "ض": 800,
    "ظ": 900,
    "غ": 1000,
}

ALEF_LIKE = {
    "ٱ": "ا",
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ٲ": "ا",
    "ٳ": "ا",
    "ٵ": "ا",
}

IGNORED_CHARS = {"ٰ", "ۡ", "ۖ", "۟", "ٓ", "ٔ", "ٕ", "ـ"}


def normalize_word(word: str) -> str:
    result: list[str] = []
    for ch in word:
        if ch in ALEF_LIKE:
            result.append(ALEF_LIKE[ch])
            continue
        if ch in IGNORED_CHARS:
            continue
        category = ud.category(ch)
        if category.startswith("M"):
            continue
        if category.startswith("L"):
            result.append(ch)
    return "".join(result)


def digits_only(value: int | str) -> str:
    return "".join(ch for ch in str(value) if ch.isdigit())


def mod_from_parts(parts: list[int | str], modulus: int = 19) -> tuple[str, int]:
    digits = "".join(digits_only(part) for part in parts)
    mod = 0
    for ch in digits:
        mod = (mod * 10 + int(ch)) % modulus
    return digits, mod


def abjad_sum(word: str) -> int:
    total = 0
    for ch in word:
        if ch not in ABJAD:
            raise KeyError(f"No abjad value for character {ch!r}")
        total += ABJAD[ch]
    return total


def cumulative(values: list[int]) -> list[int]:
    out: list[int] = []
    total = 0
    for value in values:
        total += value
        out.append(total)
    return out


def prime_factor_sum(value: int) -> int:
    if value <= 1:
        return 0
    n = value
    factor = 2
    total = 0
    while factor * factor <= n:
        while n % factor == 0:
            total += factor
            n //= factor
        factor += 1
    if n > 1:
        total += n
    return total


def sliding_window_digit_sum(digit_string: str) -> list[int]:
    digits = [int(ch) for ch in digit_string]
    if not digits:
        return []
    return [digits[0]] + [digits[i - 1] + digits[i] for i in range(1, len(digits))]


def build_basmala_analysis(xml_path: Path) -> dict:
    verse = find_verse(xml_path, 1, 1)
    raw_words = verse.words
    normalized_words = [normalize_word(word) for word in raw_words]
    letter_counts = [len(word) for word in normalized_words]
    total_letters = sum(letter_counts)
    abjad_values = [abjad_sum(word) for word in normalized_words]
    cumulative_letters = cumulative(letter_counts)
    cumulative_abjad = cumulative(abjad_values)

    b2_digits, b2_mod = mod_from_parts([len(normalized_words), total_letters, sum(abjad_values)])
    b3_forward_digits, b3_forward_mod = mod_from_parts(
        [part for pair in zip(range(1, len(letter_counts) + 1), letter_counts) for part in pair]
    )
    b3_reverse_digits, b3_reverse_mod = mod_from_parts(
        [part for pair in zip(range(len(letter_counts), 0, -1), reversed(letter_counts)) for part in pair]
    )
    b4_forward_parts: list[int] = []
    for idx, total in enumerate(cumulative_letters, start=1):
        b4_forward_parts.extend([idx, total])
    b4_forward_digits, b4_forward_mod = mod_from_parts(b4_forward_parts)

    b5_parts: list[int] = []
    for idx, value in enumerate(abjad_values, start=1):
        b5_parts.extend([idx, value])
    b5_digits, b5_mod = mod_from_parts(b5_parts)

    b6_parts: list[int] = []
    for idx, value in enumerate(cumulative_abjad, start=1):
        b6_parts.extend([idx, value])
    b6_digits, b6_mod = mod_from_parts(b6_parts)

    b6_1_values = [prime_factor_sum(value) for value in b6_parts]
    b6_1_digits, b6_1_mod = mod_from_parts(b6_1_values)

    per_letter_abjad: list[list[int]] = [[ABJAD[ch] for ch in word] for word in normalized_words]

    b7_parts: list[int] = []
    for word_index, values in enumerate(per_letter_abjad, start=1):
        b7_parts.append(word_index)
        b7_parts.extend(values)
    b7_digits, b7_mod = mod_from_parts(b7_parts)
    b7_digit_sum = sum(int(ch) for ch in b7_digits)
    b7_window_values = sliding_window_digit_sum(b7_digits)
    b7_window_digits, b7_window_mod = mod_from_parts(b7_window_values)

    running_total = 0
    b8_parts: list[int] = []
    for word_index, values in enumerate(per_letter_abjad, start=1):
        b8_parts.append(word_index)
        for value in values:
            running_total += value
            b8_parts.append(running_total)
    b8_digits, b8_mod = mod_from_parts(b8_parts)

    b9_parts: list[int] = []
    for word_index, values in enumerate(per_letter_abjad, start=1):
        b9_parts.append(word_index)
        for letter_index, value in enumerate(values, start=1):
            b9_parts.extend([letter_index, value])
    b9_digits, b9_mod = mod_from_parts(b9_parts)

    return {
        "source": {
            "reference": "1:1",
            "text": verse.text,
            "page": verse.page.label if verse.page else None,
            "image_url": verse.page.image_url if verse.page else None,
            "xml": str(xml_path),
        },
        "normalized_words": normalized_words,
        "letter_counts": letter_counts,
        "abjad_values": abjad_values,
        "criteria": {
            "B1": {
                "letters": total_letters,
                "mod19": total_letters % 19,
            },
            "B2": {
                "digits": b2_digits,
                "mod19": b2_mod,
            },
            "B3_forward": {
                "digits": b3_forward_digits,
                "mod19": b3_forward_mod,
            },
            "B3_reverse": {
                "digits": b3_reverse_digits,
                "mod19": b3_reverse_mod,
            },
            "B4_forward": {
                "digits": b4_forward_digits,
                "mod19": b4_forward_mod,
            },
            "B5": {
                "digits": b5_digits,
                "mod19": b5_mod,
            },
            "B6": {
                "digits": b6_digits,
                "mod19": b6_mod,
            },
            "B6_1": {
                "values": b6_1_values,
                "digits": b6_1_digits,
                "mod19": b6_1_mod,
            },
            "B7": {
                "digits": b7_digits,
                "mod19": b7_mod,
                "digit_sum": b7_digit_sum,
                "digit_sum_mod19": b7_digit_sum % 19,
                "sliding_window_values": b7_window_values,
                "sliding_window_digits": b7_window_digits,
                "sliding_window_mod19": b7_window_mod,
            },
            "B8": {
                "digits": b8_digits,
                "mod19": b8_mod,
            },
            "B9": {
                "digits": b9_digits,
                "mod19": b9_mod,
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze the Basmala from the Cairo 1924 TEI transcription.")
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of a readable summary")
    args = parser.parse_args()

    analysis = build_basmala_analysis(args.xml)

    if args.json:
        print(json.dumps(analysis, ensure_ascii=False, indent=2))
        return 0

    print("Source")
    print(f"  Reference: {analysis['source']['reference']}")
    print(f"  Text: {analysis['source']['text']}")
    if analysis["source"]["page"]:
        print(f"  Page: {analysis['source']['page']}")
    if analysis["source"]["image_url"]:
        print(f"  Image: {analysis['source']['image_url']}")
    print("")
    print("Normalized words")
    for idx, (word, letters, abjad) in enumerate(
        zip(analysis["normalized_words"], analysis["letter_counts"], analysis["abjad_values"]),
        start=1,
    ):
        print(f"  {idx}. {word}  | letters={letters} | abjad={abjad}")
    print("")
    print("19 checks")
    for key, payload in analysis["criteria"].items():
        if key == "B7":
            print(
                f"  {key}: mod19={payload['mod19']} | digit_sum={payload['digit_sum']} "
                f"| digit_sum mod19={payload['digit_sum_mod19']} | sliding_window mod19={payload['sliding_window_mod19']}"
            )
            continue
        if key == "B1":
            print(f"  {key}: letters={payload['letters']} | mod19={payload['mod19']}")
            continue
        print(f"  {key}: mod19={payload['mod19']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
