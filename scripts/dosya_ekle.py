#!/usr/bin/env python3
"""Bir Word (.docx) dosyasını sitenin /dosyalar bölümüne ekler.

Kullanım:
    python3 scripts/dosya_ekle.py <kaynak.docx> <slug> ["Başlık"]

Örnek:
    python3 scripts/dosya_ekle.py ~/Downloads/miras.docx bilal-aksoy-miras-kelime-analizi \
        "Bilal Aksoy · Miras Kelime Analizi"

Üretilen dosyalar (hepsi repoya kaydedilir, böylece Drive linki değişse de kalır):
    public/dosyalar/<slug>.docx            -> orijinal Word dosyası (indirme)
    public/dosyalar/<slug>.pdf             -> PDF kopyası (indirme)
    public/dosyalar/onizleme/<slug>.html   -> sitede gösterilen önizleme

Son adım: src/data/documents.ts içine dosya için bir kayıt eklemek.
Gerekli araç: LibreOffice (soffice).
"""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "dosyalar"
PREVIEW_DIR = OUT_DIR / "onizleme"

VIEWER_STYLE = """
<style id="within19-viewer">
  html {
    background: #ffffff;
    overflow-x: auto;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  body {
    max-width: 1040px;
    margin: 0 auto !important;
    padding: 36px 28px 56px !important;
    background: #ffffff;
    color: #000000;
  }
  img { max-width: 100%; height: auto; }
  @media (max-width: 700px) {
    body { padding: 18px 12px 32px !important; }
  }
</style>
"""

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Word yazı tipleri her cihazda yüklü olmadığından benzer yedekler eklenir.
FONT_FALLBACKS = {
    "Calibri": "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
    "Aptos": "Aptos, Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
    "'Times New Roman'": "'Times New Roman', Tinos, 'Liberation Serif', Times, serif",
    "Arial": "Arial, Arimo, 'Liberation Sans', Helvetica, sans-serif",
    "Verdana": "Verdana, 'DejaVu Sans', Geneva, sans-serif",
}


def fix_css(text: str) -> str:
    # LibreOffice "line-height:100%" yazar; yüzde değer sabit uzunluğa dönüşüp
    # içteki büyük yazılara miras kaldığı için satırlar üst üste biner.
    # Birimsiz değer her yazı boyutuna göre ölçeklenir.
    text = re.sub(
        r"line-height:\s*(\d+(?:\.\d+)?)%",
        lambda m: f"line-height:{float(m.group(1)) / 100:g}",
        text,
    )
    for name, stack in FONT_FALLBACKS.items():
        text = re.sub(rf"font-family:\s*{re.escape(name)}\s*(?=[;}}\"])", f"font-family:{stack}", text)
    return text


def convert(src: Path, filter_name: str, workdir: Path) -> Path:
    subprocess.run(
        ["soffice", "--headless", "--convert-to", filter_name, "--outdir", str(workdir), str(src)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=600,
    )
    ext = filter_name.split(":", 1)[0]
    out = workdir / f"{src.stem}.{ext}"
    if not out.exists():
        raise SystemExit(f"Dönüştürme başarısız: {out.name} üretilemedi")
    return out


def polish_preview(raw: str, title: str) -> str:
    text = fix_css(raw)
    text = re.sub(r"<\?xml[^>]*\?>\s*", "", text, count=1)
    text = re.sub(r"<!DOCTYPE[^>]*>\s*", "<!DOCTYPE html>\n", text, count=1)
    text = re.sub(r'(<html\b[^>]*?)\blang="[^"]*"', r'\1lang="tr"', text, count=1)
    text = re.sub(
        r"<title[^>]*>.*?</title>",
        f"<title>{html.escape(title)}</title>",
        text,
        count=1,
        flags=re.S,
    )
    text = text.replace("</head>", f'<meta name="viewport" content="width=device-width, initial-scale=1"/>\n{VIEWER_STYLE}</head>', 1)
    return text


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)

    src = Path(sys.argv[1]).expanduser().resolve()
    slug = sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else slug.replace("-", " ").title()

    if not src.is_file() or src.suffix.lower() != ".docx":
        raise SystemExit(f"Bir .docx dosyası verilmeli: {src}")
    if not SLUG_RE.match(slug):
        raise SystemExit("Slug yalnızca küçük harf, rakam ve tire içermeli (ör. bilal-aksoy-miras-kelime-analizi)")
    if shutil.which("soffice") is None:
        raise SystemExit("LibreOffice (soffice) bulunamadı")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        staged = work / f"{slug}.docx"
        shutil.copyfile(src, staged)

        pdf = convert(staged, "pdf", work)
        xhtml = convert(staged, "xhtml:XHTML Writer File:UTF8", work)

        shutil.copyfile(staged, OUT_DIR / f"{slug}.docx")
        shutil.copyfile(pdf, OUT_DIR / f"{slug}.pdf")
        preview = polish_preview(xhtml.read_text(encoding="utf-8"), title)
        (PREVIEW_DIR / f"{slug}.html").write_text(preview, encoding="utf-8")

    print(f"Eklendi: public/dosyalar/{slug}.docx, {slug}.pdf, onizleme/{slug}.html")
    print("Şimdi src/data/documents.ts içine bu dosyanın kaydını ekleyin.")


if __name__ == "__main__":
    main()
