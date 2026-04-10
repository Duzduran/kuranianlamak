#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from analyze_mushaf_fihrist import DEFAULT_XML, build_fihrist_analysis


def digit_mod(value: str | int, modulus: int = 19) -> int:
    mod = 0
    for ch in str(value):
        if ch.isdigit():
            mod = (mod * 10 + int(ch)) % modulus
    return mod


def concat(values: list[int | str]) -> str:
    return "".join(str(value) for value in values)


def cumulative(values: list[int]) -> list[int]:
    total = 0
    out: list[int] = []
    for value in values:
        total += value
        out.append(total)
    return out


def digit_sum(value: int | str) -> int:
    return sum(int(ch) for ch in str(value) if ch.isdigit())


def sliding_window_from_digits(value: str) -> list[int]:
    digits = [int(ch) for ch in value if ch.isdigit()]
    out: list[int] = []
    previous = 0
    for digit in digits:
        out.append(previous + digit)
        previous = digit
    return out


def prime_factor_sum(value: int) -> int:
    n = value
    total = 0
    factor = 2
    while factor * factor <= n:
        while n % factor == 0:
            total += factor
            n //= factor
        factor += 1 if factor == 2 else 2
    if n > 1:
        total += n
    return total


def interleave(*sequences: list[int]) -> list[int]:
    return [value for bundle in zip(*sequences) for value in bundle]


def build_candidate_catalog(xml_path: Path) -> list[dict]:
    report = build_fihrist_analysis(xml_path)

    surahs = [item["surah"] for item in report["surah_counts"]]
    verse_counts = [item["verses"] for item in report["surah_counts"]]
    cumulative_endpoints = report["cumulative_endpoints"]
    even_surah_counts = [count for surah, count in zip(surahs, verse_counts) if surah % 2 == 0]
    odd_surah_counts = [count for surah, count in zip(surahs, verse_counts) if surah % 2 == 1]
    even_count_values = [count for count in verse_counts if count % 2 == 0]
    odd_count_values = [count for count in verse_counts if count % 2 == 1]
    even_surah_endpoints = [endpoint for surah, endpoint in zip(surahs, cumulative_endpoints) if surah % 2 == 0]
    odd_surah_endpoints = [endpoint for surah, endpoint in zip(surahs, cumulative_endpoints) if surah % 2 == 1]
    even_count_endpoints = [endpoint for count, endpoint in zip(verse_counts, cumulative_endpoints) if count % 2 == 0]
    odd_count_endpoints = [endpoint for count, endpoint in zip(verse_counts, cumulative_endpoints) if count % 2 == 1]

    line_counts = [
        verse_count + (0 if surah in (1, 9) else 1)
        for surah, verse_count in zip(surahs, verse_counts)
    ]
    line_cumulative_endpoints = cumulative(line_counts)

    index_sums: list[int] = []
    start = 1
    for verse_count in verse_counts:
        end = start + verse_count - 1
        index_sums.append((start + end) * verse_count // 2)
        start = end + 1

    base_sequences: list[tuple[str, list[int | str], str, str]] = [
        (
            "surah_numbers_forward",
            surahs,
            "Sure numaralarının doğal sırası",
            "Already present in CiftveTek_6 as a sub-criterion.",
        ),
        (
            "surah_numbers_reverse",
            list(reversed(surahs)),
            "Sure numaralarının ters sırası",
            "Exact reverse of the natural surah order.",
        ),
        (
            "verse_counts_forward",
            verse_counts,
            "Fihristeki ayet sayılarının doğal sırası",
            "Already present in CiftveTek_6/7.",
        ),
        (
            "verse_counts_reverse",
            list(reversed(verse_counts)),
            "Fihristeki ayet sayılarının ters sırası",
            "Reverse of the raw verse-count list.",
        ),
        (
            "cumulative_endpoints_forward",
            cumulative_endpoints,
            "Fihristeki surelerin ayet sayılarının kümülatif toplamları",
            "Already present in CiftveTek_6/7 and locally reproduced from Cairo TEI.",
        ),
        (
            "even_count_values_forward",
            even_count_values,
            "Fihristeki çift ayet sayılarının doğal sırası",
            "Already present in CiftveTek_6/7 as the even-verse-count sequence.",
        ),
        (
            "odd_count_values_forward",
            odd_count_values,
            "Fihristeki tek ayet sayılarının doğal sırası",
            "Already present in CiftveTek_6/7 as the odd-verse-count sequence.",
        ),
        (
            "even_surah_counts_forward",
            even_surah_counts,
            "Çift sure numaralarına ait ayet sayılarının doğal sırası",
            "Natural partition by surah-number parity.",
        ),
        (
            "odd_surah_counts_forward",
            odd_surah_counts,
            "Tek sure numaralarına ait ayet sayılarının doğal sırası",
            "Natural partition by surah-number parity.",
        ),
        (
            "even_surah_endpoints_forward",
            even_surah_endpoints,
            "Çift surelerin kümülatif ayet bitişleri",
            "Cumulative endpoints filtered by even surah numbers.",
        ),
        (
            "odd_surah_endpoints_forward",
            odd_surah_endpoints,
            "Tek surelerin kümülatif ayet bitişleri",
            "Cumulative endpoints filtered by odd surah numbers.",
        ),
        (
            "even_count_endpoints_forward",
            even_count_endpoints,
            "Çift ayet sayılı surelerin kümülatif ayet bitişleri",
            "Cumulative endpoints filtered by even verse counts.",
        ),
        (
            "odd_count_endpoints_forward",
            odd_count_endpoints,
            "Tek ayet sayılı surelerin kümülatif ayet bitişleri",
            "Cumulative endpoints filtered by odd verse counts.",
        ),
        (
            "cumulative_endpoints_reverse",
            list(reversed(cumulative_endpoints)),
            "Kümülatif ayet bitiş noktalarının ters sırası",
            "Natural reverse of the cumulative endpoint list.",
        ),
        (
            "line_counts_forward",
            line_counts,
            "Sure bazında satır/dize sayıları (112 numarasız Besmele dahil)",
            "Adds one unnumbered basmala to every surah except 1 and 9.",
        ),
        (
            "line_cumulative_endpoints_forward",
            line_cumulative_endpoints,
            "Satır/dize kümülatif bitişleri",
            "Cumulative endpoints after switching from ayah counts to line counts.",
        ),
        (
            "surah_plus_count",
            [surah + count for surah, count in zip(surahs, verse_counts)],
            "Sure no + ayet sayısı",
            "Natural pairwise sum of the fihrist columns.",
        ),
        (
            "surah_plus_endpoint",
            [surah + endpoint for surah, endpoint in zip(surahs, cumulative_endpoints)],
            "Sure no + kümülatif ayet bitişi",
            "Uses the same surah-order pairing with cumulative endpoints.",
        ),
        (
            "surah_times_count",
            [surah * count for surah, count in zip(surahs, verse_counts)],
            "Sure no × ayet sayısı",
            "Natural multiplicative pairing of the fihrist columns.",
        ),
        (
            "surah_times_endpoint",
            [surah * endpoint for surah, endpoint in zip(surahs, cumulative_endpoints)],
            "Sure no × kümülatif ayet bitişi",
            "Natural multiplicative pairing with cumulative endpoints.",
        ),
        (
            "surah_count_interleaved",
            interleave(surahs, verse_counts),
            "Sure no / ayet sayısı iç içe",
            "Direct interleaving of the two raw fihrist columns.",
        ),
        (
            "surah_endpoint_interleaved",
            interleave(surahs, cumulative_endpoints),
            "Sure no / kümülatif ayet bitişi iç içe",
            "Direct interleaving of surah numbers and cumulative endpoints.",
        ),
        (
            "index_sums_per_surah",
            index_sums,
            "Her surenin genel ayet index toplamı",
            "Sum of the global ayah indices inside each surah block.",
        ),
        (
            "index_sums_cumulative",
            cumulative(index_sums),
            "Genel ayet index toplamlarının kümülatifi",
            "Cumulative totals of the per-surah index sums.",
        ),
    ]

    derived_sequences: list[tuple[str, list[int | str], str, str]] = []
    for name, sequence, label, note in base_sequences:
        joined = concat(sequence)
        derived_sequences.extend(
            [
                (name, sequence, label, note),
                (
                    f"{name}_digit_sums",
                    [digit_sum(value) for value in sequence],
                    f"{label} -> basamak toplamı",
                    f"Digit sums derived from {name}.",
                ),
                (
                    f"{name}_first_digits",
                    [str(value)[0] for value in sequence],
                    f"{label} -> ilk basamaklar",
                    f"First digits extracted from {name}.",
                ),
                (
                    f"{name}_last_digits",
                    [str(value)[-1] for value in sequence],
                    f"{label} -> son basamaklar",
                    f"Last digits extracted from {name}.",
                ),
                (
                    f"{name}_digit_lengths",
                    [len(str(value)) for value in sequence],
                    f"{label} -> basamak sayıları",
                    f"Digit lengths extracted from {name}.",
                ),
                (
                    f"{name}_prime_factor_sums",
                    [
                        prime_factor_sum(int(value))
                        for value in sequence
                        if str(value).isdigit()
                    ],
                    f"{label} -> asal çarpan toplamları",
                    f"Prime-factor sums derived from {name}.",
                ),
                (
                    f"{name}_sliding_window_digits",
                    sliding_window_from_digits(joined),
                    f"{label} -> sola kayan pencere basamak toplamı",
                    f"Sliding-window digit transform applied to the concatenated {name} string.",
                ),
            ]
        )

    catalog: list[dict] = []
    seen: set[str] = set()
    for name, sequence, label, note in derived_sequences:
        joined = concat(sequence)
        if name in seen or not joined:
            continue
        seen.add(name)
        catalog.append(
            {
                "name": name,
                "label": label,
                "mod19": digit_mod(joined),
                "digit_length": len(joined),
                "preview": joined[:120],
                "note": note,
            }
        )

    return sorted(catalog, key=lambda item: (item["mod19"] != 0, item["digit_length"], item["name"]))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Catalog natural mushaf-fihrist transforms and test each one for mod 19."
    )
    parser.add_argument("--xml", type=Path, default=DEFAULT_XML, help=f"Path to the Cairo Quran XML (default: {DEFAULT_XML})")
    parser.add_argument("--json", action="store_true", help="Print full JSON catalog")
    parser.add_argument("--only-zero", action="store_true", help="Only print transforms whose concatenated digit string is mod 19 = 0")
    args = parser.parse_args()

    catalog = build_candidate_catalog(args.xml)
    if args.only_zero:
        catalog = [item for item in catalog if item["mod19"] == 0]

    if args.json:
        print(json.dumps(catalog, ensure_ascii=False, indent=2))
        return 0

    for item in catalog:
        print(f"{item['name']}: mod19={item['mod19']} len={item['digit_length']}")
        print(f"  {item['label']}")
        print(f"  preview: {item['preview']}")
        print(f"  note: {item['note']}")
        print("")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
