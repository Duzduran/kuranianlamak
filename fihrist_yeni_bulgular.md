# Fihrist Bulguları — Yeni Kriptografik Kodlama Adayları

_Ahmet Düzduran · 16.04.2026 · Cairo 1924 (Hafs) mushafı üzerinden_

Bu belge, projede halihazırda bulunan Fihrist (sure numarası + ayet sayısı +
opsiyonel numarasız Besmele satırı) bulgularının üzerine, Mustafa Kurdoğlu'nun
Kodlama Kuralları (Bütünsellik, Dizilim, Ölçüt, Nesnel Dönüşüm) çerçevesinde
ortaya çıkarılmış **yeni kodlama adaylarını** toplar.

Kullanılan ham veri sadece mushaftan doğrudan gözlenebilen üç kolondur:

1. Sure numarası s ∈ {1, 2, …, 114}
2. Numaralı ayet sayısı a_s (114 değer)
3. Toplam satır sayısı ℓ_s = a_s + (0 eğer s ∈ {1, 9} değilse 1) — yani numarasız
   Besmele satırı dahil (criterion-29.4 ve 31.3B'deki satır tanımıyla aynı)

Her adayda; kullanılan her sayı mushaftan veya daha önce doğrulanmış bir temel
kodlamadan doğrudan gözlenebilir (nesnel karşılık), tek izin verilen aritmetik
işlem toplamadır ve dizilim mushafın kendi sırasını korur. Çift/Tek parçalama
"objektif alt-tablo seçimi"dir — yeni sayı üretmez, sadece fihrist satırlarını
kendi nesnel özelliklerine göre gruplar (bu yüzden criterion-25.1, 31.1, 31.2
gibi mevcut kriterlerde de kullanılmaktadır). Ters dizilim criterion-31.4D1'deki
gibi mevcut düz kodlamaları olan bir metin üzerinde alternatif sunum olarak
kullanılmıştır.

## Tier 1 — Çift modlu (hem 19 hem 7) yeni bulgular

### F-A · Tek numaralı surelerde (sure no + satır sayısı) doğal dizilimi

Tek numaralı 57 surenin her satırında sure numarası ile toplam satır sayısı
toplanır, sure sırası korunarak yan yana yazılır.

Satır toplamları (ilk 12): `8 204 126 214 138 135 57 115 129 118 134 142 …`

Tam 154 basamaklık ardışık dizilim:

- ≡ 0 (mod 19) ✓
- ≡ 0 (mod 7)  ✓

Bu, criterion-31.1A ve 31.2A'nın tek numaralı sure partisyonu üzerinden çalışan,
ayet sayısı yerine satır sayısı kullanan doğal uzantısıdır. Hem dominant (19)
hem mesani (7) sağlandığı için tam bir çift modlu bulgudur.

### F-B · Satır sayıları basamak toplamları — ters dizilim

Her surenin toplam satır sayısının basamak toplamı alınır (ör. 286 → 16, 200
→ 2, 176 → 14 …). Oluşan 114'lük basamak toplamı dizisi mushaf sırasıyla
ters yazılır.

- ≡ 0 (mod 19) ✓
- ≡ 0 (mod 7)  ✓

Temel kodlama (criterion-30) ayet sayılarının doğal dizilimidir; bu kriter
onun satır versiyonuna basamak toplamı + ters dizilim türemiş katmanı koyar.

### F-P · Küresel başlangıç / bitiş ayet dizilimi

Her sure için iki doğal fihrist sınırı yazılır:

- küresel başlangıç ayet indeksi `t_s`
- küresel bitiş ayet indeksi `c_s`

Bu ikili satırlar mushaf sırası korunarak yan yana yazılır:

`1 7 · 8 293 · 294 493 · 494 669 · ... · 6231 6236`

Tam 893 basamaklık dizilim:

- ≡ 0 (mod 19) ✓

Buradaki `t_s` ve `c_s`, surelerin Kur'an içindeki gerçek ayet aralıklarını
verir: örneğin 1. sure `1–7`, 2. sure `8–293`, 3. sure `294–493`, 4. sure
`494–669` aralığını kaplar. Böylece fihrist bu kez yalnız "sure no + ayet
sayısı" olarak değil, her surenin mushaf içindeki küresel yerini gösteren
başlangıç-bitiş satırları olarak okunmuş olur.

#### F-P-A · Küresel başlangıç / sure / bitiş satır dizilimi

F-P'deki başlangıç ve bitiş sınırlarının arasına sure numarası `s` orta kolon
olarak eklenir:

`1 1 7 · 8 2 293 · 294 3 493 · 494 4 669 · ... · 6231 114 6236`

Tam 1127 basamaklık dizilim:

- ≡ 0 (mod 19) ✓
- ≡ 0 (mod 7)  ✓

Aynı `S/A/T/C` sütun ailesi içinde hem mod 19 hem mod 7 veren doğal satır
sırası `T,S,C` olduğu için bu genişleme, dosyadaki en güçlü yeni fihrist
adaylarından biridir.

## Tier 2 — mod 19 = 0 (dominant) yeni bulgular

### F-C · Çift sure numaraları toplamı

Mushaftaki çift numaralı 57 surenin numaralarının toplamı:

2 + 4 + 6 + ⋯ + 114 = **3306 = 19 × 174**  ⇒ ≡ 0 (mod 19)

### F-D · Tek sure numaraları toplamı

Mushaftaki tek numaralı 57 surenin numaralarının toplamı:

1 + 3 + 5 + ⋯ + 113 = **3249 = 19 × 171**  ⇒ ≡ 0 (mod 19)

F-C ve F-D birlikte criterion-23/24'deki 6555 yapısını iki 19-katı parçaya
ayırır (3306 + 3249 = 6555 = 19 × 345). Ayrı ayrı dominant ölçütü sağlamaları
fihrist partisyonunun iki tarafının da 19-uyumlu olduğunu gösteren yeni bir
nesnel kanıttır.

### F-E · Tek ayet sayılı surelerin toplam satır sayıları

Tek ayet sayılı 54 surenin satır sayılarının toplamı:

**2774 = 19 × 146**  ⇒ ≡ 0 (mod 19)

Criterion-31.2'deki tek ayet sayıları partisyonunun satır versiyonunun toplam
uzunluğu 19-uyumludur.

### F-F · Tek ayet sayılı sure numaralarının ters dizilimi

Tek ayet sayılı 54 sure seçilir; sure numaraları yazılıp sure sırası
tersine çevrilir:

`113 111 110 108 107 105 104 103 101 100 97 96 93 … 12 11 10 9 8 6 1`

114 basamaklık dizilim ≡ 0 (mod 19) ✓

### F-G · (Sure no + satır sayısı) her sure için, basamak toplamlı doğal dizilim

Tüm 114 sure için s + ℓ_s hesaplanır, her değere basamak toplamı uygulanır,
doğal sıra korunur.

İlk 12 değer: `8 19 6 10 9 10 7 12 12 3 9 7 …`

Tam 155 basamaklık dizilim ≡ 0 (mod 19) ✓

Bu, Ahmet'in 32.3A'sında (satır indeks toplamlarının basamak toplamı) olduğu
gibi, tüm satır toplamlarına basamak toplamı uygulanan türemiş bir
kodlamadır.

## Tier 3 — mod 7 = 0 (mesani) yeni bulgular

### F-H · Tek numaralı surelerin ayet sayıları toplamı

Tek numaralı 57 surenin ayet sayılarının toplamı:

**3031 = 7 × 433**  ⇒ ≡ 0 (mod 7)

### F-I · Çift numaralı surelerin satır sayıları toplamı

Çift numaralı 57 surenin satır sayılarının toplamı:

**3262 = 7 × 466**  ⇒ ≡ 0 (mod 7)

F-H ve F-I, mushafın sure-numarası parçalanması üzerinde mesani (7) ölçütünü
sağlayan iki yeni ayrı scalar delildir.

### F-J · Tek ayet sayılı surelerde (sure no + satır sayısı) — doğal ve ters

Tek ayet sayılı 54 surede her satırda s + ℓ_s toplanır, sure sırası
korunarak yazılır:

İlk 12 değer: `8 172 84 138 120 135 124 57 115 129 156 103 …`

- Doğal dizilim (147 basamak) ≡ 0 (mod 7) ✓
- Ters dizilim (147 basamak) ≡ 0 (mod 7) ✓

Bu, criterion-31.2A'nın (tek ayet sayılı surelerde sure+ayet) satır versiyonu;
surah 1 ve 9 harici tüm surelerde ℓ_s = a_s + 1 olduğundan sekans a_s
versiyonundan birim kaymayla ayrılır ve bağımsız bir ölçütü sağlar. Hem düz
hem ters dizilim uyumludur.

### F-K · Çift numaralı surelerin ayet sayıları — ters dizilim

Çift numaralı 57 surenin ayet sayıları, sure sırasının tersine yazılır:

`6 4 3 3 4 9 8 11 8 19 8 21 20 26 17 25 19 42 … 54 30 60 88 227 64 78 135 110 128 52 111 109 75 165 176 286`

114 basamaklık dizilim ≡ 0 (mod 7) ✓

### F-L · Çift ayet sayılı surelerin kümülatif ayet bitişleri — ters dizilim

Çift ayet sayılı 60 surenin global ayet bitiş indeksleri (kümülatif toplamlar)
sure sırasının tersine yazılır:

`6236 6225 6213 6197 6176 6146 6138 6106 6098 6043 … 2855 2791 2673 2595 2348 2250 2029 1802 1160 789 669 493 293`

236 basamaklık dizilim ≡ 0 (mod 7) ✓

Bu, criterion-31.1 (çift ayet sayılı surelerin ayet sayıları, mod 19) ile
tamamlayıcı şekilde, aynı partisyonun kümülatif bitişleri üzerinden mesani
ölçütünü sağlar.

### F-M · Kümülatif ayet bitişleri basamak toplamları — ters dizilim

Tüm 114 surenin kümülatif ayet bitişleri (7, 293, 493, 669, …, 6236) için
her değere basamak toplamı uygulanır, sure sırasının tersine yazılır.

224 basamaklık dizilim ≡ 0 (mod 7) ✓

Criterion-32.4 (kümülatif ayet toplamları, mod 19) üzerinden türemiş basamak
toplamı ve ters dizilim katmanı burada mesani ölçütünü sağlar.

### F-O · Ayet sayısı / numarasız Besmele dizilimi

Her sure için yalnız iki ham değer yazılır: ayet sayısı `a_s` ve numarasız
Besmele göstergesi `b_s` (1. ve 9. surede 0, diğer surelerde 1). Bu ikili
bloklar mushaf sırası korunarak yan yana yazılır:

`7 0 286 1 200 1 176 1 120 1 165 1 206 1 75 1 129 0 …`

Tam 341 basamaklık dizilim:

- ≡ 0 (mod 7) ✓

Bu aday, 31.5'teki üçlü fihrist çekirdeğinin ham bir alt-katmanıdır: sure
numarası hiç kullanılmadan yalnız ayet sayısı ve numarasız Besmele bilgisi
doğal sırada birlikte okunur. Çift/tek partisyon, ters dizilim ve satır
türevi olmadan bütün 114 sureyi kapsaması bakımından dosyadaki en sade ham
mesani adaylarından biridir.

## Tier 4 — Üçlü fihrist diziliminin satır versiyonları

### F-N · Tek numaralı surelerde (sure no + satır + kümülatif satır) üçlü dizilimi

Tek numaralı 57 surede her satır için üç sayı yazılır: sure numarası, toplam
satır sayısı, kümülatif satır bitişi. 171 sayı, 453 basamaklık tam dizilim:

- ≡ 0 (mod 7) ✓  (mesani)

Bu, criterion-32.4B'nin (aynı partisyonun sure/ayet/kümülatif-ayet üçlüsü,
mod 19) satır versiyonudur. 19 ölçütü sağlanmasa da mod 7 = 0 bağımsız
mesani ölçütü sağlar ve Besmele-satır eklenmiş yeni bir objektif kolon seti
sunar.

## Kurallara uygunluk özeti

| Kural | Uygulama |
|---|---|
| Bütünsellik | Her aday mushafın 114 sure kadrosunun objektif bir alt kümesini veya tamamını kullanır. Parçalama yalnızca çift/tek gibi mushaftan okunan parametrelerle yapılır; ek sayı uydurulmaz. |
| Dizilim | Tüm diziler mushaftaki sure sırasını korur; ters versiyonlar yalnızca mushafın doğal sıra akışının tersidir ve projede halihazırda kullanılan bir tekniktir (criterion-31.4D1, criterion-31.1/31.2'nin ters kardeşleri vb.). |
| Ölçüt | Dominant ölçüt mod 19 = 0'dır. Mesani olarak mod 7 = 0 kabul edilmiştir. Çift modlu (19 ve 7 birlikte) bulgular F-A, F-B ve F-P-A'dır. |
| Nesnel Dönüşüm | Tek izin verilen aritmetik işlem toplamadır (sure no + satır sayısı vb.). Basamak toplamı ve ters dizilim, criterion-25.2, 29.1–29.3 ve 32.3A'da kullanılan türemiş kodlama biçimleridir; hiçbir değer mushafta nesnel karşılığı olmayan bir sayı üretmez. |

## Nerede deneyebilirsin

- `scripts/analyze_fihrist_candidates.py` — mevcut fihrist adaylarını mod 19
  üzerinden aramak için zaten hazır. Bu rapordaki yeni dönüşümleri (satır
  tabanlı toplamlar, parite partisyon tersleri) aynı pipeline'a eklemek, her
  adayı otomatik doğrulamanı sağlar.
- Bu raporun yanındaki `search_fihrist_new.py` (oturum klasöründe) bu raporda
  listelenen adayları toplu şekilde üretir ve mod 19 / mod 7 sonuçlarını
  raporlar.

## Önerilen bir sonraki adım

Bu adaylar arasından öncelikle **F-P-A** (küresel başlangıç/sure/bitiş satırları, 19 ∧ 7)
en dengeli yeni bütün-fihrist adayıdır. **F-P** temel 19 sınır dizilimi olarak,
**F-A** (tek sure + satır, 19 ∧ 7) ve
**F-B** (satır basamak toplamı ters, 19 ∧ 7) ikinci halkada düşünülebilir.
F-C, F-D, F-E gibi skaler (tek sayı) bulgular criterion-29.1/29.2/29.4
kalıbıyla "foundational" olarak eklenebilir. Satır bazlı üçlü F-N ise
criterion-32.4B/32.4C ile birlikte deneysel kümeye (experimental-archive)
konabilir.
