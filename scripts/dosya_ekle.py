#!/usr/bin/env python3
"""Bir Word (.docx) dosyasını sitenin /dosyalar bölümüne ekler.

Kullanım:
    python3 scripts/dosya_ekle.py <kaynak.docx> <slug>

Örnek:
    python3 scripts/dosya_ekle.py ~/Downloads/miras.docx bilal-aksoy-miras-kelime-analizi

Üretilen dosyalar (hepsi repoya kaydedilir, böylece Drive linki değişse de kalır):
    public/dosyalar/<slug>.docx   -> orijinal Word dosyası (indirme)
    public/dosyalar/<slug>.pdf    -> sitede PDF görüntüleyicide açılan ve indirilen kopya

Son adım: src/data/documents.ts içine dosya için bir kayıt eklemek
(betik, kayda yazılacak sayfa sayısını da gösterir).
Gerekli araç: LibreOffice (soffice).
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "dosyalar"

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def to_pdf(src: Path, workdir: Path) -> Path:
    subprocess.run(
        ["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(workdir), str(src)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=600,
    )
    out = workdir / f"{src.stem}.pdf"
    if not out.exists():
        raise SystemExit("PDF dönüştürmesi başarısız oldu")
    return out


def page_count(pdf: Path) -> int | None:
    if shutil.which("pdfinfo") is None:
        return None
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout
    match = re.search(r"^Pages:\s+(\d+)", info, re.M)
    return int(match.group(1)) if match else None


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)

    src = Path(sys.argv[1]).expanduser().resolve()
    slug = sys.argv[2]

    if not src.is_file() or src.suffix.lower() != ".docx":
        raise SystemExit(f"Bir .docx dosyası verilmeli: {src}")
    if not SLUG_RE.match(slug):
        raise SystemExit("Slug yalnızca küçük harf, rakam ve tire içermeli (ör. bilal-aksoy-miras-kelime-analizi)")
    if shutil.which("soffice") is None:
        raise SystemExit("LibreOffice (soffice) bulunamadı")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        staged = work / f"{slug}.docx"
        shutil.copyfile(src, staged)
        pdf = to_pdf(staged, work)

        shutil.copyfile(staged, OUT_DIR / f"{slug}.docx")
        shutil.copyfile(pdf, OUT_DIR / f"{slug}.pdf")
        pages = page_count(pdf)

    print(f"Eklendi: public/dosyalar/{slug}.docx ve {slug}.pdf")
    if pages:
        print(f"Sayfa sayısı: {pages}")
    print("Şimdi src/data/documents.ts içine bu dosyanın kaydını ekleyin.")


if __name__ == "__main__":
    main()
