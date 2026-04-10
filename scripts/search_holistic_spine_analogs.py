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


def mod_concat(values: list[int], modulus: int, start: int = 0) -> int:
    residue = start
    for value in values:
        for ch in str(value):
            residue = (residue * 10 + int(ch)) % modulus
    return residue


def find_mod19_order(a: int, l: int, m: int, s: int) -> str | None:
    append19 = {key: (pow(10, length, 19), value % 19) for key, (value, length) in TOKENS.items()}

    @lru_cache(None)
    def dfs(a: int, l: int, m: int, s: int, residue: int) -> str | None:
        if a == l == m == s == 0:
            return "" if residue == 0 else None

        candidates = (
            ("a", a - 1, l, m, s),
            ("l", a, l - 1, m, s),
            ("m", a, l, m - 1, s),
            ("s", a, l, m, s - 1),
        )
        for key, na, nl, nm, ns in candidates:
            if min(na, nl, nm, ns) < 0:
                continue
            mul, value = append19[key]
            tail = dfs(na, nl, nm, ns, (residue * mul + value) % 19)
            if tail is not None:
                return key + tail
        return None

    return dfs(a, l, m, s, 0)


def single_candidates(max_total: int, limit: int) -> list[dict[str, object]]:
    hits: list[dict[str, object]] = []
    for total in range(8, max_total + 1):
        for a in range(1, total - 2):
            for l in range(1, total - a - 1):
                for m in range(1, total - a - l):
                    s = total - a - l - m
                    counts = [a, l, m, s]
                    digit_length = a + 2 * l + 2 * m + 2 * s
                    cumulative_lengths = [a, a + 2 * l, a + 2 * l + 2 * m, digit_length]
                    cumulative_counts = [a, a + l, a + l + m, total]

                    if mod_concat(counts, 19) != 0:
                        continue
                    if mod_concat([digit_length, total], 19) != 0:
                        continue

                    lock_chain = cumulative_lengths + counts + cumulative_counts
                    if mod_concat(lock_chain, 19) != 0 or mod_concat(lock_chain, 7) != 0:
                        continue

                    order = find_mod19_order(a, l, m, s)
                    if order is None:
                        continue

                    hits.append(
                        {
                            "counts": counts,
                            "total": total,
                            "digit_length": digit_length,
                            "cumulative_lengths": cumulative_lengths,
                            "cumulative_counts": cumulative_counts,
                            "order": order,
                        }
                    )
                    if len(hits) >= limit:
                        return hits
    return hits


def family_count_candidates(single_counts: list[int], max_total: int, limit: int) -> list[dict[str, object]]:
    a, l, m, s = single_counts
    hits: list[dict[str, object]] = []
    min_total = sum(single_counts)
    for total in range(min_total, max_total + 1):
        for A in range(a, total - 2):
            for L in range(l, total - A - 1):
                for M in range(m, total - A - L):
                    S = total - A - L - M
                    if S < s:
                        continue
                    cumulative_counts = [A, A + L, A + L + M, total]
                    if mod_concat(cumulative_counts, 19) != 0 or mod_concat(cumulative_counts, 7) != 0:
                        continue
                    digit_total = A + 2 * L + 2 * M + 2 * S
                    hits.append(
                        {
                            "counts": [A, L, M, S],
                            "cumulative_counts": cumulative_counts,
                            "digit_total": digit_total,
                        }
                    )
                    if len(hits) >= limit:
                        return hits
    return hits


def find_family_cumulative_lengths(
    digit_total: int,
    prefix2: list[int],
    prefix3: list[int],
) -> list[int] | None:
    current: dict[tuple[int, int, int, int, int, int], list[int]] = {
        (0, mod_concat(prefix2, 19), mod_concat(prefix2, 7), mod_concat(prefix3, 19), mod_concat(prefix3, 7), 0): []
    }

    for step in range(1, 8):
        nxt: dict[tuple[int, int, int, int, int, int], list[int]] = {}
        for (r19a, r19b, r7b, r19c, r7c, last), seq in current.items():
            lo = last + 1
            hi = digit_total - (7 - step)
            if step == 7:
                lo = hi = digit_total
            for value in range(lo, hi + 1):
                key = (
                    mod_concat([value], 19, r19a),
                    mod_concat([value], 19, r19b),
                    mod_concat([value], 7, r7b),
                    mod_concat([value], 19, r19c),
                    mod_concat([value], 7, r7c),
                    value,
                )
                if key not in nxt:
                    nxt[key] = seq + [value]
        current = nxt

    for (r19a, r19b, r7b, r19c, r7c, last), seq in current.items():
        if last == digit_total and r19a == 0 and r19b == 0 and r7b == 0 and r19c == 0 and r7c == 0:
            return seq
    return None


def search(max_single_total: int, max_family_total: int, single_limit: int, family_limit: int) -> dict[str, object] | None:
    for single in single_candidates(max_single_total, single_limit):
        prefix2 = single["counts"] + [single["digit_length"], single["total"]]
        prefix3 = (
            prefix2
            + single["cumulative_lengths"]
            + single["counts"]
            + single["cumulative_counts"]
        )
        for family in family_count_candidates(single["counts"], max_family_total, family_limit):
            family_cumulative_lengths = find_family_cumulative_lengths(
                family["digit_total"],
                prefix2,
                prefix3 + family["cumulative_counts"],
            )
            if family_cumulative_lengths is None:
                continue

            return {
                "single": single,
                "family": family,
                "family_cumulative_lengths": family_cumulative_lengths,
            }
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Search synthetic analogs that satisfy the current holistic ELMS + ALMS spine."
    )
    parser.add_argument("--max-single-total", type=int, default=40)
    parser.add_argument("--max-family-total", type=int, default=80)
    parser.add_argument("--single-limit", type=int, default=50)
    parser.add_argument("--family-limit", type=int, default=200)
    args = parser.parse_args()

    result = search(args.max_single_total, args.max_family_total, args.single_limit, args.family_limit)
    if result is None:
        print("no analog found in search bounds")
        return 0

    single = result["single"]
    family = result["family"]
    family_cumulative_lengths = result["family_cumulative_lengths"]
    prefix2 = single["counts"] + [single["digit_length"], single["total"]]
    prefix3 = prefix2 + single["cumulative_lengths"] + single["counts"] + single["cumulative_counts"] + family["cumulative_counts"]

    print("FOUND ANALOG")
    print(
        "single",
        f"counts={tuple(single['counts'])}",
        f"digit_length={single['digit_length']}",
        f"total={single['total']}",
        f"order={single['order']}",
    )
    print(
        "family",
        f"counts={tuple(family['counts'])}",
        f"cum_counts={tuple(family['cumulative_counts'])}",
        f"digit_total={family['digit_total']}",
    )
    print("family_cumulative_lengths", tuple(family_cumulative_lengths))
    print("ALMSF-1", mod_concat(family["cumulative_counts"], 19), mod_concat(family["cumulative_counts"], 7))
    print("ALMSF-3", mod_concat(family_cumulative_lengths, 19), mod_concat(family_cumulative_lengths, 7))
    print("SPINE-2", mod_concat(prefix2 + family_cumulative_lengths, 19), mod_concat(prefix2 + family_cumulative_lengths, 7))
    print("SPINE-3", mod_concat(prefix3 + family_cumulative_lengths, 19), mod_concat(prefix3 + family_cumulative_lengths, 7))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
