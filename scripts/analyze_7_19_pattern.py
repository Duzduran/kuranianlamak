#!/usr/bin/env python3

from __future__ import annotations

from math import gcd
from random import Random


VERSE_COUNTS = [
    7,
    286,
    200,
    176,
    120,
    165,
    206,
    75,
    129,
    109,
    123,
    111,
    43,
    52,
    99,
    128,
    111,
    110,
    98,
    135,
    112,
    78,
    118,
    64,
    77,
    227,
    93,
    88,
    69,
    60,
    34,
    30,
    73,
    54,
    45,
    83,
    182,
    88,
    75,
    85,
    54,
    53,
    89,
    59,
    37,
    35,
    38,
    29,
    18,
    45,
    60,
    49,
    62,
    55,
    78,
    96,
    29,
    22,
    24,
    13,
    14,
    11,
    11,
    18,
    12,
    12,
    30,
    52,
    52,
    44,
    28,
    28,
    20,
    56,
    40,
    31,
    50,
    40,
    46,
    42,
    29,
    19,
    36,
    25,
    22,
    17,
    19,
    26,
    30,
    20,
    15,
    21,
    11,
    8,
    8,
    19,
    5,
    8,
    8,
    11,
    11,
    8,
    3,
    9,
    5,
    4,
    7,
    3,
    6,
    3,
    5,
    4,
    5,
    6,
]


def concat_mod(values: list[int], mod: int) -> int:
    remainder = 0
    for value in values:
        remainder = (remainder * pow(10, len(str(value)), mod) + value) % mod
    return remainder


def build_sequences(order: list[int]) -> tuple[list[int], list[int], list[int], list[int]]:
    even_counts = [VERSE_COUNTS[index] for index in order if VERSE_COUNTS[index] % 2 == 0]
    odd_counts = [VERSE_COUNTS[index] for index in order if VERSE_COUNTS[index] % 2 == 1]
    even_sums = [index + 1 + VERSE_COUNTS[index] for index in order if VERSE_COUNTS[index] % 2 == 0]
    odd_sums = [index + 1 + VERSE_COUNTS[index] for index in order if VERSE_COUNTS[index] % 2 == 1]
    return even_counts, odd_counts, even_sums, odd_sums


def main() -> None:
    order = list(range(len(VERSE_COUNTS)))
    even_counts, odd_counts, even_sums, odd_sums = build_sequences(order)
    coprime_mods = [mod for mod in range(2, 201) if gcd(mod, 10) == 1]

    observed_pairs = [
        (even_mod, odd_mod)
        for even_mod in coprime_mods
        for odd_mod in coprime_mods
        if concat_mod(even_counts, even_mod) == 0
        and concat_mod(odd_counts, odd_mod) == 0
        and concat_mod(even_sums, even_mod) == 0
        and concat_mod(odd_sums, odd_mod) == 0
    ]

    trials = 100_000
    rng = Random(20260421)
    exact_hits = 0
    any_pair_hits = 0

    for _ in range(trials):
        shuffled = list(order)
        rng.shuffle(shuffled)
        even_counts, odd_counts, even_sums, odd_sums = build_sequences(shuffled)

        if (
            concat_mod(even_counts, 19) == 0
            and concat_mod(odd_counts, 7) == 0
            and concat_mod(even_sums, 19) == 0
            and concat_mod(odd_sums, 7) == 0
        ):
            exact_hits += 1

        found_any_pair = False
        for even_mod in coprime_mods:
            if concat_mod(even_counts, even_mod) != 0 or concat_mod(even_sums, even_mod) != 0:
                continue
            for odd_mod in coprime_mods:
                if concat_mod(odd_counts, odd_mod) == 0 and concat_mod(odd_sums, odd_mod) == 0:
                    found_any_pair = True
                    break
            if found_any_pair:
                break

        if found_any_pair:
            any_pair_hits += 1

    print("Observed congruences")
    print(f"  even counts mod 19 : {concat_mod(build_sequences(order)[0], 19)}")
    print(f"  odd counts mod 7   : {concat_mod(build_sequences(order)[1], 7)}")
    print(f"  even sums mod 19   : {concat_mod(build_sequences(order)[2], 19)}")
    print(f"  odd sums mod 7     : {concat_mod(build_sequences(order)[3], 7)}")
    print()
    print(f"Observed non-trivial pairs up to 200: {observed_pairs}")
    print(f"Exact quartet hits in {trials:,} permutations: {exact_hits} ({exact_hits / trials:.8f})")
    print(f"Any non-trivial pair hits in {trials:,} permutations: {any_pair_hits} ({any_pair_hits / trials:.8f})")


if __name__ == "__main__":
    main()
