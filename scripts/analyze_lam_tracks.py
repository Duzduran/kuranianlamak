#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from analyze_alms_layers import ALMS_FAMILY_SURAHS, BASMALA_TEXT, collect_surah_texts  # noqa: E402
from analyze_basmala import normalize_word  # noqa: E402
from query_cairo_quran import DEFAULT_XML  # noqa: E402


def mod_from_values(values: list[int], modulus: int) -> int:
    mod = 0
    for value in values:
        for ch in str(value):
            mod = (mod * 10 + int(ch)) % modulus
    return mod


def sequence_from(values: list[int]) -> str:
    return " ".join(str(value) for value in values)


def cumulative(values: list[int]) -> list[int]:
    total = 0
    out: list[int] = []
    for value in values:
        total += value
        out.append(total)
    return out


def digit_sum(value: int) -> int:
    return sum(int(ch) for ch in str(value))


def digit_sums(values: list[int]) -> list[int]:
    return [digit_sum(value) for value in values]


def digit_lengths(values: list[int]) -> list[int]:
    return [len(str(value)) for value in values]


def sliding_window(values: list[int]) -> list[int]:
    digits = "".join(str(value) for value in values)
    prev = 0
    out: list[int] = []
    for ch in digits:
        digit = int(ch)
        out.append(prev + digit)
        prev = digit
    return out


def build_lam_rows() -> list[dict[str, int]]:
    basmala = "".join(normalize_word(word) for word in BASMALA_TEXT.split())
    texts = collect_surah_texts(DEFAULT_XML, list(range(1, 115)))
    rows = []
    for surah in range(1, 115):
        prefix = "" if surah in (1, 9) else basmala
        full_text = prefix + "".join(text for _ayah, text in texts[surah])
        lam_count = full_text.count("ل")
        rows.append(
            {
                "surah": surah,
                "lam": lam_count,
                "length": lam_count * 2,
            }
        )
    return rows


def summarize_sequence(values: list[int]) -> dict[str, object]:
    return {
        "sequence": sequence_from(values),
        "digit_length": sum(len(str(value)) for value in values),
        "mod19": mod_from_values(values, 19),
        "mod7": mod_from_values(values, 7),
    }


def build_report() -> dict[str, object]:
    rows = build_lam_rows()
    family_rows = [row for row in rows if row["surah"] in ALMS_FAMILY_SURAHS]
    araf_row = next(row for row in rows if row["surah"] == 7)

    family_lam = [row["lam"] for row in family_rows]
    family_surah_lam = [value for row in family_rows for value in (row["surah"], row["lam"])]

    quran_lam = [row["lam"] for row in rows]
    quran_surah_lam = [value for row in rows for value in (row["surah"], row["lam"])]

    return {
        "source": {
            "xml": str(DEFAULT_XML),
            "edition": "1924 Cairo / King Fuad / Bulaq edition",
            "basmala_policy": "Unnumbered basmala included for surahs other than 1 and 9.",
        },
        "araf": {
            "surah": 7,
            "lam_count": araf_row["lam"],
            "lam_stream_length": araf_row["length"],
        },
        "family": {
            "surahs": ALMS_FAMILY_SURAHS,
            "lam_counts": summarize_sequence(family_lam),
            "surah_lam": summarize_sequence(family_surah_lam),
            "surah_lam_cumulative": summarize_sequence(cumulative(family_surah_lam)),
        },
        "quran": {
            "total_lam_count": sum(quran_lam),
            "lam_counts": summarize_sequence(quran_lam),
            "surah_lam": summarize_sequence(quran_surah_lam),
            "surah_lam_digit_lengths": summarize_sequence(digit_lengths(quran_surah_lam)),
            "surah_lam_sliding_window": summarize_sequence(sliding_window(quran_surah_lam)),
            "surah_lam_digit_sums": summarize_sequence(digit_sums(quran_surah_lam)),
        },
    }


def main() -> int:
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
