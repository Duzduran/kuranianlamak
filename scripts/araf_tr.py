#!/usr/bin/env python3
from __future__ import annotations

import argparse
import unicodedata as ud
import xml.etree.ElementTree as ET
from pathlib import Path


NS = {"tei": "http://www.tei-c.org/ns/1.0"}
XML_NS = "{http://www.w3.org/XML/1998/namespace}"

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


def basamak_dizisini_olustur(xml_yolu: Path) -> tuple[str, dict[str, int]]:
    kok = ET.parse(xml_yolu).getroot()
    metin_koku = kok.find(".//tei:text", NS)
    if metin_koku is None:
        raise RuntimeError("TEI metin govdesi bulunamadi.")

    sayilar = {harf: 0 for harf in HEDEF_HARFLER}
    parcaciklar: list[str] = []

    for harf in normalize_et(BESMELE):
        if harf in HEDEF_HARFLER:
            sayilar[harf] += 1
            parcaciklar.append(str(EBCED[harf]))

    for lg in metin_koku.iter(f"{{{NS['tei']}}}lg"):
        xml_id = lg.attrib.get(f"{XML_NS}id", "")
        if not xml_id.startswith("verse-007-"):
            continue

        kelimeler = [
            normalize_et(kelime.text.strip())
            for kelime in lg.findall(".//tei:w", NS)
            if kelime.text
        ]

        for harf in "".join(kelimeler):
            if harf in HEDEF_HARFLER:
                sayilar[harf] += 1
                parcaciklar.append(str(EBCED[harf]))

    return "".join(parcaciklar), sayilar


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Kahire mushafi TEI/XML verisinden 7. sure icin Elif-Lam-Mim-Sad basamak dizisini hesaplar."
    )
    parser.add_argument("xml", type=Path, help="TEI/XML mushaf dosyasinin yolu")
    parser.add_argument("--write", type=Path, help="Olusan tam basamak dizisini yazmak icin istege bagli cikti dosyasi")
    args = parser.parse_args()

    basamaklar, sayilar = basamak_dizisini_olustur(args.xml)

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
