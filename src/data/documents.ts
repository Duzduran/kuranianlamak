/**
 * Sitede kayıtlı tutulan dosyalar.
 *
 * Her kayıt /dosyalar/<slug> adresinde açılır. Dosyaların kendisi
 * public/dosyalar/ altında repoda saklanır; yeni dosya eklemek için:
 *
 *   python3 scripts/dosya_ekle.py <kaynak.docx> <slug> "Başlık"
 *
 * komutunu çalıştırıp aşağıya bir kayıt eklemek yeterlidir.
 */

export interface SiteDocument {
  /** Adres uzantısı: /dosyalar/<slug> */
  slug: string;
  title: string;
  author: string;
  description: string;
  /** Sayfa sayısı (PDF kopyasına göre, yaklaşık) */
  pages: number;
  /** YYYY-AA-GG */
  addedAt: string;
  /** Orijinal kaynak (ör. Google Drive linki), isteğe bağlı */
  sourceUrl?: string;
}

export const documents: SiteDocument[] = [
  {
    slug: "bilal-aksoy-miras-kelime-analizi",
    title: "Miras Kelime Analizi",
    author: "Bilal Aksoy",
    description:
      "Kur'an'ın miras ayetlerinde (Nisâ 7, 11, 12 ve 176) tekil, ikil, çoğul ve hiçlik bildirimlerinin dilsel ve matematiksel bütünlüğü.",
    pages: 6,
    addedAt: "2026-11-24",
    sourceUrl: "https://docs.google.com/document/d/1UqPRHKP0lQCLiUOSLAjvXwmRkvdKo8xL/edit"
  },
  {
    slug: "bilal-aksoy-miras-hesap-tablolari",
    title: "Miras Hesap Tabloları",
    author: "Bilal Aksoy",
    description:
      "Miras bırakan erkek ve kadın için evlat durumlarına göre Nisâ 11, 12 ve 176. ayetlerdeki payların tablolar hâlinde hesaplanması.",
    pages: 148,
    addedAt: "2026-11-24",
    sourceUrl: "https://docs.google.com/document/d/1wIQXsZ2pv7VPFmsg8XbNKQA0DXHjjIAd/edit"
  },
  {
    slug: "bilal-aksoy-miras-delil",
    title: "Kur'an'da Miras Araştırması",
    author: "Bilal Aksoy",
    description:
      "Miras ayetlerindeki 27/24 sorununun kaynağı: Nisâ 11 ve 12'deki şart kategorileri, tekil-çoğul ayrımları ve iki hesaplama yönteminin karşılaştırılması.",
    pages: 9,
    addedAt: "2026-11-25",
    sourceUrl: "https://docs.google.com/document/d/1juJnjI6I2VMUY2zOH5cg3eULouJ9DVyb/edit"
  }
];

export const documentFiles = (slug: string) => ({
  docx: `/dosyalar/${slug}.docx`,
  pdf: `/dosyalar/${slug}.pdf`
});

// Dosya adlarında geçersiz karakterler (? : / \ * " < > |) atılır; aksi hâlde
// tarayıcı indirilen dosyaya "download" gibi genel bir ad verir.
export const documentFileName = (doc: SiteDocument, ext: "docx" | "pdf") =>
  `${doc.author} - ${doc.title}`
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim() + `.${ext}`;
