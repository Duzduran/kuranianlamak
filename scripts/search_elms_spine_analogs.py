#!/usr/bin/env python3
from __future__ import annotations

import argparse
from functools import lru_cache


TOKENS = {
    "a": (1, 1),
    "l": (30, 2),
    "m": (40, 2),
    "s": (90, 2),
}


def mod_concat_numbers(values: list[int], modulus: int) -> int:
    mod = 0
    for value in values:
        for ch in str(value):
            mod = (mod * 10 + int(ch)) % modulus
    return mod


def passes_spine_filters(a: int, l: int, m: int, s: int) -> bool:
    counts = [a, l, m, s]
    total = sum(counts)
    cumulative_lengths = [a, a + 2 * l, a + 2 * l + 2 * m, a + 2 * l + 2 * m + 2 * s]
    cumulative_counts = [a, a + l, a + l + m, total]

    return (
        mod_concat_numbers(counts, 19) == 0
        and mod_concat_numbers([cumulative_lengths[-1], total], 19) == 0
        and mod_concat_numbers(cumulative_lengths + counts + cumulative_counts, 19) == 0
        and mod_concat_numbers(cumulative_lengths + counts + cumulative_counts, 7) == 0
    )


def find_mod19_order(a: int, l: int, m: int, s: int) -> str | None:
    append19 = {key: (pow(10, length, 19), value % 19) for key, (value, length) in TOKENS.items()}

    @lru_cache(None)
    def dfs(a: int, l: int, m: int, s: int, residue: int) -> str | None:
        if a == l == m == s == 0:
            return "" if residue == 0 else None

        if a:
            mul, value = append19["a"]
            tail = dfs(a - 1, l, m, s, (residue * mul + value) % 19)
            if tail is not None:
                return "a" + tail
        if l:
            mul, value = append19["l"]
            tail = dfs(a, l - 1, m, s, (residue * mul + value) % 19)
            if tail is not None:
                return "l" + tail
        if m:
            mul, value = append19["m"]
            tail = dfs(a, l, m - 1, s, (residue * mul + value) % 19)
            if tail is not None:
                return "m" + tail
        if s:
            mul, value = append19["s"]
            tail = dfs(a, l, m, s - 1, (residue * mul + value) % 19)
            if tail is not None:
                return "s" + tail

        return None

    return dfs(a, l, m, s, 0)


def search(max_total: int, limit: int) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []

    for total in range(8, max_total + 1):
        for a in range(1, total - 2):
            for l in range(1, total - a - 1):
                for m in range(1, total - a - l):
                    s = total - a - l - m
                    if s < 1 or not passes_spine_filters(a, l, m, s):
                        continue

                    order = find_mod19_order(a, l, m, s)
                    if order is None:
                        continue

                    cumulative_lengths = [a, a + 2 * l, a + 2 * l + 2 * m, a + 2 * l + 2 * m + 2 * s]
                    cumulative_counts = [a, a + l, a + l + m, total]
                    results.append(
                        {
                            "counts": (a, l, m, s),
                            "total": total,
                            "cumulative_lengths": cumulative_lengths,
                            "cumulative_counts": cumulative_counts,
                            "order": order,
                        }
                    )

                    if len(results) >= limit:
                        return results

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Search synthetic count/order systems that imitate the current ELMS single-surah spine."
    )
    parser.add_argument("--max-total", type=int, default=60, help="Maximum total count to search")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of hits to print")
    args = parser.parse_args()

    results = search(args.max_total, args.limit)
    print(f"hits = {len(results)}")
    for index, item in enumerate(results, start=1):
        print(
            f"{index:02d}. counts={item['counts']} total={item['total']} "
            f"cum_lengths={item['cumulative_lengths']} cum_counts={item['cumulative_counts']}"
        )
        print(f"    order={item['order']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
