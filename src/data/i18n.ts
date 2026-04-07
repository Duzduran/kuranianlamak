export type Locale = "tr" | "en";

export const defaultLocale: Locale = "tr";

export const siteMeta = {
  tr: {
    title: "Kur'an'da Yapısal İnceleme",
    description:
      "Kur'an metnindeki yapısal, sayısal ve biçimsel düzenleri sade bir dille açıklayan konu merkezli bir inceleme sitesi."
  },
  en: {
    title: "Structural Reading in the Qur'an",
    description:
      "A focused study site that explains structural, numerical, and formal patterns in the Qur'an in a clear and minimal way."
  }
} as const;

export const uiCopy = {
  tr: {
    switcherLabel: "Dil seç",
    scrollDown: "Aşağı in",
    goDeeper: "Derine in",
    close: "Kapat",
    explore: "İncele",
    analyze: "Analiz et",
    mutate: "Bir rakam değiştir",
    reset: "Geri al",
    number: "Sayı"
  },
  en: {
    switcherLabel: "Choose language",
    scrollDown: "Scroll down",
    goDeeper: "Go deeper",
    close: "Close",
    explore: "Explore",
    analyze: "Analyze",
    mutate: "Change one digit",
    reset: "Reset",
    number: "Number"
  }
} as const;
