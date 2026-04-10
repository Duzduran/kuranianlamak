import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type LocalizedText = {
  tr: string;
  en: string;
};

export type CriterionFact = {
  label: LocalizedText;
  value: LocalizedText;
};

export type CriterionTestCase = {
  id: string;
  label: LocalizedText;
  sequence: string;
  mods: number[];
  note?: LocalizedText;
};

export type CriterionEntry = {
  id: string;
  code: string;
  groupId: string;
  title: LocalizedText;
  summary: LocalizedText;
  sourceLabel?: LocalizedText;
  sourceUrl?: string;
  discovery: {
    name: string;
    date?: string;
    place?: string;
  };
  facts?: CriterionFact[];
  tests?: CriterionTestCase[];
  tags?: string[];
};

export type CriterionGroup = {
  id: string;
  title: LocalizedText;
  intro: LocalizedText;
};

const l = (tr: string, en = tr): LocalizedText => ({ tr, en });

const surahVerseCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64,
  77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
  62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4,
  5, 6
];

const surahNumbers = surahVerseCounts.map((_, index) => index + 1);
const unnumberedBasmalaCounts = surahNumbers.map((surahNo) => (surahNo === 1 || surahNo === 9 ? 0 : 1));
const totalLineCounts = surahVerseCounts.map((ayahCount, index) => ayahCount + unnumberedBasmalaCounts[index]);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const digitSum = (value: string | number) =>
  String(value)
    .replace(/\D/g, "")
    .split("")
    .reduce((total, digit) => total + Number(digit || 0), 0);

const sequenceFrom = (values: number[]) => values.join(" ");

const slidingWindowDigitSequence = (value: string) => {
  const digits = digitsOnly(value).split("").map(Number);

  return digits
    .map((digit, index) => {
      if (index === 0) return digit;
      return digit + digits[index - 1];
    })
    .join("");
};

const rangeSequence = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index).join(" ");

const cumulativeSums = (values: number[]) => {
  let runningTotal = 0;

  return values.map((value) => {
    runningTotal += value;
    return runningTotal;
  });
};

const BASMALA_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const ALEF_LIKE_MAP: Record<string, string> = {
  "ٱ": "ا",
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٲ": "ا",
  "ٳ": "ا",
  "ٵ": "ا"
};
const IGNORED_ARABIC_CHARS = new Set(["ٰ", "ۡ", "ۖ", "۟", "ٓ", "ٔ", "ٕ", "ـ"]);
const ELMS_ABJAD_DIGITS: Record<string, string> = {
  ا: "1",
  ل: "30",
  م: "40",
  ص: "90"
};

const normalizeArabicLetterStream = (text: string) => {
  const normalized = Array.from(text.normalize("NFD")).flatMap((character) => {
    if (ALEF_LIKE_MAP[character]) return [ALEF_LIKE_MAP[character]];
    if (IGNORED_ARABIC_CHARS.has(character)) return [];
    return /^\p{L}$/u.test(character) ? [character] : [];
  });

  return normalized.join("");
};

const quranFffRows = readFileSync(resolve(process.cwd(), "scripts/fff.txt"), "utf8").trim().split(/\r?\n/u);
const arafVerseRows = quranFffRows
  .map((row) => row.split("|", 4))
  .filter((parts) => parts[1] === "7")
  .map((parts) => ({
    ayah: Number(parts[2]),
    text: parts[3] ?? ""
  }));

const buildArafAlmsNaturalSequence = () => {
  const arafText = arafVerseRows.map((row) => row.text).join("");
  const normalizedStream = normalizeArabicLetterStream(`${BASMALA_TEXT}${arafText}`);
  const counts = {
    elif: [...normalizedStream].filter((character) => character === "ا").length,
    lam: [...normalizedStream].filter((character) => character === "ل").length,
    mim: [...normalizedStream].filter((character) => character === "م").length,
    sad: [...normalizedStream].filter((character) => character === "ص").length
  };
  const sequence = [...normalizedStream]
    .filter((character) => character in ELMS_ABJAD_DIGITS)
    .map((character) => ELMS_ABJAD_DIGITS[character])
    .join("");

  return { counts, sequence };
};

const arafAlmsNatural = buildArafAlmsNaturalSequence();
const arafVerseLetterStats = arafVerseRows.map((row) => {
  const normalized = normalizeArabicLetterStream(row.text);
  const counts = {
    elif: [...normalized].filter((character) => character === "ا").length,
    lam: [...normalized].filter((character) => character === "ل").length,
    mim: [...normalized].filter((character) => character === "م").length,
    sad: [...normalized].filter((character) => character === "ص").length
  };

  return {
    ayah: row.ayah,
    counts,
    total: counts.elif + counts.lam + counts.mim + counts.sad
  };
});
const arafAlmsCountValues = [
  arafAlmsNatural.counts.elif,
  arafAlmsNatural.counts.lam,
  arafAlmsNatural.counts.mim,
  arafAlmsNatural.counts.sad
];
const arafAlmsCountSequence = sequenceFrom(arafAlmsCountValues);
const arafAlmsCountTotal = sum(arafAlmsCountValues);
const arafAlmsEbcedValues = [1, 30, 40, 90];
const arafAlmsCumulativeEbced = cumulativeSums(arafAlmsEbcedValues);
const arafAlmsCumulativeEbcedWithCounts = sequenceFrom(
  arafAlmsCumulativeEbced.flatMap((value, index) => [value, arafAlmsCountValues[index]])
);
const arafLamNaturalSequence = ELMS_ABJAD_DIGITS["ل"].repeat(arafAlmsNatural.counts.lam);
const arafLam19Verses = arafVerseLetterStats.filter((row) => row.counts.lam === 19).map((row) => row.ayah);
const arafLam19VerseThenCountSequence = sequenceFrom(arafLam19Verses.flatMap((ayah) => [ayah, 19]));
const arafLam19CountThenVerseSequence = sequenceFrom(arafLam19Verses.flatMap((ayah) => [19, ayah]));
const basmalaLamCount = normalizeArabicLetterStream(BASMALA_TEXT).split("").filter((character) => character === "ل").length;
const arafLamPerVerseCountsWithBasmala = [basmalaLamCount, ...arafVerseLetterStats.map((row) => row.counts.lam)];
const arafLamCumulativeCountsWithBasmala = cumulativeSums(arafLamPerVerseCountsWithBasmala);
const arafLamCumulativeCountSequence = sequenceFrom(arafLamCumulativeCountsWithBasmala);

const totalSurahSum = sum(surahNumbers);
const totalAyahSum = sum(surahVerseCounts);
const totalSurahDigitSum = sum(surahNumbers.map((surahNo) => digitSum(surahNo)));
const totalAyahDigitSum = sum(surahVerseCounts.map((ayahCount) => digitSum(ayahCount)));
const cumulativeVerseCounts = cumulativeSums(surahVerseCounts);
const lineIndexSums = totalLineCounts.map((lineCount) => (lineCount * (lineCount + 1)) / 2);

const parityGroups = {
  ee: [] as Array<{ surah: number; ayah: number }>,
  eo: [] as Array<{ surah: number; ayah: number }>,
  oe: [] as Array<{ surah: number; ayah: number }>,
  oo: [] as Array<{ surah: number; ayah: number }>
};

surahVerseCounts.forEach((ayah, index) => {
  const surah = index + 1;
  const groupKey = `${surah % 2 === 0 ? "e" : "o"}${ayah % 2 === 0 ? "e" : "o"}` as keyof typeof parityGroups;
  parityGroups[groupKey].push({ surah, ayah });
});

const parityGroupSums = {
  ee: {
    surah: sum(parityGroups.ee.map((entry) => entry.surah)),
    ayah: sum(parityGroups.ee.map((entry) => entry.ayah))
  },
  oo: {
    surah: sum(parityGroups.oo.map((entry) => entry.surah)),
    ayah: sum(parityGroups.oo.map((entry) => entry.ayah))
  },
  eo: {
    surah: sum(parityGroups.eo.map((entry) => entry.surah)),
    ayah: sum(parityGroups.eo.map((entry) => entry.ayah))
  },
  oe: {
    surah: sum(parityGroups.oe.map((entry) => entry.surah)),
    ayah: sum(parityGroups.oe.map((entry) => entry.ayah))
  }
};

const parityGroupDigitSums = {
  ee: sum(parityGroups.ee.flatMap((entry) => [...String(entry.surah), ...String(entry.ayah)].map(Number))),
  oo: sum(parityGroups.oo.flatMap((entry) => [...String(entry.surah), ...String(entry.ayah)].map(Number))),
  eo: sum(parityGroups.eo.flatMap((entry) => [...String(entry.surah), ...String(entry.ayah)].map(Number))),
  oe: sum(parityGroups.oe.flatMap((entry) => [...String(entry.surah), ...String(entry.ayah)].map(Number)))
};

const evenAyahSurahSum = sum(surahNumbers.filter((_, index) => surahVerseCounts[index] % 2 === 0));
const oddAyahSurahSum = sum(surahNumbers.filter((_, index) => surahVerseCounts[index] % 2 === 1));
const absoluteDifferenceSum = surahVerseCounts.slice(1).reduce((total, ayahCount, index) => {
  return total + Math.abs(ayahCount - surahVerseCounts[index]);
}, 0);

const multiplesOf19Surahs = [19, 38, 57, 76, 95, 114];
const multiplesOf19LineCounts = multiplesOf19Surahs.map((surahNo) => totalLineCounts[surahNo - 1]);

const triSequenceNumbers = surahNumbers.flatMap((surahNo, index) => [
  surahNo,
  surahVerseCounts[index],
  unnumberedBasmalaCounts[index]
]);
const triSequence = sequenceFrom(triSequenceNumbers);
const triSequenceSlidingWindow = slidingWindowDigitSequence(triSequence);
const triSequenceDigitSum = digitSum(triSequence);

const allNumberedAyahSequence = surahVerseCounts.map((ayahCount) => rangeSequence(1, ayahCount)).join(".");
const allNumberedAyahSequenceLength = digitsOnly(allNumberedAyahSequence).length;
const allNumberedAyahSlidingWindowLength = slidingWindowDigitSequence(allNumberedAyahSequence).length;

const naturalSurahSequence = sequenceFrom(surahNumbers);
const reverseSurahSequence = sequenceFrom([...surahNumbers].reverse());
const reverseDigitsOfNaturalSurahSequence = digitsOnly(naturalSurahSequence).split("").reverse().join("");

const surahAyah19List = surahVerseCounts
  .map((ayahCount, index) => ({
    surah: index + 1,
    ayah: ayahCount,
    combined: index + 1 + ayahCount,
    totalLines: totalLineCounts[index]
  }))
  .filter((entry) => entry.combined % 19 === 0);

const surahAyah19Totals = surahAyah19List.map((entry) => entry.combined);
const surahAyah19Surahs = surahAyah19List.map((entry) => entry.surah);
const surahAyah19Ayahs = surahAyah19List.map((entry) => entry.ayah);
const surahAyah19Lines = surahAyah19List.map((entry) => entry.totalLines);
const surahAyah19Half = surahAyah19List.length / 2;
const surahAyah19FirstHalf = surahAyah19List.slice(0, surahAyah19Half);
const surahAyah19SecondHalf = surahAyah19List.slice(surahAyah19Half);

const oddCombinedSelected = surahAyah19List.filter((entry) => entry.combined % 2 === 1);
const evenCombinedSelected = surahAyah19List.filter((entry) => entry.combined % 2 === 0);
const oddSurahSelected = surahAyah19List.filter((entry) => entry.surah % 2 === 1);
const evenSurahSelected = surahAyah19List.filter((entry) => entry.surah % 2 === 0);
const oddAyahSelected = surahAyah19List.filter((entry) => entry.ayah % 2 === 1);
const evenAyahSelected = surahAyah19List.filter((entry) => entry.ayah % 2 === 0);

const combinedSum = (entries: Array<{ surah: number; ayah: number }>) => sum(entries.map((entry) => entry.surah + entry.ayah));
const combinedDigitSum = (entries: Array<{ surah: number; ayah: number }>) =>
  sum(entries.map((entry) => digitSum(entry.surah) + digitSum(entry.ayah)));

const evenOrOddNumberSums = surahAyah19List.reduce(
  (accumulator, entry) => {
    [entry.surah, entry.ayah].forEach((value) => {
      if (value % 2 === 0) {
        accumulator.even.push(value);
      } else {
        accumulator.odd.push(value);
      }
    });

    return accumulator;
  },
  { even: [] as number[], odd: [] as number[] }
);

const primeFactorSum = (value: number) => {
  let remainder = value;
  let factor = 2;
  let total = 0;

  while (factor * factor <= remainder) {
    while (remainder % factor === 0) {
      total += factor;
      remainder /= factor;
    }

    factor += 1;
  }

  if (remainder > 1) total += remainder;

  return total;
};

const haMimLineCounts = totalLineCounts.slice(39, 46);
const group36Sequence = [
  sum(evenCombinedSelected.map((entry) => entry.combined)),
  sum(oddCombinedSelected.map((entry) => entry.combined)),
  combinedSum(oddSurahSelected),
  combinedSum(oddAyahSelected),
  sum(evenOrOddNumberSums.even),
  sum(evenOrOddNumberSums.odd),
  combinedSum(evenSurahSelected),
  combinedSum(evenAyahSelected)
];

const criterion39Columns = [44, 65, 43, 66, 51, 59, 44, 66, 51, 60, 52, 59];
const criterion39Window = [4, 8, 10, 11, 9, 7, 9, 12, 11, 6, 6, 14, 13, 8, 10, 12, 11, 6, 7, 6, 5, 7, 7, 14];
const criterion39Groups = [109, 109, 110, 110, 111, 111];

const criterion41Sequence =
  "171 171 6 165 6 165 6 165 114 114 15 99 15 99 15 99 133 133 21 112 112 21 21 112 114 114 39 75 39 75 39 75 95 95 41 54 54 41 41 54 95 95 42 53 42 53 42 53 95 95 50 45 50 45 50 45 133 133 55 78 78 55 55 78 152 152 56 96 56 96 56 96 114 114 70 44 70 44 70 44 114 114 88 26 88 26 88 26 114 114 107 7 107 7 107 7";

const criterion42Sequence =
  "6 165 6 165 6 165 15 99 15 99 15 99 21 112 112 21 21 112 39 75 39 75 39 75 41 54 54 41 41 54 42 53 42 53 42 53 50 45 50 45 50 45 55 78 78 55 55 78 56 96 56 96 56 96 70 44 70 44 70 44 88 26 88 26 88 26 107 7 107 7 107 7";

const discovery = (name: string, date?: string, place?: string) => ({ name, date, place });

const sourceFihrist6 = {
  label: l("Çift ve Tek 6", "Even and odd 6"),
  url: "https://kod.7ve19.com/CiftveTek_6_Tr.asp"
};

const sourceFihrist7 = {
  label: l("Çift ve Tek 7", "Even and odd 7"),
  url: "https://kod.7ve19.com/CiftveTek_7_Tr.asp"
};

const sourceHaMim5_3 = {
  label: l("Ha-Mim 5.3", "Ha-Mim 5.3"),
  url: "https://kod.7ve19.com/Ha-Mim_5_3_Tr.asp"
};

const sourceHaMim1 = {
  label: l("Ha-Mim 1", "Ha-Mim 1"),
  url: "https://kod.7ve19.com/Ha-Mim_1_Tr.asp"
};

const sourceHaMim2 = {
  label: l("Ha-Mim 2", "Ha-Mim 2"),
  url: "https://kod.7ve19.com/Ha-Mim_2_Tr.asp"
};

const sourceHaMim4_1 = {
  label: l("Ha-Mim 4.1", "Ha-Mim 4.1"),
  url: "https://kod.7ve19.com/Ha-Mim_4_1_Tr.asp"
};

const sourceHaMim4_2 = {
  label: l("Ha-Mim 4.2", "Ha-Mim 4.2"),
  url: "https://kod.7ve19.com/Ha-Mim_4_2_Tr.asp"
};

const sourceHaMimDemo = {
  label: l("Ha-Mim deneme metni", "Ha-Mim demo text"),
  url: "https://kod.7ve19.com/Ha-Mim_Deneme_Text_Tr.asp"
};

const sourceWithin19Research = {
  label: l("Within19 araştırma notu", "Within19 research note"),
  url: ""
};

const criterionFacts = (coding: string, measure: string): CriterionFact[] => [
  { label: l("Kodlama türü"), value: l(coding) },
  { label: l("Ölçüt"), value: l(measure) }
];

const referenceCriterion = ({
  id,
  code,
  groupId,
  title,
  summary,
  source,
  discoveryInfo,
  measure,
  tags
}: {
  id: string;
  code: string;
  groupId: string;
  title: string;
  summary: string;
  source: { label: LocalizedText; url: string };
  discoveryInfo: { name: string; date?: string; place?: string };
  measure: string;
  tags?: string[];
}): CriterionEntry => ({
  id,
  code,
  groupId,
  title: l(title),
  summary: l(summary),
  sourceLabel: source.label,
  sourceUrl: source.url,
  discovery: discoveryInfo,
  facts: criterionFacts(title, measure),
  tags
});

export const criteriaGroups: CriterionGroup[] = [
  {
    id: "alms",
    title: l("Elif-Lam-Mim-Sad Grubu", "Alif-Lam-Mim-Sad group"),
    intro: l(
      "A'râf 7:1 başındaki Elif-Lam-Mim-Sad harflerinden türetilen yeni aday kriterler.",
      "New candidate criteria derived from the Alif-Lam-Mim-Sad letters at the opening of Al-A'raf 7:1."
    )
  },
  {
    id: "hamim",
    title: l("Ha-Mim bağlantıları", "Ha-Mim links"),
    intro: l(
      "40-46 arası Ha-Mim surelerini ortak dizilimler üzerinden bağlayan kriterler.",
      "Criteria that connect the Ha-Mim surahs 40-46 through shared sequences."
    )
  },
  {
    id: "fihrist",
    title: l("Fihrist bulguları", "Index findings"),
    intro: l(
      "Sure ve ayet sayılarından türetilen çekirdek fihrist kodlamaları.",
      "Core index codings derived from the surah and verse counts."
    )
  },
  {
    id: "special",
    title: l("Özel anomaliler", "Special anomalies"),
    intro: l(
      "1. ve 9. sure çevresindeki özel durumlar ve 9. surenin son iki ayeti.",
      "Special cases around surahs 1 and 9, including the final two verses of surah 9."
    )
  },
  {
    id: "surah-ayah-19",
    title: l("(Sure + Ayet) ≡ 0 (mod 19)", "(Surah + verse) ≡ 0 (mod 19)"),
    intro: l(
      "Sure numarası ile ayet sayısı toplamı 19'un katı olan kayıtlar üzerinde kurulan ikinci grup kodlamalar.",
      "Second-group codings built on records where the surah number plus verse count is a multiple of 19."
    )
  }
];

const earlyHaMimCriteria: CriterionEntry[] = [
  referenceCriterion({
    id: "criterion-1",
    code: "1",
    groupId: "hamim",
    title: "Başlangıç tasarım şeması",
    summary:
      "Yedi surelik Ha-Mim benzeri kurgu için başlangıç tablosunda iki kodlama harfi bulunmalı; ilk sütunda üç basamaklı, ikinci sütunda iki basamaklı sayılar yer almalıdır.",
    source: sourceHaMim1,
    discoveryInfo: discovery("Mustafa Kurdoğlu"),
    measure: "7 sure, 2 kodlama harfi, 3+2 basamaklı sütun yapısı",
    tags: ["ha-mim", "başlangıç", "tasarım"]
  }),
  {
    id: "criterion-2",
    code: "2",
    groupId: "hamim",
    title: l("Ha-Mim harf sayılarının toplamı", "Sum of the Ha-Mim letter counts"),
    summary: l(
      "Yedi Ha-Mim suresindeki kodlama harflerinin toplamı 19 modunda doğrulanır.",
      "The total of the coding letters across the seven Ha-Mim surahs is verified modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Reşat Halife", "1974", "USA"),
    facts: criterionFacts("Harf sayıları toplamı", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "harf sayısı", "19"]
  },
  {
    id: "criterion-3",
    code: "3",
    groupId: "hamim",
    title: l("Toplam ve basamak toplamı oranı", "Ratio of total to digit sum"),
    summary: l(
      "Kriter 2'deki toplamın kendi basamak toplamına oranı 19 değerine eşitlenir.",
      "The ratio of the total in criterion 2 to its digit sum is set to 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Milan Sulc", "1993", "USA"),
    facts: criterionFacts("Toplam / basamak toplamı oranı", "= 19"),
    tags: ["ha-mim", "oran", "19"]
  },
  {
    id: "criterion-4-1",
    code: "4.1",
    groupId: "hamim",
    title: l("Anomali bölünmesi, Grup-1", "Anomaly split, group 1"),
    summary: l(
      "42. suredeki anomaliye göre ayrılan ilk grubun toplamı, kendi basamak toplamıyla 19 oranını verir.",
      "The first group formed by the anomaly in surah 42 yields a ratio of 19 against its own digit sum."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Milan Sulc", "1993", "USA"),
    facts: criterionFacts("Grup-1 oranı", "= 19"),
    tags: ["ha-mim", "anomali", "grup-1"]
  },
  {
    id: "criterion-4-2",
    code: "4.2",
    groupId: "hamim",
    title: l("Anomali bölünmesi, Grup-2", "Anomaly split, group 2"),
    summary: l(
      "Aynı bölünmenin ikinci grubunda da toplam ve basamak toplamı oranı 19'a eşitlenir.",
      "The second half of the same split also makes the total-to-digit-sum ratio equal 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Milan Sulc", "1993", "USA"),
    facts: criterionFacts("Grup-2 oranı", "= 19"),
    tags: ["ha-mim", "anomali", "grup-2"]
  },
  {
    id: "criterion-4-3",
    code: "4.3",
    groupId: "hamim",
    title: l("Yer değiştirmeli Grup-3 oranı", "Permutation group-3 ratio"),
    summary: l(
      "İlk üç ve son dört surenin yer değiştirdiği üçüncü grup yapısında oran yine 19 çıkar.",
      "In the third permutation pattern, where the first three and last four surahs shift positions, the ratio again becomes 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Milan Sulc", "1993", "USA"),
    facts: criterionFacts("Grup-3 oranı", "= 19"),
    tags: ["ha-mim", "permütasyon", "grup-3"]
  },
  {
    id: "criterion-4-4",
    code: "4.4",
    groupId: "hamim",
    title: l("Yer değiştirmeli Grup-4 oranı", "Permutation group-4 ratio"),
    summary: l(
      "Tamamlayıcı dördüncü grup diziliminde de toplam ve basamak toplamı oranı 19'dur.",
      "In the complementary fourth group arrangement, the ratio of total to digit sum is also 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Milan Sulc", "1993", "USA"),
    facts: criterionFacts("Grup-4 oranı", "= 19"),
    tags: ["ha-mim", "permütasyon", "grup-4"]
  },
  {
    id: "criterion-5",
    code: "5",
    groupId: "hamim",
    title: l("Ha-Mim değerlerinin satır grupları dizilimi", "Sequence of Ha-Mim row groups"),
    summary: l(
      "Ha-Mim tablosundaki satır gruplarının ardışık birleşimi 19 modunda doğrulanır.",
      "The consecutive sequence of row groups in the Ha-Mim table is verified modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "25.12.2019", "Türkiye/Yalova"),
    facts: criterionFacts("Satır grup dizilimi", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "satır grubu", "19"]
  },
  {
    id: "criterion-5-1",
    code: "5.1",
    groupId: "hamim",
    title: l("Seviye-1 kayan pencere dönüşümü", "Level-1 sliding-window transform"),
    summary: l(
      "Kriter 5 diziliminin sola kayan pencere basamak toplamlarıyla üretilen ilk türevi 19 modunda doğrulanır.",
      "The first derivative of criterion 5, built through sliding-window digit sums, is verified modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "17.12.2022", "Türkiye/Yalova"),
    facts: criterionFacts("Seviye-1 dönüşüm", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "kayan pencere", "seviye-1"]
  },
  {
    id: "criterion-5-2",
    code: "5.2",
    groupId: "hamim",
    title: l("Seviye-2 kayan pencere dönüşümü", "Level-2 sliding-window transform"),
    summary: l(
      "Seviye-1 çıktısına aynı dönüşüm yeniden uygulanır ve ikinci seviye sayı yine 19 modunda doğrulanır.",
      "The same transform is applied again to level 1, and the second-level number also verifies modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "27.06.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Seviye-2 dönüşüm", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "kayan pencere", "seviye-2"]
  },
  {
    id: "criterion-5-3",
    code: "5.3",
    groupId: "hamim",
    title: l("Seviye-3 kayan pencere dönüşümü", "Level-3 sliding-window transform"),
    summary: l(
      "Seviye-2 diziliminin yeni dönüşümü bu kez 7 modunda doğrulanır.",
      "A new transform of the level-2 sequence is verified modulo 7."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "27.06.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Seviye-3 dönüşüm", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "kayan pencere", "seviye-3"]
  },
  {
    id: "criterion-5-4",
    code: "5.4",
    groupId: "hamim",
    title: l("Seviye-4 kayan pencere dönüşümü", "Level-4 sliding-window transform"),
    summary: l(
      "Üçüncü seviye dizilimin bir sonraki dönüşümü tekrar 19 modunda doğrulanır.",
      "The next transform of the third-level sequence returns to a modulo-19 verification."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "27.06.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Seviye-4 dönüşüm", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "kayan pencere", "seviye-4"]
  },
  {
    id: "criterion-5-5",
    code: "5.5",
    groupId: "hamim",
    title: l("Digital root dizilimi ve türevleri", "Digital-root sequence and derivatives"),
    summary: l(
      "Kriter 5 sayılarının sayısal kökleri, ters dizilimleri, basamak toplamı ve pencere dönüşümü birlikte 7 ve 19 ile sınanır.",
      "The digital roots of criterion 5, along with their reverse sequence, digit sum, and window transform, are jointly tested against 7 and 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "21.07.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Digital root paketi", "19 ve 7 ile çoklu doğrulama"),
    tags: ["ha-mim", "digital root", "çoklu ölçüt"]
  },
  {
    id: "criterion-5-6",
    code: "5.6",
    groupId: "hamim",
    title: l("Asal çarpan toplamları dizilimi", "Prime-factor-sum sequence"),
    summary: l(
      "Kriter 5 sayılarına ait asal çarpan toplamları ile asal çarpan adetleri iki ayrı dizilim olarak 19 modunda doğrulanır.",
      "The prime-factor sums and prime-factor counts of criterion 5 are both written as sequences and verified modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "22.07.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Asal çarpan dizilimleri", "iki dizi de ≡ 0 (mod 19)"),
    tags: ["ha-mim", "asal çarpan", "19"]
  },
  {
    id: "criterion-5-7",
    code: "5.7",
    groupId: "hamim",
    title: l("Mersenne yakınlık dönüşümü", "Mersenne proximity transform"),
    summary: l(
      "Kriter 5 sayıları Mersenne yakınlık dönüşümünden geçirildiğinde hem ana dizi hem de pencere türevi 19 modunda doğrulanır.",
      "When criterion 5 is passed through a Mersenne proximity transform, both the main sequence and its window derivative verify modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "01.02.2026", "Senegal/Dakar"),
    facts: criterionFacts("Mersenne dönüşümü", "ana dizi ve türevi ≡ 0 (mod 19)"),
    tags: ["ha-mim", "mersenne", "19"]
  },
  {
    id: "criterion-5-8",
    code: "5.8",
    groupId: "hamim",
    title: l("Lucas yakınlık dönüşümü", "Lucas proximity transform"),
    summary: l(
      "Aynı veri kümesinin Lucas yakınlık dönüşümünde oluşan dizilim de 19 modunda doğrulanır.",
      "The sequence produced by the Lucas proximity transform of the same data set is also verified modulo 19."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "01.02.2026", "Senegal/Dakar"),
    facts: criterionFacts("Lucas dönüşümü", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "lucas", "19"]
  },
  {
    id: "criterion-6",
    code: "6",
    groupId: "hamim",
    title: l("Ha-Mim sütun gruplarının ardışık dizilimi", "Sequential order of Ha-Mim column groups"),
    summary: l(
      "Ha-Mim tablosunun sütun grupları doğal sırada birleştirildiğinde 7 modunda doğrulanır.",
      "When the column groups of the Ha-Mim table are concatenated in natural order, the result verifies modulo 7."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "25.12.2019", "Türkiye/Yalova"),
    facts: criterionFacts("Sütun grup dizilimi", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "sütun", "7"]
  },
  {
    id: "criterion-7",
    code: "7",
    groupId: "hamim",
    title: l("Satır gruplarının ters dizilimi", "Reverse order of row groups"),
    summary: l(
      "Satır gruplarının ters ardışık dizilimi bağımsız bir mesani katmanı olarak 7 modunda doğrulanır.",
      "The reverse sequential arrangement of row groups acts as an independent mesani layer and verifies modulo 7."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "25.12.2019", "Türkiye/Yalova"),
    facts: criterionFacts("Ters satır grup dizilimi", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "ters dizilim", "7"]
  },
  {
    id: "criterion-8",
    code: "8",
    groupId: "hamim",
    title: l("Ha-Mim satır toplamlarının ardışık dizilimi", "Sequential order of Ha-Mim row totals"),
    summary: l(
      "Ha-Mim tablosundaki satır toplamları doğal sırada yazıldığında 7 modunda doğrulanır.",
      "The row totals of the Ha-Mim table verify modulo 7 when written in natural order."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "04.11.2018", "Türkiye/Kastamonu/Hanönü"),
    facts: criterionFacts("Satır toplam dizilimi", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "satır toplamı", "7"]
  },
  {
    id: "criterion-8-1",
    code: "8.1",
    groupId: "hamim",
    title: l("Kriter 8 için asal çarpan adetleri", "Prime-factor counts for criterion 8"),
    summary: l(
      "Kriter 8 diziliminden türetilen asal çarpan sayı adetleri hem 19 hem 7 ile birlikte doğrulanır.",
      "The prime-factor counts derived from criterion 8 are verified against both 19 and 7."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "17.08.2025", "Türkiye/Yalova"),
    facts: criterionFacts("Asal çarpan adetleri", "≡ 0 (mod 19) ve ≡ 0 (mod 7)"),
    tags: ["ha-mim", "asal çarpan", "7", "19"]
  },
  {
    id: "criterion-8-2",
    code: "8.2",
    groupId: "hamim",
    title: l("Satır toplamlarının basamak toplamı", "Digit sum of row totals"),
    summary: l(
      "Satır toplamlarının basamak toplamı, Kriter 2'nin ikinci bir yankısı olarak 7 modunda doğrulanır.",
      "The digit sum of the row totals acts as a second echo of criterion 2 and is verified modulo 7."
    ),
    sourceLabel: sourceHaMim1.label,
    sourceUrl: sourceHaMim1.url,
    discovery: discovery("Mustafa Kurdoğlu", "27.06.2020", "Senegal/Dakar"),
    facts: criterionFacts("Basamak toplamı", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "basamak toplamı", "7"]
  },
  {
    id: "criterion-9",
    code: "9",
    groupId: "hamim",
    title: l("Tablo sütunlarının ardışık dizilimi", "Sequential order of table columns"),
    summary: l(
      "Kodlama tablosunun sütunları ardışık olarak yazıldığında 7 modunda doğrulanır.",
      "The columns of the coding table verify modulo 7 when written as one consecutive sequence."
    ),
    sourceLabel: sourceHaMim4_2.label,
    sourceUrl: sourceHaMim4_2.url,
    discovery: discovery("Kaan Gümüşay", "16.01.2022", "Türkiye/İstanbul"),
    facts: criterionFacts("Sütun dizilimi", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "tablo", "sütun", "7"]
  },
  {
    id: "criterion-9-1",
    code: "9.1",
    groupId: "hamim",
    title: l("Tablo satırlarının ardışık dizilimi", "Sequential order of table rows"),
    summary: l(
      "Aynı tablonun satırları bir bütün halinde yazıldığında da 7 modunda doğrulanır.",
      "The same table also verifies modulo 7 when its rows are written as one combined sequence."
    ),
    sourceLabel: sourceHaMim4_2.label,
    sourceUrl: sourceHaMim4_2.url,
    discovery: discovery("Kaan Gümüşay", "16.01.2022", "Türkiye/İstanbul"),
    facts: criterionFacts("Satır dizilimi", "≡ 0 (mod 7)"),
    tags: ["ha-mim", "tablo", "satır", "7"]
  },
  {
    id: "criterion-9-2",
    code: "9.2",
    groupId: "hamim",
    title: l("Tablo satır diziliminin basamak toplamı", "Digit sum of the row sequence"),
    summary: l(
      "Tablodaki satır diziliminin basamak toplamı bu kez 19 modunda doğrulanır.",
      "The digit sum of the table's row sequence is verified modulo 19."
    ),
    sourceLabel: sourceHaMim4_2.label,
    sourceUrl: sourceHaMim4_2.url,
    discovery: discovery("Kaan Gümüşay", "16.01.2022", "Türkiye/İstanbul"),
    facts: criterionFacts("Satır dizilimi basamak toplamı", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "satır", "basamak toplamı", "19"]
  },
  {
    id: "criterion-10",
    code: "10",
    groupId: "hamim",
    title: l("Satır toplamlarının mod 7 kalanları toplamı", "Sum of the mod-7 remainders of row totals"),
    summary: l(
      "Satır toplamlarının 7 ile bölümünden kalanlar toplandığında 19 sabiti elde edilir.",
      "When the remainders of the row totals modulo 7 are summed, the invariant 19 is obtained."
    ),
    sourceLabel: sourceHaMim4_2.label,
    sourceUrl: sourceHaMim4_2.url,
    discovery: discovery("Mustafa Kurdoğlu", "04.11.2018", "Türkiye/Kastamonu/Hanönü"),
    facts: criterionFacts("Kalan toplamı", "= 19"),
    tags: ["ha-mim", "mod 7", "19"]
  },
  {
    id: "criterion-11",
    code: "11",
    groupId: "hamim",
    title: l("Ebced değerleri ve toplamlarının ardışık dizilimi", "Sequential order of abjad values and totals"),
    summary: l(
      "Ha-Mim harflerinin Ebced değerleri ile toplam sayıları birlikte ardışık bir kod oluşturur; bu kod hem 7 hem 19 ile doğrulanır.",
      "The abjad values of the Ha-Mim letters and their totals form a joint sequence that verifies against both 7 and 19."
    ),
    sourceLabel: sourceHaMimDemo.label,
    sourceUrl: sourceHaMimDemo.url,
    discovery: discovery("Mustafa Kurdoğlu", "27.06.2020", "Senegal/Dakar"),
    facts: criterionFacts("Ebced + toplam dizilimi", "≡ 0 (mod 7) ve ≡ 0 (mod 19)"),
    tags: ["ha-mim", "ebced", "7", "19"]
  },
  {
    id: "criterion-12",
    code: "12",
    groupId: "hamim",
    title: l("Ha-Mim Ebced dizilimi", "Ha-Mim abjad sequence"),
    summary: l(
      "Kodlama harflerinin sayısal değerleri, sure içindeki harf sırasına göre yazıldığında büyük dizi 19 modunda doğrulanır.",
      "The numerical values of the coding letters, written according to their position inside the surahs, yield a large sequence verified modulo 19."
    ),
    sourceLabel: sourceHaMim4_1.label,
    sourceUrl: sourceHaMim4_1.url,
    discovery: discovery("Mustafa Kurdoğlu", "14.11.2018", "Türkiye/Kastamonu/Hanönü"),
    facts: criterionFacts("Harf sırasına göre Ebced dizilimi", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "ebced", "19"]
  },
  {
    id: "criterion-13",
    code: "13",
    groupId: "hamim",
    title: l("Ha-Mim ve Ayn-Sin-Kaf birleşik Ebced dizilimi", "Combined Ha-Mim and Ayn-Sin-Kaf abjad sequence"),
    summary: l(
      "42. suredeki ek mukattaa harfleri de dâhil edilince oluşan birleşik büyük sayı 19 modunda doğrulanır ve 7 ile bölümünde 2 kalanını verir.",
      "When the extra muqattaʿa letters in surah 42 are included, the combined large number verifies modulo 19 and leaves remainder 2 modulo 7."
    ),
    sourceLabel: sourceHaMim4_1.label,
    sourceUrl: sourceHaMim4_1.url,
    discovery: discovery("Mustafa Kurdoğlu", "24.12.2018", "Türkiye/Yalova"),
    facts: criterionFacts("Birleşik Ebced dizilimi", "≡ 0 (mod 19), mod 7 = 2"),
    tags: ["ha-mim", "ayn-sin-kaf", "19", "7"]
  },
  {
    id: "criterion-14",
    code: "14",
    groupId: "hamim",
    title: l("Allah lafzı geçen ayetlerdeki Ebced dizilimi", "Abjad sequence in verses containing the divine name"),
    summary: l(
      "Allah lafzı geçen Ha-Mim ayetlerindeki kodlama harflerinin Ebced değerleri bir araya getirildiğinde yeni büyük sayı 19 modunda doğrulanır.",
      "When the abjad values of the coding letters in Ha-Mim verses containing the divine name are concatenated, the resulting large number verifies modulo 19."
    ),
    sourceLabel: sourceHaMim4_1.label,
    sourceUrl: sourceHaMim4_1.url,
    discovery: discovery("Mustafa Kurdoğlu", "24.12.2018", "Türkiye/Yalova"),
    facts: criterionFacts("Allah lafzı eksenli Ebced dizilimi", "≡ 0 (mod 19)"),
    tags: ["ha-mim", "allah lafzı", "ebced", "19"]
  }
];

const extendedHaMimCriteria: CriterionEntry[] = [
  referenceCriterion({
    id: "criterion-15",
    code: "15",
    groupId: "hamim",
    title: "Ayet bazında Ebced toplamlarının ardışık dizilimi",
    summary:
      "Yedi Ha-Mim suresindeki kodlama harflerinin ayet bazındaki Ebced toplamları doğal sırada birleştirildiğinde oluşan sayı hem 7 hem 19 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "24.12.2018", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7) ve ≡ 0 (mod 19)",
    tags: ["ha-mim", "ayet", "ebced", "7", "19"]
  }),
  referenceCriterion({
    id: "criterion-16",
    code: "16",
    groupId: "hamim",
    title: "(Ayet sayısı + harf sayısı + Ebced toplamı) dizilimi",
    summary:
      "Her ayet için ayet numarası, kodlama harf sayısı ve Ebced toplamından kurulan ayet bazlı kodlama sayıları doğal sırada yazıldığında 19 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "25.12.2019", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ayet", "toplam", "19"]
  }),
  referenceCriterion({
    id: "criterion-17",
    code: "17",
    groupId: "hamim",
    title: "Ayet bazlı toplamların 1. kademe mutlak farkları",
    summary:
      "16. kriterde kurulan ayet bazlı kodlama sayılarının birinci kademe mutlak fark dizilimi 19 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "10.04.2021", "Senegal/Dakar"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "mutlak fark", "kademe-1", "19"]
  }),
  referenceCriterion({
    id: "criterion-18",
    code: "18",
    groupId: "hamim",
    title: "Ayet bazlı toplamların 2. kademe mutlak farkları",
    summary:
      "17. kriterin mesanisi olan ikinci kademe mutlak fark dizilimi bu kez 7 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "10.04.2021", "Senegal/Dakar"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "mutlak fark", "kademe-2", "7"]
  }),
  referenceCriterion({
    id: "criterion-19-a",
    code: "19.A",
    groupId: "hamim",
    title: "(Ayet sayısı x harf sayısı x Ebced toplamı) çarpım dizilimi",
    summary:
      "Ayet bazında ayet sayısı, kodlama harf sayısı ve Ebced toplamı çarpımları doğal sırada birleştirildiğinde 7 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "06.12.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "çarpım", "7"]
  }),
  referenceCriterion({
    id: "criterion-19-b",
    code: "19.B",
    groupId: "hamim",
    title: "(Ayet sayısı x genel toplam) çarpım dizilimi",
    summary:
      "Her ayette ayet numarası ile genel toplam çarpımlarından türetilen kodlama dizisi 19 modunda doğrulanır.",
    source: sourceHaMim4_1,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "06.12.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "çarpım", "19"]
  }),
  referenceCriterion({
    id: "criterion-19-1",
    code: "19.1",
    groupId: "hamim",
    title: "Ebced toplamları ve birleşik ayet toplamlarının düz dizilimi",
    summary:
      "Ayet bazında Ebced toplamları ile birleşik ayet toplamları birlikte düz sırada yazıldığında oluşan kodlama 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "25.05.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "ebced", "düz dizilim", "7"]
  }),
  referenceCriterion({
    id: "criterion-19-2",
    code: "19.2",
    groupId: "hamim",
    title: "Birleşik ayet toplamları ve Ebced toplamlarının düz dizilimi",
    summary:
      "19.1'deki iki sayı kümesi bu kez ters sırayla değil, diğer kombinasyonda doğal sırada birleştirilir ve 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "25.05.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ebced", "düz dizilim", "19"]
  }),
  referenceCriterion({
    id: "criterion-19-3",
    code: "19.3",
    groupId: "hamim",
    title: "Ebced toplamları ve birleşik ayet toplamlarının ters dizilimi",
    summary:
      "19.1 yapısının ters ardışık biçimi 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "25.05.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ebced", "ters dizilim", "19"]
  }),
  referenceCriterion({
    id: "criterion-19-4",
    code: "19.4",
    groupId: "hamim",
    title: "Birleşik ayet toplamları ve Ebced toplamlarının ters dizilimi",
    summary:
      "19.2 yapısının ters ardışık biçimi de 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "25.05.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ebced", "ters dizilim", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-1",
    code: "20.1",
    groupId: "hamim",
    title: "mod 7 ayetlerinde birleşik toplam dizilimi",
    summary:
      "Ha-Mim surelerinde mod 7 denkliğini sağlayan ayetlerin birleşik ayet toplamları doğal sırada yazıldığında 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "20.03.2019", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "mod 7 ayetleri", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-2",
    code: "20.2",
    groupId: "hamim",
    title: "mod 19 ayetlerinde birleşik toplam dizilimi",
    summary:
      "Ha-Mim surelerinde mod 19 denkliğini sağlayan ayetlerin birleşik ayet toplamları doğal sırada yazıldığında yine 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "20.03.2019", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "mod 19 ayetleri", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-3",
    code: "20.3",
    groupId: "hamim",
    title: "Seçili mod 19 ayetlerinde ayet numarası dizilimi",
    summary:
      "Belirli mod 19 ayet alt kümesinde, ayet numaralarının doğal sıralı dizilimi 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "16.01.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ayet numarası", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-4",
    code: "20.4",
    groupId: "hamim",
    title: "Seçili mod 19 ayetlerinde sure ve ayet basamak toplamları",
    summary:
      "Aynı alt kümede sure ve ayet numaralarının basamak toplamları topluca 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "16.01.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "basamak toplamı", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-5",
    code: "20.5",
    groupId: "hamim",
    title: "Seçili mod 19 ayetlerinde Ebced dizilimi",
    summary:
      "Belirli mod 19 ayet alt kümesinde kodlama harflerinin Ebced değerleri doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "16.01.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ebced", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-6",
    code: "20.6",
    groupId: "hamim",
    title: "42. surede Ayn-Sin-Kaf üçlüsünü birlikte taşıyan ayetler",
    summary:
      "42. Şûra suresinde üç mukattaa harfini birlikte taşıyan ayetlerin sayısı 19 modunda; ayet numaraları dizilimi ise 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("İsmail Turan", "24.03.2023", "Türkiye/Van"),
    measure: "ayıt sayısı ≡ 0 (mod 19), dizilim ≡ 0 (mod 7)",
    tags: ["ha-mim", "ayn-sin-kaf", "7", "19"]
  }),
  referenceCriterion({
    id: "criterion-20-7",
    code: "20.7",
    groupId: "hamim",
    title: "Numaralı ve numarasız ayetlerde çift Ha-Mim geçişleri",
    summary:
      "Numaralı ayetlerde iki Ha-Mim harfini birlikte taşıyan ayet sayısı, ayet numaraları toplamı ve sure numaraları toplamı birlikte 19 ve 7 ile sınanır; numarasız ayetlerdeki karşılığı da ayrıca doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("İsmail Turan", "24.03.2023", "Türkiye/Van"),
    measure: "çoklu 19/7 koşulu",
    tags: ["ha-mim", "numaralı", "numarasız", "çoklu ölçüt"]
  }),
  referenceCriterion({
    id: "criterion-21",
    code: "21",
    groupId: "hamim",
    title: "Seçili ayetlerde Ebced dizilimi ve birleşik toplamlar",
    summary:
      "Belirli ayet alt kümesindeki harf sırası Ebced dizilimi ile birleşik ayet toplamları birlikte yazıldığında 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "08.12.2020", "Senegal/Dakar"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ebced", "birleşik kodlama", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-1",
    code: "21.1",
    groupId: "hamim",
    title: "Sure no + ayet no + harf + Ebced + kelime toplamı",
    summary:
      "Ayet bazında sure no, ayet no, kodlama harf sayısı, Ebced toplamı ve kelime sayısını birleştiren büyük dizilim hem 19 hem 7 ile doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19) ve ≡ 0 (mod 7)",
    tags: ["ha-mim", "ayet bazlı", "kelime", "7", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-2",
    code: "21.2",
    groupId: "hamim",
    title: "Kelime + harf + Ebced toplamı",
    summary:
      "Ayet bazında kelime sayısı, harf sayısı ve Ebced toplamlarının birleşik dizilimi 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "kelime", "harf", "ebced", "7"]
  }),
  referenceCriterion({
    id: "criterion-21-3",
    code: "21.3",
    groupId: "hamim",
    title: "Sure no + ayet no + kodlama harfi + kelime + harf toplamı",
    summary:
      "Ayet bazında beşli yapının doğal sıralı dizilimi 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "ayet bazlı", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-4",
    code: "21.4",
    groupId: "hamim",
    title: "Sure no, ayet no, harf sayısı ve Ebced toplamı",
    summary:
      "Ayet bazında dört öğeli dizilim 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "ayet bazlı", "7"]
  }),
  referenceCriterion({
    id: "criterion-21-5",
    code: "21.5",
    groupId: "hamim",
    title: "Sure no, ayet no, kodlama, kelime ve harf çoklu dizilimi",
    summary:
      "Ayet bazında altı öğeli genişletilmiş kodlama dizilimi 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "genişletilmiş", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-6",
    code: "21.6",
    groupId: "hamim",
    title: "Sure no, ayet no, kelime, harf, Ebced ve kodlama birleşimi",
    summary:
      "Ayet bazında yedi öğeli en geniş dizilimlerden biri 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "13.12.2022", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "genişletilmiş", "7"]
  }),
  referenceCriterion({
    id: "criterion-21-7",
    code: "21.7",
    groupId: "hamim",
    title: "Kelimelerin harf sayılarının doğal dizilimi",
    summary:
      "Ha-Mim surelerindeki kelimelerin harf sayıları doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "03.02.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "kelime harf sayısı", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-8",
    code: "21.8",
    groupId: "hamim",
    title: "Kelimelerin harf sayılarının ters dizilimi",
    summary:
      "Aynı kelime-harf diziliminin ters ardışık biçimi 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "03.02.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "kelime harf sayısı", "ters", "7"]
  }),
  referenceCriterion({
    id: "criterion-21-9",
    code: "21.9",
    groupId: "hamim",
    title: "Sure no, sure kelime endeksi ve Ebced dizilimi",
    summary:
      "Sure no ile sure kelime endeksi ve Ebced değerlerinden oluşan ardışık dizilim 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "04.02.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "kelime endeksi", "ebced", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-10",
    code: "21.10",
    groupId: "hamim",
    title: "Sure no, sure kelime endeksi ve Ebced diziliminin tersi",
    summary:
      "21.9 diziliminin ters ardışık biçimi de 19 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "04.02.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 19)",
    tags: ["ha-mim", "kelime endeksi", "ebced", "ters", "19"]
  }),
  referenceCriterion({
    id: "criterion-21-11",
    code: "21.11",
    groupId: "hamim",
    title: "Sure no, ayet no, ayet kelime endeksi ve Ebced dizilimi",
    summary:
      "Sure no, ayet no, ayet kelime endeksi ve Ebced değerlerinden oluşan ardışık dizilim 7 modunda doğrulanır.",
    source: sourceHaMim5_3,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "04.02.2023", "Türkiye/Yalova"),
    measure: "≡ 0 (mod 7)",
    tags: ["ha-mim", "ayet kelime endeksi", "ebced", "7"]
  })
];

const supplementaryFihristCriteria: CriterionEntry[] = [
  referenceCriterion({
    id: "criterion-26",
    code: "26",
    groupId: "surah-ayah-19",
    title: "Çift ayet ve tek ayet grup toplamlarının ardışık dizilimi",
    summary:
      "Yeni ayet sayıları içindeki çift ayetli sure ve ayet toplamları ile tek ayetli sure ve ayet toplamlarının ardışık dizilimi 7 modunda doğrulanır.",
    source: sourceFihrist6,
    discoveryInfo: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye"),
    measure: "≡ 0 (mod 7)",
    tags: ["fihrist", "çift-tek", "7"]
  }),
  referenceCriterion({
    id: "criterion-31-3",
    code: "31.3",
    groupId: "special",
    title: "1 ve 9. sure anomalileri ile son iki ayet listesi",
    summary:
      "1. surenin numaralı Besmelesi ve 9. surenin Besmelesiz yapısı üzerinden kurulan özel listede ayet adedi, ayet indeksi alt toplamı ve sure/ayet/indeks korelasyonları 19 ile doğrulanır; sure numaralarının düz ve ters dizilimleri de ayrıca 19 modunda sınanır.",
    source: sourceFihrist6,
    discoveryInfo: discovery("İmran Akdemir ve Bülend Sungur", "09.11.2022", "İstanbul"),
    measure: "çoklu 19 koşulu",
    tags: ["özel", "1 ve 9", "ayet indeksi", "19"]
  })
];

const almsCriteria: CriterionEntry[] = [
  {
    id: "criterion-elms-1",
    code: "ELMS-1",
    groupId: "alms",
    title: l("A'râf metnindeki doğal Ebced akışının büyük dizilimi"),
    summary: l(
      "A'râf suresinde Elif, Lam, Mim ve Sad harflerinin metindeki doğal sırası Ebced değerleriyle ardışık yazıldığında 7931 basamaklı büyük bir sayı elde edilir; bu sayı 19 modunda doğrulanır.",
      "When the Alif, Lam, Mim, and Sad letters in Surah Al-A'raf are written in their natural textual order using their abjad values, a 7931-digit number is obtained; this number verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "09.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Elif"), value: l(String(arafAlmsNatural.counts.elif)) },
      { label: l("Lam"), value: l(String(arafAlmsNatural.counts.lam)) },
      { label: l("Mim"), value: l(String(arafAlmsNatural.counts.mim)) },
      { label: l("Sad"), value: l(String(arafAlmsNatural.counts.sad)) },
      { label: l("Basamak uzunluğu"), value: l(String(arafAlmsNatural.sequence.length)) },
      { label: l("Ölçüt"), value: l("≡ 0 (mod 19)") }
    ],
    tests: [
      {
        id: "criterion-elms-1-sequence",
        label: l("Doğal Ebced akışı"),
        sequence: arafAlmsNatural.sequence,
        mods: [19],
        note: l(
          "Bu dizilim, numarasız Besmele ile birlikte A'râf suresi metnindeki Elif, Lam, Mim ve Sad harflerinin doğal sıradaki Ebced karşılıklarından oluşur.",
          "This sequence is formed from the abjad equivalents of the Alif, Lam, Mim, and Sad letters in the natural order of Surah Al-A'raf, together with the unnumbered basmala."
        )
      }
    ],
    tags: ["elif-lam-mim-sad", "a'raf", "huruf-u mukattaa", "7931", "19"]
  },
  {
    id: "criterion-elms-2",
    code: "ELMS-2",
    groupId: "alms",
    title: l("Harf sayısı ile toplam Ebced birleşimi"),
    summary: l(
      "Elif-Lam-Mim-Sad grubundaki harf sayısı 4, toplam Ebced değeri ise 161'dir. Bu iki sayı doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
      "The letter count in the Alif-Lam-Mim-Sad group is 4 and the total abjad value is 161. When these are concatenated in natural order, the result verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Harf sayısı"), value: l("4") },
      { label: l("Toplam Ebced"), value: l("161") }
    ],
    tests: [
      {
        id: "criterion-elms-2-sequence",
        label: l("4 + 161"),
        sequence: "4161",
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "harf sayısı", "toplam ebced", "19"]
  },
  {
    id: "criterion-elms-3",
    code: "ELMS-3",
    groupId: "alms",
    title: l("Kümülatif Ebced dizilimi"),
    summary: l(
      "Elif=1, Lam=30, Mim=40 ve Sad=90 değerlerinin kümülatif toplamları 1, 31, 71 ve 161 olarak ilerler. Bu dizilim ardışık yazıldığında 19 modunda doğrulanır.",
      "The cumulative sums of Alif=1, Lam=30, Mim=40, and Sad=90 proceed as 1, 31, 71, and 161. When written consecutively, this sequence verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    tests: [
      {
        id: "criterion-elms-3-sequence",
        label: l("1, 31, 71, 161"),
        sequence: "1 31 71 161",
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "kümülatif", "ebced", "19"]
  },
  {
    id: "criterion-elms-4",
    code: "ELMS-4",
    groupId: "alms",
    title: l("Ebced değerlerinin basamak toplamları"),
    summary: l(
      "1, 30, 40 ve 90 Ebced değerlerinin basamak toplamları sırasıyla 1, 3, 4 ve 9 eder. Bu yeni dizilim ardışık yazıldığında 19 modunda doğrulanır.",
      "The digit sums of the abjad values 1, 30, 40, and 90 are 1, 3, 4, and 9 respectively. When this new sequence is written consecutively, it verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    tests: [
      {
        id: "criterion-elms-4-sequence",
        label: l("1, 3, 4, 9"),
        sequence: "1 3 4 9",
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "basamak toplamı", "ebced", "19"]
  },
  {
    id: "criterion-elms-5",
    code: "ELMS-5",
    groupId: "alms",
    title: l("Sure no + ayet no + harf sayısı + Ebced dizilimi"),
    summary: l(
      "A'râf suresi 7:1 bağlamında sure no 7, ayet no 1, harf sayısı 4 ve Ebced dizilimi 1-30-40-90 doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
      "Within the Al-A'raf 7:1 context, when surah number 7, verse number 1, letter count 4, and the abjad sequence 1-30-40-90 are concatenated in natural order, the result verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Sure no"), value: l("7") },
      { label: l("Ayet no"), value: l("1") },
      { label: l("Harf sayısı"), value: l("4") }
    ],
    tests: [
      {
        id: "criterion-elms-5-sequence",
        label: l(
          "Sure 7 / Ayet 1 / Harf 4 / Ebced 1-30-40-90",
          "Surah 7 / Verse 1 / Letters 4 / Abjad 1-30-40-90"
        ),
        sequence: "7 1 4 1 30 40 90",
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "a'raf", "7:1", "ebced", "19"]
  },
  {
    id: "criterion-elms-6",
    code: "ELMS-6",
    groupId: "alms",
    title: l("A'râf içi harf toplamları dizilimi"),
    summary: l(
      "A'râf suresinde, numarasız Besmele dahil Elif, Lam, Mim ve Sad harflerinin toplam tekrar sayıları doğal sırada yazıldığında 19 modunda doğrulanır.",
      "In Surah Al-A'raf, when the total occurrence counts of Alif, Lam, Mim, and Sad are written in natural order, including the unnumbered basmala, the sequence verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Toplam harf sayısı"), value: l(String(arafAlmsCountTotal)) },
      { label: l("Ölçüt"), value: l("≡ 0 (mod 19)") }
    ],
    tests: [
      {
        id: "criterion-elms-6-sequence",
        label: l("Elif / Lam / Mim / Sad toplamları"),
        sequence: arafAlmsCountSequence,
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "a'raf", "harf toplamı", "19"]
  },
  {
    id: "criterion-elms-7",
    code: "ELMS-7",
    groupId: "alms",
    title: l("Basamak uzunluğu ile toplam harf sayısı birleşimi"),
    summary: l(
      "Büyük doğal Ebced diziliminin basamak uzunluğu 7931 ile, A'râf metninde numarasız Besmele dahil Elif, Lam, Mim ve Sad harflerinin toplam tekrar sayısı olan 5139 doğal sırada birleştirildiğinde sonuç 19 modunda doğrulanır.",
      "When the digit length 7931 of the large natural abjad sequence is concatenated in natural order with 5139, the total occurrence count of Alif, Lam, Mim, and Sad in the Al-A'raf text including the unnumbered basmala, the result verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l(String(arafAlmsNatural.sequence.length)) },
      { label: l("Elif + Lam + Mim + Sad toplamı"), value: l(String(arafAlmsCountTotal)) }
    ],
    tests: [
      {
        id: "criterion-elms-7-sequence",
        label: l(
          "7931 / Elif+Lam+Mim+Sad toplamı 5139",
          "7931 / Alif+Lam+Mim+Sad total 5139"
        ),
        sequence: `${arafAlmsNatural.sequence.length} ${arafAlmsCountTotal}`,
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "basamak uzunluğu", "harf toplamı", "19"]
  },
  {
    id: "criterion-elms-8",
    code: "ELMS-8",
    groupId: "alms",
    title: l("Kümülatif Ebced ile harf toplamlarının paralel dizilimi"),
    summary: l(
      "Elif-Lam-Mim-Sad grubunun kümülatif Ebced toplamları ile A'râf içindeki toplam tekrar sayıları doğal sıra korunarak eşleştirildiğinde ortaya çıkan dizilim 7 modunda doğrulanır.",
      "When the cumulative abjad totals of the Alif-Lam-Mim-Sad group are paired with their total occurrences in Al-A'raf while preserving natural order, the resulting sequence verifies modulo 7."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    tests: [
      {
        id: "criterion-elms-8-sequence",
        label: l("Kümülatif Ebced / harf toplamları"),
        sequence: arafAlmsCumulativeEbcedWithCounts,
        mods: [7]
      }
    ],
    tags: ["elif-lam-mim-sad", "kümülatif", "harf toplamı", "7"]
  },
  {
    id: "criterion-elms-9",
    code: "LAM-1",
    groupId: "alms",
    title: l("Lam harfinin doğal Ebced akışı"),
    summary: l(
      "A'râf metninde, numarasız Besmele dahil yalnız Lam harfinin doğal sıradaki Ebced karşılığı yazıldığında oluşan büyük dizi hem 19 hem 7 modunda doğrulanır.",
      "In the Al-A'raf text, when only the abjad value of Lam is written in natural order, including the unnumbered basmala, the resulting large sequence verifies modulo both 19 and 7."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Lam tekrar sayısı"), value: l(String(arafAlmsNatural.counts.lam)) },
      { label: l("Basamak uzunluğu"), value: l(String(arafLamNaturalSequence.length)) }
    ],
    tests: [
      {
        id: "criterion-elms-9-sequence",
        label: l("Lam doğal Ebced akışı"),
        sequence: arafLamNaturalSequence,
        mods: [19, 7]
      }
    ],
    tags: ["elif-lam-mim-sad", "lam", "ebced", "19", "7"]
  },
  {
    id: "criterion-elms-10",
    code: "LAM-2",
    groupId: "alms",
    title: l("Lam Ebced değeri ile toplam tekrar sayısı"),
    summary: l(
      "Lam harfinin Ebced değeri 30 ile, A'râf metninde numarasız Besmele dahil toplam tekrar sayısı 1530 doğal sırada birleştirildiğinde sonuç 19 modunda doğrulanır.",
      "When Lam's abjad value 30 is concatenated in natural order with its total occurrence count 1530 in the Al-A'raf text including the unnumbered basmala, the result verifies modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Lam Ebced değeri"), value: l("30") },
      { label: l("Lam toplamı"), value: l(String(arafAlmsNatural.counts.lam)) }
    ],
    tests: [
      {
        id: "criterion-elms-10-sequence",
        label: l("Lam 30 / toplam 1530"),
        sequence: `30 ${arafAlmsNatural.counts.lam}`,
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "lam", "toplam", "19"]
  },
  {
    id: "criterion-elms-11",
    code: "LAM-3",
    groupId: "alms",
    title: l("Lam harfinin 19 kez geçtiği ayetler"),
    summary: l(
      "1924 Kahire mushafı tabanı ve projedeki normalizasyon kuralı altında, A'râf suresinde Lam harfinin tam 19 kez geçtiği üç ayet vardır: 32, 43 ve 150. Ayet numaraları ile 19 sayısı doğal sırada birlikte yazıldığında iki yönlü dizilim de 19 modunda doğrulanır.",
      "Under the 1924 Cairo muṣḥaf base text and the normalization rule used in this project, there are three verses in Surah Al-A'raf where the Lam letter occurs exactly 19 times: 32, 43, and 150. When the verse numbers are written together with 19 in natural order, both directional sequences verify modulo 19."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Ayetler"), value: l(sequenceFrom(arafLam19Verses)) },
      { label: l("Kayıt adedi"), value: l(String(arafLam19Verses.length)) },
      { label: l("Lam tekrar sayısı"), value: l("19") }
    ],
    tests: [
      {
        id: "criterion-elms-11-sequence-a",
        label: l("Ayet no / 19"),
        sequence: arafLam19VerseThenCountSequence,
        mods: [19]
      },
      {
        id: "criterion-elms-11-sequence-b",
        label: l("19 / ayet no"),
        sequence: arafLam19CountThenVerseSequence,
        mods: [19]
      }
    ],
    tags: ["elif-lam-mim-sad", "lam", "ayet", "19"]
  },
  {
    id: "criterion-elms-12",
    code: "LAM-4",
    groupId: "alms",
    title: l("Lam ayet sayımlarının kümülatif dizilimi"),
    summary: l(
      "Numarasız Besmele başlangıç satırı olarak dahil edilip Lam harfinin ayet bazlı tekrar sayıları kümülatif toplandığında oluşan ardışık dizilim 7 modunda doğrulanır.",
      "When the unnumbered basmala is included as the opening row and the verse-level occurrence counts of Lam are cumulatively summed, the resulting sequential string verifies modulo 7."
    ),
    sourceLabel: sourceWithin19Research.label,
    sourceUrl: sourceWithin19Research.url,
    discovery: discovery("Ahmet Düzduran", "10.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("Besmele Lam sayısı"), value: l(String(basmalaLamCount)) },
      { label: l("Satır adedi"), value: l(String(arafLamPerVerseCountsWithBasmala.length)) }
    ],
    tests: [
      {
        id: "criterion-elms-12-sequence",
        label: l("Lam kümülatif ayet toplamları"),
        sequence: arafLamCumulativeCountSequence,
        mods: [7]
      }
    ],
    tags: ["elif-lam-mim-sad", "lam", "kümülatif", "7"]
  }
];

export const criteriaArchive: CriterionEntry[] = [
  ...almsCriteria,
  ...earlyHaMimCriteria,
  ...extendedHaMimCriteria,
  ...supplementaryFihristCriteria,
  {
    id: "criterion-22",
    code: "22",
    groupId: "hamim",
    title: l("Ha-Mim surelerindeki toplam satır sayılarının ardışık dizilimi"),
    summary: l(
      "40-46 arası Ha-Mim surelerinin toplam satır sayıları 19 modunda birlikte doğrulanır.",
      "The total line counts of the Ha-Mim surahs 40-46 are jointly verified modulo 19."
    ),
    sourceLabel: sourceHaMim5_3.label,
    sourceUrl: sourceHaMim5_3.url,
    discovery: discovery("Mustafa Kurdoğlu", "18.10.2018", "Türkiye/Yalova"),
    facts: [
      { label: l("Sureler"), value: l("40-41-42-43-44-45-46") },
      { label: l("Toplam satır"), value: l(sequenceFrom(haMimLineCounts)) },
      { label: l("Sonuç"), value: l("≡ 0 (mod 19)") }
    ],
    tests: [
      {
        id: "criterion-22-lines",
        label: l("Toplam satır dizilimi"),
        sequence: sequenceFrom(haMimLineCounts),
        mods: [19],
        note: l("Boşluklar kaldırıldığında birleşik sayı 19'a tam bölünür.")
      }
    ],
    tags: ["ha-mim", "satır", "19"]
  },
  {
    id: "criterion-23",
    code: "23",
    groupId: "fihrist",
    title: l("Çift ve tek sayı adetleri simetrisi"),
    summary: l(
      "Sure ve ayet sayılarının çift-tek dağılımı 30-27-57 dengesi üretir.",
      "The parity distribution of surah and verse counts produces a 30-27-57 balance."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kourosh Jamneshan", undefined, "İran"),
    facts: [
      { label: l("Çift-Çift / Tek-Çift"), value: l(`${parityGroups.ee.length} = ${parityGroups.oe.length}`) },
      { label: l("Tek-Tek / Çift-Tek"), value: l(`${parityGroups.oo.length} = ${parityGroups.eo.length}`) },
      { label: l("Toplam"), value: l(`${parityGroups.ee.length + parityGroups.oo.length} = ${parityGroups.eo.length + parityGroups.oe.length}`) }
    ],
    tags: ["simetri", "çift", "tek"]
  },
  {
    id: "criterion-24",
    code: "24",
    groupId: "fihrist",
    title: l("Çift ve tek grup toplamları simetrisi"),
    summary: l(
      "Çift-çift ve tek-tek ayet toplamları ile çapraz sure toplamları aynı genel toplamları verir.",
      "Even-even and odd-odd verse totals, together with the crossed surah totals, land on the same global sums."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kourosh Jamneshan", undefined, "İran"),
    facts: [
      { label: l("Ayet genel toplamı"), value: l(String(totalAyahSum)) },
      { label: l("Sure genel toplamı"), value: l(String(totalSurahSum)) },
      {
        label: l("Ayet tarafı"),
        value: l(
          `${parityGroupSums.ee.ayah + parityGroupSums.oo.ayah} + ${parityGroupSums.eo.ayah + parityGroupSums.oe.ayah} = ${totalAyahSum}`
        )
      },
      {
        label: l("Sure tarafı"),
        value: l(
          `${parityGroupSums.ee.surah + parityGroupSums.oo.surah} + ${parityGroupSums.eo.surah + parityGroupSums.oe.surah} = ${totalSurahSum}`
        )
      }
    ],
    tags: ["simetri", "toplam"]
  },
  {
    id: "criterion-25-1",
    code: "25.1",
    groupId: "fihrist",
    title: l("Çift/Tek grup toplamlarının ardışık dizilimi"),
    summary: l(
      "Dört parity grubunun sure ve ayet toplamları ardışık yazıldığında 19 modunda doğrulanır.",
      "When the surah and verse totals of the four parity groups are concatenated, the result is verified modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    facts: [
      {
        label: l("Dizilim"),
        value: l(
          sequenceFrom([
            parityGroupSums.ee.surah,
            parityGroupSums.ee.ayah,
            parityGroupSums.oo.surah,
            parityGroupSums.oo.ayah,
            parityGroupSums.eo.surah,
            parityGroupSums.eo.ayah,
            parityGroupSums.oe.surah,
            parityGroupSums.oe.ayah
          ])
        )
      },
      { label: l("Sonuç"), value: l("≡ 0 (mod 19)") }
    ],
    tests: [
      {
        id: "criterion-25-1-sequence",
        label: l("Grup toplamları"),
        sequence: sequenceFrom([
          parityGroupSums.ee.surah,
          parityGroupSums.ee.ayah,
          parityGroupSums.oo.surah,
          parityGroupSums.oo.ayah,
          parityGroupSums.eo.surah,
          parityGroupSums.eo.ayah,
          parityGroupSums.oe.surah,
          parityGroupSums.oe.ayah
        ]),
        mods: [19]
      }
    ],
    tags: ["19", "grup", "toplam"]
  },
  {
    id: "criterion-25-2",
    code: "25.2",
    groupId: "fihrist",
    title: l("Çift/Tek grup basamak toplamlarının ardışık dizilimi"),
    summary: l(
      "Dört parity grubunun basamak toplamları hem 19 hem de 7 modunda doğrulanır.",
      "The digit totals of the four parity groups are verified both modulo 19 and modulo 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "20.07.2025", "Türkiye/Yalova"),
    facts: [
      {
        label: l("Basamak toplamları"),
        value: l(sequenceFrom([parityGroupDigitSums.ee, parityGroupDigitSums.oo, parityGroupDigitSums.eo, parityGroupDigitSums.oe]))
      }
    ],
    tests: [
      {
        id: "criterion-25-2-sequence",
        label: l("Basamak toplamları dizilimi"),
        sequence: sequenceFrom([parityGroupDigitSums.ee, parityGroupDigitSums.oo, parityGroupDigitSums.eo, parityGroupDigitSums.oe]),
        mods: [19, 7]
      }
    ],
    tags: ["19", "7", "basamak"]
  },
  {
    id: "criterion-27",
    code: "27",
    groupId: "fihrist",
    title: l("Gauss yöntemi ile çift/tek ayet sure toplamları"),
    summary: l(
      "Çift ayetli ve tek ayetli surelerin numara toplamları Gauss toplamlarıyla tam çakışır.",
      "The surah-number sums of even-verse and odd-verse surahs coincide with the corresponding Gauss totals."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Sheikh Mohammad Al-Darsani", "2014", "USA"),
    facts: [
      { label: l("Çift ayetli sure toplamı"), value: l(`${evenAyahSurahSum} = 3450`) },
      { label: l("Tek ayetli sure toplamı"), value: l(`${oddAyahSurahSum} = 3105`) }
    ],
    tags: ["gauss", "çift", "tek"]
  },
  {
    id: "criterion-28",
    code: "28",
    groupId: "fihrist",
    title: l("Ayet sayıları arasındaki mutlak farkların toplamı"),
    summary: l(
      "Ardışık ayet sayıları arasındaki mutlak farkların toplamı hem 7'ye hem 19'a bölünür.",
      "The sum of absolute differences between consecutive verse counts is divisible by both 7 and 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kimliği belirsiz", "12.11.2022", "Türkiye"),
    facts: [
      { label: l("Toplam"), value: l(String(absoluteDifferenceSum)) },
      { label: l("Asal çarpanlar"), value: l("7 × 19 × 19") }
    ],
    tests: [
      {
        id: "criterion-28-total",
        label: l("Mutlak farklar toplamı"),
        sequence: String(absoluteDifferenceSum),
        mods: [19, 7]
      }
    ],
    tags: ["fark", "7", "19"]
  },
  {
    id: "criterion-29",
    code: "29",
    groupId: "fihrist",
    title: l("Ayet toplamının sola kayan pencere dönüşümü"),
    summary: l(
      "Fihristteki toplam ayet sayısı 6236, kayan pencere dönüşümünde 6859 üretir ve bu sayı 19³'tür.",
      "The total verse count 6236 yields 6859 under the sliding-window transform, and 6859 equals 19 cubed."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Ali Adams", "2009-2020", "UK"),
    facts: [
      { label: l("Toplam ayet"), value: l(String(totalAyahSum)) },
      { label: l("Dönüşüm sonucu"), value: l(slidingWindowDigitSequence(String(totalAyahSum))) },
      { label: l("Asal çarpanlar"), value: l("19 × 19 × 19") }
    ],
    tests: [
      {
        id: "criterion-29-window",
        label: l("Kayan pencere çıktısı"),
        sequence: slidingWindowDigitSequence(String(totalAyahSum)),
        mods: [19]
      }
    ],
    tags: ["kayan pencere", "19"]
  },
  {
    id: "criterion-29-1",
    code: "29.1",
    groupId: "fihrist",
    title: l("Sure ve ayet toplamlarının basamak toplamlı"),
    summary: l(
      "Sure ve ayet genel toplamlarının basamak toplamları birlikte 38 üretir.",
      "The digit sums of the global surah and verse totals add up to 38."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kourosh Jamneshan", undefined, "İran"),
    facts: [
      { label: l("Sure toplamı"), value: l(`${totalSurahSum} → ${digitSum(totalSurahSum)}`) },
      { label: l("Ayet toplamı"), value: l(`${totalAyahSum} → ${digitSum(totalAyahSum)}`) },
      { label: l("Toplam"), value: l(String(digitSum(totalSurahSum) + digitSum(totalAyahSum))) }
    ],
    tests: [
      {
        id: "criterion-29-1-total",
        label: l("38"),
        sequence: String(digitSum(totalSurahSum) + digitSum(totalAyahSum)),
        mods: [19]
      }
    ],
    tags: ["basamak toplamı", "38"]
  },
  {
    id: "criterion-29-2",
    code: "29.2",
    groupId: "fihrist",
    title: l("Sure ve ayet basamak toplamlarının alt toplamları"),
    summary: l(
      "Sure basamak toplamları ile ayet basamak toplamlarının kendi basamak toplamları yine 38 verir.",
      "The digit sums of the surah-digit total and the verse-digit total again yield 38."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kourosh Jamneshan", undefined, "İran"),
    facts: [
      { label: l("Sure basamak toplamı"), value: l(`${totalSurahDigitSum} → ${digitSum(totalSurahDigitSum)}`) },
      { label: l("Ayet basamak toplamı"), value: l(`${totalAyahDigitSum} → ${digitSum(totalAyahDigitSum)}`) },
      { label: l("Toplam"), value: l(String(digitSum(totalSurahDigitSum) + digitSum(totalAyahDigitSum))) }
    ],
    tests: [
      {
        id: "criterion-29-2-total",
        label: l("38"),
        sequence: String(digitSum(totalSurahDigitSum) + digitSum(totalAyahDigitSum)),
        mods: [19]
      }
    ],
    tags: ["basamak", "38"]
  },
  {
    id: "criterion-29-3",
    code: "29.3",
    groupId: "fihrist",
    title: l("İki ayrı 38 toplamının simetrisi"),
    summary: l(
      "29.1 ve 29.2'nin çıktıları aynı toplamda, yani 38'de buluşur.",
      "The outputs of 29.1 and 29.2 meet at the same total: 38."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Kourosh Jamneshan", undefined, "İran"),
    facts: [
      { label: l("29.1"), value: l(String(digitSum(totalSurahSum) + digitSum(totalAyahSum))) },
      { label: l("29.2"), value: l(String(digitSum(totalSurahDigitSum) + digitSum(totalAyahDigitSum))) },
      { label: l("Simetri"), value: l("38 = 38") }
    ],
    tags: ["simetri", "38"]
  },
  {
    id: "criterion-29-4",
    code: "29.4",
    groupId: "fihrist",
    title: l("19 ve katı surelerin numara ve satır toplamları"),
    summary: l(
      "19'un katı olan sure numaralarının toplamı ile bu surelerin toplam satır sayıları hem 7 hem 19 modunda doğrulanır.",
      "The sum of the surah numbers that are multiples of 19 and the sum of their line counts both verify under mod 7 and mod 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "10.09.2019", "Türkiye/Yalova"),
    facts: [
      { label: l("Sureler"), value: l(sequenceFrom(multiplesOf19Surahs)) },
      { label: l("Sure numaraları toplamı"), value: l(String(sum(multiplesOf19Surahs))) },
      { label: l("Toplam satır sayıları"), value: l(sequenceFrom(multiplesOf19LineCounts)) },
      { label: l("Satır toplamı"), value: l(String(sum(multiplesOf19LineCounts))) }
    ],
    tests: [
      {
        id: "criterion-29-4-surahs",
        label: l("Sure numaraları toplamı"),
        sequence: String(sum(multiplesOf19Surahs)),
        mods: [19, 7]
      },
      {
        id: "criterion-29-4-lines",
        label: l("Toplam satır sayıları toplamı"),
        sequence: String(sum(multiplesOf19LineCounts)),
        mods: [19, 7]
      }
    ],
    tags: ["19'un katları", "satır", "7", "19"]
  },
  {
    id: "criterion-30",
    code: "30",
    groupId: "fihrist",
    title: l("Ayet sayılarının doğal sırasındaki ardışık dizilimi"),
    summary: l(
      "114 suredeki ayet sayıları doğal sırada birleştirildiğinde 7 modunda doğrulanır.",
      "When the verse counts of all 114 surahs are concatenated in natural order, the result verifies modulo 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir", undefined, "Türkiye"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l("227") },
      { label: l("Dizilim"), value: l(sequenceFrom(surahVerseCounts)) }
    ],
    tests: [
      {
        id: "criterion-30-sequence",
        label: l("Ayet sayıları dizilimi"),
        sequence: sequenceFrom(surahVerseCounts),
        mods: [7]
      }
    ],
    tags: ["ayet sayıları", "7"]
  },
  {
    id: "criterion-31-1",
    code: "31.1",
    groupId: "fihrist",
    title: l("Çift ayet sayılarının ardışık dizilimi"),
    summary: l(
      "Fihrist içindeki çift ayet sayıları doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
      "When the even verse counts are concatenated in natural order, the result verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir", undefined, "Türkiye"),
    facts: [{ label: l("Basamak uzunluğu"), value: l("121") }],
    tests: [
      {
        id: "criterion-31-1-sequence",
        label: l("Çift ayet sayıları"),
        sequence: sequenceFrom(surahVerseCounts.filter((ayahCount) => ayahCount % 2 === 0)),
        mods: [19]
      }
    ],
    tags: ["çift", "19"]
  },
  {
    id: "criterion-31-2",
    code: "31.2",
    groupId: "fihrist",
    title: l("Tek ayet sayılarının ardışık dizilimi"),
    summary: l(
      "Fihrist içindeki tek ayet sayıları doğal sırada birleştirildiğinde 7 modunda doğrulanır.",
      "When the odd verse counts are concatenated in natural order, the result verifies modulo 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir", undefined, "Türkiye"),
    facts: [{ label: l("Basamak uzunluğu"), value: l("106") }],
    tests: [
      {
        id: "criterion-31-2-sequence",
        label: l("Tek ayet sayıları"),
        sequence: sequenceFrom(surahVerseCounts.filter((ayahCount) => ayahCount % 2 === 1)),
        mods: [7]
      }
    ],
    tags: ["tek", "7"]
  },
  {
    id: "criterion-31-3-a",
    code: "31.3A",
    groupId: "special",
    title: l("Numaralı ve numarasız Besmele anomalileri"),
    summary: l(
      "1. surede numaralı Besmele, 9. surede ise Besmele yokluğu birlikte 19 ve 7 üzerinden okunur.",
      "The numbered Basmala in surah 1 and the missing Basmala in surah 9 are read together through 19 and 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "14.07.2025", "Türkiye/Yalova"),
    facts: [
      { label: l("Anomalili sureler"), value: l("1 ve 9") },
      { label: l("Aradaki sure sayısı"), value: l("7") },
      { label: l("Doğal dizilim"), value: l("19") }
    ],
    tests: [
      {
        id: "criterion-31-3-a-surahs",
        label: l("Sure numaraları"),
        sequence: "19",
        mods: [19]
      },
      {
        id: "criterion-31-3-a-gap",
        label: l("Aradaki sure sayısı"),
        sequence: "7",
        mods: [7]
      }
    ],
    tags: ["besmele", "anomali"]
  },
  {
    id: "criterion-31-3-b",
    code: "31.3B",
    groupId: "special",
    title: l("1 ile 9 arasındaki satır dizilimi"),
    summary: l(
      "1. ve 9. sure arasındaki toplam satır dizilimleri iki ayrı mod kontrolü verir.",
      "The total-line sequences spanning surahs 1 through 9 provide two separate modular checks."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "14.07.2025", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-31-3-b-full",
        label: l("1-9 arası tam dizilim"),
        sequence: "7 287 201 177 121 166 207 76 129",
        mods: [19]
      },
      {
        id: "criterion-31-3-b-middle",
        label: l("1 ile 9 arasındaki dizilim"),
        sequence: "287 201 177 121 166 207 76",
        mods: [7]
      }
    ],
    tags: ["besmele", "satır", "7", "19"]
  },
  {
    id: "criterion-31-4-a",
    code: "31.4A",
    groupId: "special",
    title: l("9. surenin son iki ayetine kadar ayet numaraları"),
    summary: l(
      "9. surenin 128. ve 129. ayetlerine kadar olan doğal ayet numarası dizileri sırasıyla 7 ve 19 modunda doğrulanır.",
      "The natural verse-number sequences up to verses 128 and 129 of surah 9 verify modulo 7 and 19 respectively."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir", undefined, "Türkiye"),
    tests: [
      {
        id: "criterion-31-4-a-128",
        label: l("1'den 128'e"),
        sequence: rangeSequence(1, 128),
        mods: [7]
      },
      {
        id: "criterion-31-4-a-129",
        label: l("1'den 129'a"),
        sequence: rangeSequence(1, 129),
        mods: [19]
      }
    ],
    tags: ["ayet numarası", "9. sure"]
  },
  {
    id: "criterion-31-4-b",
    code: "31.4B",
    groupId: "special",
    title: l("9. sure ve son iki ayetin toplamı"),
    summary: l(
      "9, 128 ve 129 toplamı olan 266 hem 7 hem 19 modunda doğrulanır; asal çarpanlarının basamak toplamı da 19 verir.",
      "The sum 266 from 9, 128 and 129 verifies under both mod 7 and mod 19; the digit sum of its prime factors also gives 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "09.09.2018", "Türkiye/Yalova"),
    facts: [
      { label: l("Toplam"), value: l("9 + 128 + 129 = 266") },
      { label: l("Asal çarpanlar"), value: l("2 × 7 × 19") },
      { label: l("Basamak toplamı"), value: l("2 + 7 + 1 + 9 = 19") }
    ],
    tests: [
      {
        id: "criterion-31-4-b-total",
        label: l("266"),
        sequence: "266",
        mods: [19, 7]
      }
    ],
    tags: ["9. sure", "266"]
  },
  {
    id: "criterion-31-4-c",
    code: "31.4C",
    groupId: "special",
    title: l("9. surenin son iki ayetindeki harf sayıları"),
    summary: l(
      "128. ve 129. ayetlerin harf sayıları çift/tek ayet sayılarıyla ve toplam sure sayısıyla eşleşir.",
      "The letter counts of verses 128 and 129 align with the counts of even/odd verse totals and with the total number of surahs."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir"),
    facts: [
      { label: l("128. ayet"), value: l("60 harf → çift ayet sayısı = 60") },
      { label: l("129. ayet"), value: l("54 harf → tek ayet sayısı = 54") },
      { label: l("Toplam"), value: l("60 + 54 = 114") }
    ],
    tests: [
      {
        id: "criterion-31-4-c-total",
        label: l("114"),
        sequence: "114",
        mods: [19]
      }
    ],
    tags: ["harf sayısı", "114"]
  },
  {
    id: "criterion-31-5",
    code: "31.5",
    groupId: "fihrist",
    title: l("Sure no + ayet sayısı + numarasız Besmele dizilimi"),
    summary: l(
      "Sure numarası, ayet sayısı ve numarasız Besmele değerleri üçlü bloklar halinde yazıldığında 19 modunda doğrulanır.",
      "When surah number, verse count, and unnumbered Basmala values are written as triplets, the sequence verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Onur Gündüz", "23.08.2023", "Almanya"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l("575") }
    ],
    tests: [
      {
        id: "criterion-31-5-sequence",
        label: l("Üçlü fihrist dizilimi"),
        sequence: triSequence,
        mods: [19]
      }
    ],
    tags: ["besmele", "fihrist", "19"]
  },
  {
    id: "criterion-31-5-a",
    code: "31.5A",
    groupId: "fihrist",
    title: l("31.5 diziliminin basamak toplamı"),
    summary: l(
      "31.5'teki bütün basamakların toplamı 1995 eder; bu sayı hem 19 hem 7 ile uyumludur.",
      "The sum of all digits in 31.5 equals 1995, which is compatible with both 19 and 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Habil Ademoğlu", "26.08.2023", "Diyarbakır"),
    facts: [
      { label: l("Basamak toplamı"), value: l(String(triSequenceDigitSum)) }
    ],
    tests: [
      {
        id: "criterion-31-5-a-total",
        label: l("1995"),
        sequence: String(triSequenceDigitSum),
        mods: [19, 7]
      }
    ],
    tags: ["basamak toplamı", "1995"]
  },
  {
    id: "criterion-31-5-b",
    code: "31.5B",
    groupId: "fihrist",
    title: l("31.5 diziliminin sola kayan pencere dönüşümü"),
    summary: l(
      "31.5 diziliminin kayan pencere dönüşümü 725 basamaklı yeni bir sayı üretir ve bu sayı 7 modunda doğrulanır.",
      "The sliding-window transform of 31.5 yields a new 725-digit number that verifies modulo 7."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "05.04.2024", "Türkiye/Yalova"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l(String(triSequenceSlidingWindow.length)) }
    ],
    tests: [
      {
        id: "criterion-31-5-b-window",
        label: l("Kayan pencere çıktısı"),
        sequence: triSequenceSlidingWindow,
        mods: [7]
      }
    ],
    tags: ["kayan pencere", "725"]
  },
  {
    id: "criterion-32",
    code: "32",
    groupId: "fihrist",
    title: l("Bütün numaralı ayetlerin doğal sırasındaki ardışık dizilimi"),
    summary: l(
      "Her surenin içindeki bütün numaralı ayetler 1'den ayet sayısına kadar yazıldığında oluşan büyük dizilim 19 modunda doğrulanır.",
      "When every numbered verse inside each surah is written from 1 up to the verse count, the resulting large sequence verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir", undefined, "Türkiye"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l(String(allNumberedAyahSequenceLength)) },
      { label: l("Sonuç"), value: l("12471 basamaklı sayı 19'a tam olarak bölünmektedir.") }
    ],
    tags: ["bütün ayetler", "dev dizi", "19"]
  },
  {
    id: "criterion-32-1",
    code: "32.1",
    groupId: "fihrist",
    title: l("32 diziliminin sola kayan pencere dönüşümü"),
    summary: l(
      "32. kriterdeki dev dizilimin kayan pencere dönüşümü ikinci büyük sayıyı üretir ve bu sayı yine 19 modunda doğrulanır.",
      "The sliding-window transform of the huge sequence in criterion 32 yields a second large number, and it too verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Gökmen Altay", "17.12.2022", "USA"),
    facts: [
      { label: l("Basamak uzunluğu"), value: l(String(allNumberedAyahSlidingWindowLength)) },
      { label: l("Sonuç"), value: l("16594 basamaklı sayı 19'a tam olarak bölünmektedir.") }
    ],
    tags: ["kayan pencere", "dev dizi", "19"]
  },
  {
    id: "criterion-32-2",
    code: "32.2",
    groupId: "fihrist",
    title: l("114 sure sayısının düz, ters ve basamak ters dizilimleri"),
    summary: l(
      "114 sure üzerinden kurulan üç farklı dizilim ayrı ayrı mod 7 ve mod 19 ilişkileri taşır.",
      "Three distinct sequences built from the 114-surah count each carry their own mod 7 and mod 19 relation."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("İmran Akdemir / Habil Ademoğlu", "03.08.2023", "Türkiye / Diyarbakır"),
    facts: [
      { label: l("Sure sayısı"), value: l("114 ≡ 0 (mod 19)") }
    ],
    tests: [
      {
        id: "criterion-32-2-count",
        label: l("Sure sayısı"),
        sequence: "114",
        mods: [19]
      },
      {
        id: "criterion-32-2-ascending",
        label: l("Sure numaralarının düz dizilimi"),
        sequence: naturalSurahSequence,
        mods: [7]
      },
      {
        id: "criterion-32-2-descending",
        label: l("Sure numaralarının ters dizilimi"),
        sequence: reverseSurahSequence,
        mods: [19]
      },
      {
        id: "criterion-32-2-reversed-digits",
        label: l("Düz dizilimin basamak ters dizilimi"),
        sequence: reverseDigitsOfNaturalSurahSequence,
        mods: [19]
      }
    ],
    tags: ["114", "sure sayısı", "7", "19"]
  },
  {
    id: "criterion-32-3",
    code: "32.3",
    groupId: "fihrist",
    title: l("Sure içi satır indeks toplamlarının ardışık dizilimi"),
    summary: l(
      "Her surenin satır indeks toplamı doğal sırada birleştirildiğinde 19 modunda doğrulanır.",
      "When each surah's line-index sum is concatenated in natural order, the result verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Mustafa Kurdoğlu", "04.04.2025", "Mexico/Matamoros"),
    facts: [
      { label: l("İlk değerler"), value: l(sequenceFrom(lineIndexSums.slice(0, 10))) }
    ],
    tests: [
      {
        id: "criterion-32-3-sequence",
        label: l("Satır indeks toplamları"),
        sequence: sequenceFrom(lineIndexSums),
        mods: [19]
      }
    ],
    tags: ["satır indeksleri", "19"]
  },
  {
    id: "criterion-32-4",
    code: "32.4",
    groupId: "fihrist",
    title: l("Fihristeki surelerin ayet sayılarının kümülatif toplamları"),
    summary: l(
      "Surelerin ayet sayıları kümülatif olarak toplandığında oluşan dizilim 19 modunda doğrulanır.",
      "When the surah verse counts are accumulated, the resulting sequence verifies modulo 19."
    ),
    sourceLabel: sourceFihrist6.label,
    sourceUrl: sourceFihrist6.url,
    discovery: discovery("Ahmet Düzduran", "09.04.2026", "Türkiye/İstanbul"),
    facts: [
      { label: l("İlk değerler"), value: l(sequenceFrom(cumulativeVerseCounts.slice(0, 10))) },
      { label: l("Son değer"), value: l(String(cumulativeVerseCounts[cumulativeVerseCounts.length - 1])) }
    ],
    tests: [
      {
        id: "criterion-32-4-sequence",
        label: l("Kümülatif ayet toplamları"),
        sequence: sequenceFrom(cumulativeVerseCounts),
        mods: [19]
      }
    ],
    tags: ["kümülatif", "ahmet düzduran", "19"]
  },
  {
    id: "criterion-33-1",
    code: "33.1",
    groupId: "surah-ayah-19",
    title: l("(Sure + Ayet) 19 katları listesindeki yatay/dikey simetri"),
    summary: l(
      "(Sure + Ayet) 19'un katı olan listede çift toplamlar, tek toplamlar ve yarı toplamları birbirine eşitlenir.",
      "Within the list where (surah + verse) is a multiple of 19, the even totals, odd totals, and half totals balance each other."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("Çift toplamı / Tek toplamı"), value: l(`${sum(evenCombinedSelected.map((entry) => entry.combined))} = ${sum(oddCombinedSelected.map((entry) => entry.combined))}`) },
      { label: l("1. yarı / 2. yarı"), value: l(`${sum(surahAyah19FirstHalf.map((entry) => entry.combined))} = ${sum(surahAyah19SecondHalf.map((entry) => entry.combined))}`) }
    ],
    tags: ["simetri", "722"]
  },
  {
    id: "criterion-33-2",
    code: "33.2",
    groupId: "surah-ayah-19",
    title: l("(Sure + Ayet) 19 katları listesindeki adet simetrisi"),
    summary: l(
      "İlk ve ikinci yarının çift/tek adetleri ile genel çift/tek adetleri eşitlik üretir.",
      "The even/odd counts in the first and second halves line up with the overall even/odd counts."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("1. yarı çift / 2. yarı tek"), value: l(`${surahAyah19FirstHalf.filter((entry) => entry.combined % 2 === 0).length} = ${surahAyah19SecondHalf.filter((entry) => entry.combined % 2 === 1).length}`) },
      { label: l("2. yarı çift / 1. yarı tek"), value: l(`${surahAyah19SecondHalf.filter((entry) => entry.combined % 2 === 0).length} = ${surahAyah19FirstHalf.filter((entry) => entry.combined % 2 === 1).length}`) },
      { label: l("Genel çift / Tek"), value: l(`${evenCombinedSelected.length} = ${oddCombinedSelected.length}`) }
    ],
    tags: ["adet", "simetri"]
  },
  {
    id: "criterion-34-1",
    code: "34.1",
    groupId: "surah-ayah-19",
    title: l("Tek/çift sure ve ayet toplamları simetrisi"),
    summary: l(
      "Tek sureli kayıtların toplamı, tek ayetli kayıtların toplamıyla; çift sureli kayıtların toplamı da çift ayetli kayıtlarla eşleşir.",
      "The total of odd-surah records matches the total of odd-verse records, and the even-surah total matches the even-verse total."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("Tek sure / Tek ayet"), value: l(`${combinedSum(oddSurahSelected)} = ${combinedSum(oddAyahSelected)}`) },
      { label: l("Çift sure / Çift ayet"), value: l(`${combinedSum(evenSurahSelected)} = ${combinedSum(evenAyahSelected)}`) }
    ],
    tags: ["simetri", "703", "741"]
  },
  {
    id: "criterion-34-3",
    code: "34.3",
    groupId: "surah-ayah-19",
    title: l("34.1 gruplarının basamak toplamı simetrisi"),
    summary: l(
      "34.1'deki tek ve çift grupların basamak toplamları da aynı simetriyi tekrarlar.",
      "The digit sums of the odd and even groups in 34.1 repeat the same symmetry."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("Tek sure / Tek ayet"), value: l(`${combinedDigitSum(oddSurahSelected)} = ${combinedDigitSum(oddAyahSelected)}`) },
      { label: l("Çift sure / Çift ayet"), value: l(`${combinedDigitSum(evenSurahSelected)} = ${combinedDigitSum(evenAyahSelected)}`) }
    ],
    tags: ["basamak", "109", "111"]
  },
  {
    id: "criterion-35-1",
    code: "35.1",
    groupId: "surah-ayah-19",
    title: l("Çift sayılar toplamı = tek sayılar toplamı"),
    summary: l(
      "(Sure + Ayet) 19 listesinde geçen bütün çift sayılar ve tek sayılar aynı toplamı verir.",
      "In the (surah + verse) 19-list, all even numbers and all odd numbers yield the same total."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("Çift / Tek toplam"), value: l(`${sum(evenOrOddNumberSums.even)} = ${sum(evenOrOddNumberSums.odd)}`) }
    ],
    tags: ["çift", "tek", "722"]
  },
  {
    id: "criterion-35-3",
    code: "35.3",
    groupId: "surah-ayah-19",
    title: l("Çift ve tek sayıların basamak toplamı"),
    summary: l(
      "Bu listedeki çift ve tek sayıların basamak toplamları da eşitlenir.",
      "The digit sums of the even and odd numbers in this list also balance."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Sorgulayan Müslüman", "2020", "Türkiye/İzmir"),
    facts: [
      { label: l("Çift / Tek basamak toplamı"), value: l(`${sum(evenOrOddNumberSums.even.map((value) => digitSum(value)))} = ${sum(evenOrOddNumberSums.odd.map((value) => digitSum(value)))}`) }
    ],
    tags: ["basamak", "110"]
  },
  {
    id: "criterion-35-4",
    code: "35.4",
    groupId: "surah-ayah-19",
    title: l("35.1 toplamlarının mod 19 doğrulaması"),
    summary: l(
      "35.1'deki 722 toplamı, hem çift hem tek tarafta 19 modunda doğrulanır.",
      "The total 722 in 35.1 is verified modulo 19 on both the even and odd sides."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-35-4-total",
        label: l("722"),
        sequence: String(sum(evenOrOddNumberSums.even)),
        mods: [19]
      }
    ],
    tags: ["722", "19"]
  },
  {
    id: "criterion-36",
    code: "36",
    groupId: "surah-ayah-19",
    title: l("Kolon toplamlarının ardışık dizilimi"),
    summary: l(
      "Seçili tablonun kolon toplamları ardışık yazıldığında hem 19 hem 7 modunda doğrulanır.",
      "When the selected table's column totals are concatenated, the result verifies under both mod 19 and mod 7."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "20.02.2023", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-36-sequence",
        label: l("Kolon toplamları"),
        sequence: sequenceFrom(group36Sequence),
        mods: [19, 7]
      }
    ],
    tags: ["kolon", "19", "7"]
  },
  {
    id: "criterion-37",
    code: "37",
    groupId: "surah-ayah-19",
    title: l("Gruplar arası mutlak farklar"),
    summary: l(
      "Bu tabloda kurulan ana grup farklarının her biri 19'a eşittir.",
      "Each principal difference established between the groups in this table equals 19."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    facts: [
      { label: l("Farklar"), value: l("19 = 19 = 19") }
    ],
    tests: [
      {
        id: "criterion-37-value",
        label: l("19"),
        sequence: "19",
        mods: [19]
      }
    ],
    tags: ["mutlak fark", "19"]
  },
  {
    id: "criterion-38",
    code: "38",
    groupId: "surah-ayah-19",
    title: l("Grup sayı adetleri"),
    summary: l(
      "Seçili listedeki ana grup adetleri 6'şar kayıtla dengelenir.",
      "The main group counts in the selected list balance at six records each."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    facts: [
      { label: l("Adetler"), value: l("6 = 6 = 6 = 6 = 6 = 6") }
    ],
    tags: ["adet", "6"]
  },
  {
    id: "criterion-39",
    code: "39",
    groupId: "surah-ayah-19",
    title: l("Sure ve ayet basamak toplamlarının kolon dizilimleri"),
    summary: l(
      "Kolon basamak toplamları, bunların kayan pencere dizilimi ve grup toplamları birlikte 19/7 kontrolü verir.",
      "The column digit totals, their sliding-window sequence, and the group totals jointly provide a 19/7 check."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    facts: [
      { label: l("Kolon toplamları"), value: l(sequenceFrom(criterion39Columns)) },
      { label: l("Kayan pencere"), value: l(sequenceFrom(criterion39Window)) },
      { label: l("Grup toplamları"), value: l(sequenceFrom(criterion39Groups)) }
    ],
    tests: [
      {
        id: "criterion-39-columns",
        label: l("Kolon toplamları"),
        sequence: sequenceFrom(criterion39Columns),
        mods: [19]
      },
      {
        id: "criterion-39-window",
        label: l("Kayan pencere dizilimi"),
        sequence: sequenceFrom(criterion39Window),
        mods: [19]
      },
      {
        id: "criterion-39-groups",
        label: l("Grup toplamları"),
        sequence: sequenceFrom(criterion39Groups),
        mods: [7]
      }
    ],
    tags: ["basamak", "kayan pencere", "19", "7"]
  },
  {
    id: "criterion-40",
    code: "40",
    groupId: "surah-ayah-19",
    title: l("Seçili sure numaraları ve toplam satır sayıları"),
    summary: l(
      "(Sure + Ayet) 19 listesinde sure numaraları 19 modunda, toplam satır sayıları ise 7 modunda doğrulanır.",
      "In the (surah + verse) 19-list, the surah numbers verify modulo 19 and the total line counts verify modulo 7."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    facts: [
      { label: l("Sure basamak toplamı"), value: l(String(digitSum(sequenceFrom(surahAyah19Surahs)))) },
      { label: l("Satır basamak toplamı"), value: l(String(digitSum(sequenceFrom(surahAyah19Lines)))) }
    ],
    tests: [
      {
        id: "criterion-40-surahs",
        label: l("Sure numaraları"),
        sequence: sequenceFrom(surahAyah19Surahs),
        mods: [19]
      },
      {
        id: "criterion-40-lines",
        label: l("Toplam satır sayıları"),
        sequence: sequenceFrom(surahAyah19Lines),
        mods: [7]
      }
    ],
    tags: ["sure numarası", "satır", "19", "7"]
  },
  {
    id: "criterion-40-1",
    code: "40.1",
    groupId: "surah-ayah-19",
    title: l("Toplam satır sayılarının asal çarpan toplamları"),
    summary: l(
      "40. kriterdeki toplam satır sayılarının asal çarpan toplamları doğal sırada yazıldığında 19 modunda doğrulanır.",
      "When the prime-factor sums of the line counts in criterion 40 are written in natural order, the result verifies modulo 19."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "26.08.2025", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-40-1-sequence",
        label: l("Asal çarpan toplamları"),
        sequence: sequenceFrom(surahAyah19Lines.map((lineCount) => primeFactorSum(lineCount))),
        mods: [19]
      }
    ],
    tags: ["asal çarpan", "satır", "19"]
  },
  {
    id: "criterion-41",
    code: "41",
    groupId: "surah-ayah-19",
    title: l("Tablo satırlarının doğal sıradaki dizilimi"),
    summary: l(
      "(Sure + Ayet) 19 tablosundaki satırlar doğal sırada birleştirildiğinde 7 modunda doğrulanır.",
      "When the rows of the (surah + verse) 19 table are concatenated in natural order, the result verifies modulo 7."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-41-sequence",
        label: l("Tablo satırları"),
        sequence: criterion41Sequence,
        mods: [7]
      }
    ],
    tags: ["tablo satırları", "7"]
  },
  {
    id: "criterion-42",
    code: "42",
    groupId: "surah-ayah-19",
    title: l("Sure no ve ayet grupları tablosunun dizilimi"),
    summary: l(
      "Sure no ve ayet grupları tablosu doğal sırada yazıldığında 19 modunda doğrulanır.",
      "When the surah-number and verse-group table is written in natural order, it verifies modulo 19."
    ),
    sourceLabel: sourceFihrist7.label,
    sourceUrl: sourceFihrist7.url,
    discovery: discovery("Mustafa Kurdoğlu", "12.11.2022", "Türkiye/Yalova"),
    tests: [
      {
        id: "criterion-42-sequence",
        label: l("Sure no ve ayet grupları"),
        sequence: criterion42Sequence,
        mods: [19]
      }
    ],
    tags: ["tablo", "19"]
  }
];
