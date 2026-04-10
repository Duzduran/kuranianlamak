#!/usr/bin/env python3
from __future__ import annotations

import argparse
import unicodedata as ud
from pathlib import Path


ALEF_BENZERLERI = {
    "ٱ": "ا",
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ٲ": "ا",
    "ٳ": "ا",
    "ٵ": "ا",
}

YOK_SAYILANLAR = {"ٰ", "ۡ", "ۖ", "۟", "ٓ", "ٔ", "ٕ", "ـ"}

EBCED = {
    "ا": 1,
    "ل": 30,
    "م": 40,
    "ص": 90,
}

HEDEF_HARFLER = set("المص")
BESMELE = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"


def normalize_et(metin: str) -> str:
    sonuc: list[str] = []
    for karakter in metin:
        if karakter in ALEF_BENZERLERI:
            sonuc.append("ا")
            continue
        if karakter in YOK_SAYILANLAR:
            continue
        if ud.category(karakter).startswith("M"):
            continue
        if ud.category(karakter).startswith("L"):
            sonuc.append(karakter)
    return "".join(sonuc)


def basamaklardan_mod_hesapla(basamaklar: str, mod: int) -> int:
    deger = 0
    for karakter in basamaklar:
        deger = (deger * 10 + int(karakter)) % mod
    return deger


def basamak_dizisini_olustur(txt_yolu: Path) -> tuple[str, dict[str, int]]:
    sayilar = {harf: 0 for harf in HEDEF_HARFLER}
    parcaciklar: list[str] = []

    # fff.txt numarasiz Besmele satirini icermedigi icin ayni yontemi korumak adina
    # baslangicta Besmele metni elle eklenir.
    for harf in normalize_et(BESMELE):
        if harf in HEDEF_HARFLER:
            sayilar[harf] += 1
            parcaciklar.append(str(EBCED[harf]))

    for satir in txt_yolu.open(encoding="utf-8"):
        parcalar = satir.rstrip("\n").split("|", 3)
        if len(parcalar) != 4:
            continue

        _genel_no, sure_no, _ayet_no, metin = parcalar
        if sure_no != "7":
            continue

        for harf in normalize_et(metin):
            if harf in HEDEF_HARFLER:
                sayilar[harf] += 1
                parcaciklar.append(str(EBCED[harf]))

    return "".join(parcaciklar), sayilar


def main() -> int:
    parser = argparse.ArgumentParser(
        description="fff.txt dosyasindan 7. sure icin Elif-Lam-Mim-Sad basamak dizisini hesaplar."
    )
    parser.add_argument("txt", type=Path, help="fff.txt dosyasinin yolu")
    parser.add_argument("--write", type=Path, help="Olusan tam basamak dizisini yazmak icin istege bagli cikti dosyasi")
    args = parser.parse_args()

    basamaklar, sayilar = basamak_dizisini_olustur(args.txt)

    print("kaynak = fff.txt")
    print("besmele_dahil = True")
    print(f"harf_sayilari = {sayilar}")
    print(f"basamak_uzunlugu = {len(basamaklar)}")
    print(f"mod_19 = {basamaklardan_mod_hesapla(basamaklar, 19)}")
    print(f"mod_7 = {basamaklardan_mod_hesapla(basamaklar, 7)}")

    if args.write:
        args.write.write_text(basamaklar, encoding="utf-8")
        print(f"dosyaya_yazildi = {args.write}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
