# DOKUMENTASI LENGKAP & STANDARISASI ILMIAH RUMUS INDEKS MONSUN & SIRKULASI REGIONAL (BMKG & WMO)

Dokumen ini menyajikan rujukan teoretis, formulasi matematis, level tekanan atmosfer, domain spasial, serta implikasi meteorologis operasional untuk seluruh indeks monsun dan osilasi atmosfer yang diimplementasikan pada platform **MeteoSense Dashboard**.

---

## 1. Pendahuluan & Karakteristik Benua Maritim Indonesia

Wilayah Benua Maritim Indonesia (BMI / *Maritime Continent*) terletak di antara dua benua (Asia dan Australia) serta dua samudra (Samudra Pasifik dan Samudra Hindia). Akibat posisi geografis ini, pola presipitasi dan iklim musiman Indonesia sangat dipengaruhi oleh:
1. **Sirkulasi Monsun Musiman**:
   - **Monsun Asia (Baratan / DJF - Desember, Januari, Februari)**: Membawa massa udara basah kaya uap air dari Samudra Hindia dan Laut Cina Selatan menuju kepulauan Indonesia bagian selatan (Jawa, Bali, Nusa Tenggara).
   - **Monsun Australia (Timuran / JJA - Juni, Juli, Agustus)**: Mengalirkan massa udara kering dan dingin dari daratan benua Australia yang memicu musim kemarau di Indonesia bagian selatan.
2. **Aliran Lintas Ekuator (*Cross-Equatorial Flow*)**:
   - Dorongan seruakan dingin (*Cold Surge*) dari daratan Siberia melintasi Laut Cina Selatan.
3. **Variabilitas Intraseasonal & Tropis**:
   - Fenomena Madden-Julian Oscillation (MJO) dan Boreal Summer Intraseasonal Oscillation (BSISO) fase 1–8.
   - Migrasi meridian Daerah Konvergensi Antar Tropis (DKAT / ITCZ).

Dalam operasional klimatologi BMKG dan World Meteorological Organization (WMO), indeks-indeks monsun **tidak diukur menggunakan angin permukaan $10\text{ meter}$**, melainkan pada **level tekanan standar atmosfer troposfer bawah ($850\text{ hPa}$, $\approx 1.500\text{ m}$ dan $925\text{ hPa}$, $\approx 750\text{ m}$)** untuk menghindari distorsi gesekan daratan/topografi (*friction layer*), serta **level troposfer atas ($200\text{ hPa}$, $\approx 12.000\text{ m}$)** untuk mengukur geser vertikal (*vertical wind shear*).

---

## 2. Prinsip Dekomposisi Vektor Angin Sinoptik

### 2.1 Konvensi Arah Angin Meteorologi
Dalam meteorologi, arah angin ($\theta$) didefinisikan sebagai arah **dari mana angin bertiup**, diukur searah jarum jam dari arah Utara ($0^\circ = 360^\circ$ dari Utara, $90^\circ$ dari Timur, $180^\circ$ dari Selatan, $270^\circ$ dari Barat).

Untuk mendekomposisi kecepatan skalar angin ($spd$) dan arah angin ($\theta$ dalam derajat) menjadi komponen vektor kartesian:
- **Komponen Zonal ($u$)**: Positif bernilai ke arah **Timur** (angin baratan / *westerlies*).
- **Komponen Meridional ($v$)**: Positif bernilai ke arah **Utara** (angin selatan / *southerlies*).

Formulasi transformasi trigonometrik standar WMO:
$$u = -spd \times \sin\left(\theta \times \frac{\pi}{180}\right)$$
$$v = -spd \times \cos\left(\theta \times \frac{\pi}{180}\right)$$

### 2.2 Rerata Vektor Harian (*True Daily Vector Mean*)
Sirkulasi sinoptik atmosfer wajib dihitung menggunakan **agregasi vektor harian**, bukan rata-rata skalar:
$$\bar{u}_{\text{daily}} = \frac{1}{N} \sum_{i=1}^{N} u_i, \quad \bar{v}_{\text{daily}} = \frac{1}{N} \sum_{i=1}^{N} v_i$$
di mana $N = 24$ jam pengamatan. Hal ini menjamin bahwa pembalikan arah angin diurnal (seperti angin darat-laut lokal) saling mengeliminasi secara vektor, menyisakan aliran gradien sinoptik murni.

---

## 3. Matriks Indeks Monsun & Sirkulasi Regional

| Indeks | Nama Lengkap | Rujukan Ilmiah Utama | Level Tekanan | Domain Koordinat | Rumus Matematis Eksak | Ambang Batas Fisis | Dampak terhadap Cuaca Indonesia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUSMI** | Australian Monsoon Index | Wang & Fan (2001); Kajikawa et al. (2012) | **850 hPa** | $5^\circ\text{S} - 15^\circ\text{S}$, $110^\circ\text{E} - 130^\circ\text{E}$ | $u_{850}$ | $> +2.0\text{ m/s}$ (Aktif/Hujan)<br>$< -2.0\text{ m/s}$ (Kering) | Menentukan durasi dan intensitas musim hujan di Jawa, Bali, NTB, NTT. Nilai positif = pasokan baratan basah melimpah; nilai negatif = kemarau dingin Australia (*bediding*). |
| **WNPMI** | Western North Pacific Monsoon Index | Wang & Fan (2001) | **850 hPa** | Domain 1: $5^\circ\text{N}-15^\circ\text{N}, 100^\circ\text{E}-130^\circ\text{E}$<br>Domain 2: $20^\circ\text{N}-30^\circ\text{N}, 110^\circ\text{E}-140^\circ\text{E}$ | $u_{850}^{(\text{Trop})} - u_{850}^{(\text{Subtrop})}$ | $> +2.0\text{ m/s}$ (Palung Aktif)<br>$< -2.0\text{ m/s}$ (Melemah) | Sirkulasi siklonik monsun Pasifik Barat Laut. Positif kuat menarik massa udara lintas ekuator ke utara, memperkuat kemarau di Indonesia selatan dan memicu siklogenesis tropis di Filipina. |
| **SCSMI** | South China Sea Monsoon Index | Wang et al. (2004) | **850 hPa** | $5^\circ\text{N} - 15^\circ\text{N}$, $110^\circ\text{E} - 120^\circ\text{E}$ | $u_{850}^{(\text{LCS})}$ | $> +2.0\text{ m/s}$ (Onset Aktif)<br>$< -2.0\text{ m/s}$ (Timuran/Pra-Onset) | Penentu Onset Monsun Musim Panas Asia Tenggara (Mei). Membawa massa uap air ke Selat Karimata, Natuna, dan Kalimantan Barat. |
| **CSI** | Cold Surge Index | Chang et al. (2005); Operasional BMKG | **925 hPa** | $10^\circ\text{N} - 15^\circ\text{N}$, $110^\circ\text{E} - 115^\circ\text{E}$ | $v_{925}^{(\text{LCS})}$ | $v \le -8.0\text{ m/s}$ (Seruakan Aktif)<br>$v \le -5.0\text{ m/s}$ (Waspada) | Menilai seruakan dingin Siberia. Ketika $v \le -8\text{ m/s}$, angin utara berkecepatan tinggi menembus Laut Jawa memicu banjir ekstrem di Pantura Jawa dan Jabodetabek (Jan–Feb). |
| **WYI** | Webster-Yang Monsoon Index | Webster & Yang (1992) | **850 hPa & 200 hPa** | $0^\circ - 20^\circ\text{N}$, $40^\circ\text{E} - 110^\circ\text{E}$ | $u_{850} - u_{200}$ | $> +5.0\text{ m/s}$ (Sirkulasi Kuat)<br>$< -2.0\text{ m/s}$ (Sirkulasi Tertekan) | Indeks sirkulasi termal makro skala besar antara Samudra Hindia tropis dan benua Asia. |
| **SASMI** | South Asian Summer Monsoon Index | Goswami et al. (1999) | **850 hPa & 200 hPa** | $10^\circ\text{N} - 30^\circ\text{N}$, $70^\circ\text{E} - 110^\circ\text{E}$ | $v_{850} - v_{200}$ | $> +2.0\text{ m/s}$ (Aktif Kuat)<br>$< -2.0\text{ m/s}$ (Melemah) | Geser vertikal sirkulasi lokal Hadley di Teluk Benggala. Mengendalikan pasokan uap air ke Sumatra bagian utara, Selat Malaka, dan Aceh. |
| **EASMI** | East Asian Summer Monsoon Index | Zhang et al. (2003); Wang & Fan (1999) | **850 hPa** | $20^\circ\text{N} - 40^\circ\text{N}$, $110^\circ\text{E} - 125^\circ\text{E}$ | $v_{850}^{(\text{Asia Timur})}$ | $> +2.0\text{ m/s}$ (Front Aktif)<br>$< -2.0\text{ m/s}$ (Melemah) | Mengukur intensitas front semi-stasioner Meiyu/Baiu di Asia Timur dan tarikan massa udara dari Pasifik subtropis. |
| **BSISO1** | Boreal Summer Intraseasonal Oscillation 1 | Lee et al. (2013) / APCC | **850 hPa & OLR** | $10^\circ\text{S} - 40^\circ\text{N}$, $40^\circ\text{E} - 160^\circ\text{E}$ | Proyeksi EOF1-2 (Siklus 30–60 hari) | $\text{Amp} \ge 1.0$ (Aktif)<br>Fase 1–8 | Perambatan konveksi ke utara (*northward propagation*). Fase 1–3 memicu hujan lebat di Sumatra dan Kalimantan Barat; Fase 4–5 di Kalimantan Utara & Sulawesi. |
| **BSISO2** | Boreal Summer Intraseasonal Oscillation 2 | Lee et al. (2013) / APCC | **850 hPa & OLR** | $10^\circ\text{S} - 40^\circ\text{N}$, $40^\circ\text{E} - 160^\circ\text{E}$ | Proyeksi EOF3-4 (Siklus 10–23 hari) | $\text{Amp} \ge 1.0$ (Aktif)<br>Fase 1–8 | Modus kuasi dua-mingguan. Berperan sebagai *trigger* onset musim hujan dan gelombang presipitasi lebat berdurasi pendek. |
| **ITCZ** | Intertropical Convergence Zone Tracker | Waliser & Gautier (1993); BMKG DKAT Climatology | **Presipitasi & SST** | Sektor Benua Maritim ($95^\circ\text{E} - 141^\circ\text{E}$) | $\text{Lat}_{\text{max}}\left(\bar{P}(\text{lat})\right)$ | Lintang meridian ($-12^\circ\text{S}$ s.d. $+14^\circ\text{N}$) | Melacak sabuk konvergensi monsun. Lintang $< -2^\circ$: Musim Hujan wilayah selatan; Lintang $> +2^\circ$: Musim Kemarau wilayah selatan. |

---

## 4. Penjelasan Formula Eksak per Indeks

### 4.1 AUSMI (Australian Monsoon Index)
- **Definisi Ilmiah**: Rata-rata komponen angin zonal ($u$) pada level tekanan **$850\text{ hPa}$** di atas kawasan Belahan Bumi Selatan ($5^\circ\text{S}–15^\circ\text{S}$, $110^\circ\text{E}–130^\circ\text{E}$):
  $$\text{AUSMI} = \frac{1}{A} \iint_{5^\circ\text{S}-15^\circ\text{S}}^{110^\circ\text{E}-130^\circ\text{E}} u_{850} \, dA$$
- **Interpretasi**:
  - $\text{AUSMI} > +2.0\text{ m/s}$: Aliran baratan ekuatorial sangat kuat (*active Australian monsoon*), menandakan puncak musim hujan di Jawa, Bali, Lombok, Sumbawa, Flores, dan Timor.
  - $\text{AUSMI} < -2.0\text{ m/s}$: Aliran timuran kering mendominasi dari daratan Australia (*dry trade winds*), menandakan musim kemarau di Indonesia bagian selatan.

### 4.2 WNPMI (Western North Pacific Monsoon Index)
- **Definisi Ilmiah**: Selisih angin zonal $850\text{ hPa}$ antara wilayah lintang tropis dan lintang subtropis:
  $$\text{WNPMI} = u_{850}(5^\circ\text{N}–15^\circ\text{N}, 100^\circ\text{E}–130^\circ\text{E}) - u_{850}(20^\circ\text{N}–30^\circ\text{N}, 110^\circ\text{E}–140^\circ\text{E})$$
- **Interpretasi**:
  - Nilai positif tinggi mengindikasikan adanya vortisitas siklonik skala luas di Laut Filipina (palung monsun aktif). Saat palung ini aktif, uap air ditarik ke belahan bumi utara, memicu kondisi lebih kering di Jawa dan meningkatkan potensi badai tropis di timur Filipina.

### 4.3 SCSMI (South China Sea Monsoon Index)
- **Definisi Ilmiah**: Angin zonal $850\text{ hPa}$ di Laut Cina Selatan bagian selatan ($5^\circ\text{N}–15^\circ\text{N}$, $110^\circ\text{E}–120^\circ\text{E}$):
  $$\text{SCSMI} = u_{850}(5^\circ\text{N}–15^\circ\text{N}, 110^\circ\text{E}–120^\circ\text{E})$$
- **Interpretasi**:
  - Digunakan secara resmi oleh komunitas meteorologi Asia Timur untuk menentukan **tanggal Onset Musim Panas Asia Tenggara**. Pembalikan nilai dari negatif ke positif yang bertahan $\ge 5$ hari menandai tibanya musim basah di Indochina dan pesisir utara Kalimantan.

### 4.4 CSI (Cold Surge Index) - Standar BMKG & Chang et al. (2005)
- **Definisi Ilmiah**: Komponen angin meridional ($v$) pada level tekanan **$925\text{ hPa}$** di Laut Cina Selatan bagian tengah-selatan ($10^\circ\text{N}–15^\circ\text{N}$, $110^\circ\text{E}–115^\circ\text{E}$):
  $$\text{CSI} = v_{925}(10^\circ\text{N}–15^\circ\text{N}, 110^\circ\text{E}–115^\circ\text{E})$$
- **Interpretasi**:
  - Karena arah hembusan seruakan dari utara menuju selatan, nilai $v$ bernilai **negatif**.
  - $v > -5.0\text{ m/s}$: Kondisi netral / tenang.
  - $-8.0\text{ m/s} \le v \le -5.0\text{ m/s}$: Kondisi waspada (aliran utaraan menguat).
  - $v \le -8.0\text{ m/s}$: **Seruakan Dingin Aktif (*Strong Cold Surge*)**. Massa udara dingin kontinental Siberia menembus ekuator menuju Laut Jawa dan Selat Karimata, memicu konvergensi masif dan cuaca ekstrem banjir di Pulau Jawa bagian barat/utara.

### 4.5 WYI (Webster-Yang Monsoon Index)
- **Definisi Ilmiah**: Geser angin vertikal zonal (*vertical zonal wind shear*) antara lapisan troposfer bawah dan atas:
  $$\text{WYI} = u_{850}(0^\circ–20^\circ\text{N}, 40^\circ\text{E}–110^\circ\text{E}) - u_{200}(0^\circ–20^\circ\text{N}, 40^\circ\text{E}–110^\circ\text{E})$$
- **Interpretasi**:
  - Mengukur kekuatan sel sirkulasi panas berskala benua antara Samudra Hindia dan daratan Eurasia. Nilai positif mencerminkan pelepasan panas laten yang intensif akibat aktivitas konveksi monsun.

### 4.6 SASMI (South Asian Summer Monsoon Index)
- **Definisi Ilmiah**: Geser angin vertikal meridional (*vertical meridional wind shear*) menurut Goswami et al. (1999):
  $$\text{SASMI} = v_{850}(10^\circ\text{N}–30^\circ\text{N}, 70^\circ\text{E}–110^\circ\text{E}) - v_{200}(10^\circ\text{N}–30^\circ\text{N}, 70^\circ\text{E}–110^\circ\text{E})$$
- **Interpretasi**:
  - Menilai kekuatan sirkulasi lokal sel Hadley di atas Teluk Benggala. Berkorelasi langsung dengan intensitas suplai awan hujan ke wilayah Aceh, Sumatra Utara, dan Selat Malaka.

### 4.7 EASMI (East Asian Summer Monsoon Index)
- **Definisi Ilmiah**: Komponen angin meridional $850\text{ hPa}$ di kawasan Asia Timur ($20^\circ\text{N}–40^\circ\text{N}$, $110^\circ\text{E}–125^\circ\text{E}$):
  $$\text{EASMI} = v_{850}(20^\circ\text{N}–40^\circ\text{N}, 110^\circ\text{E}–125^\circ\text{E})$$
- **Interpretasi**:
  - Mengukur penetrasi aliran angin selatan dari Pasifik subtropis ke daratan Tiongkok dan Jepang yang memicu hujan lebat front Meiyu/Baiu.

### 4.8 BSISO1 & BSISO2 (Boreal Summer Intraseasonal Oscillation)
- **Definisi Ilmiah**: Pasangan indeks fase dan amplitudo hasil proyeksi Empirical Orthogonal Function (EOF) multi-variat:
  - **BSISO1 (Siklus 30–60 hari)**: Propagasi awan konvektif monsun ke arah utara (*northward propagation*) dari Samudra Hindia menuju Benua Maritim Indonesia dan Pasifik Barat.
  - **BSISO2 (Siklus 10–23 hari)**: Osilasi kuasi dua-mingguan yang mengontrol fase onset dan lonjakan curah hujan sub-musiman di Laut Cina Selatan dan Filipina.
- **Formulasi Amplitudo & Fase**:
  $$\text{Amplitudo} = \sqrt{\text{BSISO}_1^2 + \text{BSISO}_2^2}$$
  $$\phi = \arctan2(\text{BSISO}_2, \text{BSISO}_1)$$
  Fase terbagi ke dalam 8 sektor ($45^\circ$ per fase).

---

## 5. Riwayat Audit & Standarisasi Codebase (Before vs After)

Sebelum audit ini dilakukan, codebase memiliki beberapa kelemahan formulasi yang telah dikoreksi sepenuhnya pada backend:

| Aspek / Indeks | Implementasi Lama (Tidak Akurat) | Implementasi Baru (Distandarisasi BMKG / WMO) |
| :--- | :--- | :--- |
| **Level Ketinggian Atmosfer** | Menggunakan angin permukaan $10\text{ meter}$ (`wind_speed_10m_max`) yang rentan gesekan lokal dan distorsi topografi. | Menggunakan level tekanan atmosfer standar: **$850\text{ hPa}$** (lapisan batas sinoptik), **$925\text{ hPa}$** (level seruakan dingin), dan **$200\text{ hPa}$** (troposfer atas). |
| **WYI (Webster-Yang)** | Hanya mengukur angin zonal permukaan $10\text{m}$ tanpa geser vertikal. | Menghitung **geser vertikal zonal sejati**: $u_{850} - u_{200}$ sesuai perumusan Webster & Yang (1992). |
| **SASMI (South Asian)** | Hanya membaca kecepatan angin skalar meridional permukaan. | Menghitung **geser vertikal meridional sejati**: $v_{850} - v_{200}$ sesuai Goswami et al. (1999). |
| **CSI (Cold Surge Index)** | Menggunakan data permukaan dan koordinat acak. | Menggunakan level tekanan standar **$925\text{ hPa}$** di Laut Cina Selatan ($12.5^\circ\text{N}, 112.5^\circ\text{E}$) dengan ambang seruakan aktif $v \le -8.0\text{ m/s}$ (Chang et al. 2005 / Standar Operasional BMKG). |
| **Dekomposisi Vektor** | Menggunakan rata-rata skalar. | Menggunakan **True Daily Vector Mean** dari 24 jam pengamatan trigonometri: $u = -spd \sin(\theta), v = -spd \cos(\theta)$. |
| **Keandalan Jaringan API** | Fetch paralel serentak tanpa batas waktu (dapat memicu connection timeout). | Dilengkapi fungsi **`fetchJsonWithRetry`** dengan pembatalan otomatis (*AbortController*) dan *exponential backoff retry* untuk stabilitas koneksi maksimum. |

---

## 6. Referensi Literatur Ilmiah

1. **Wang, B., & Fan, Z. (1999)**. *Choice of South Asian summer monsoon indices*. Bulletin of the American Meteorological Society, 80(4), 629-638.
2. **Wang, B., Wu, R., & Lau, K. M. (2001)**. *Interannual variability of the Asian summer monsoon: Contrasting South Asia and western North Pacific*. Journal of Climate, 14(20), 4073-4090.
3. **Webster, P. J., & Yang, S. (1992)**. *Monsoon and ENSO: Selectively interactive systems*. Quarterly Journal of the Royal Meteorological Society, 118(507), 877-926.
4. **Goswami, B. N., Krishnamurthy, V., & Annamalai, H. (1999)**. *A broad-scale circulation index for the interannual variability of the Indian summer monsoon*. Quarterly Journal of the Royal Meteorological Society, 125(554), 611-633.
5. **Chang, C. P., Harr, P. A., & Chen, H. J. (2005)**. *Synoptic disturbances over the equatorial South China Sea and western Maritime Continent during boreal winter*. Monthly Weather Review, 133(3), 489-503.
6. **Wang, B., Ho, L., Zhang, Y., & Lu, M. M. (2004)**. *Definition of South China Sea monsoon onset and commencement of the East Asia summer monsoon*. Geophysical Research Letters, 31(5).
7. **Zhang, Q. Y., Tao, S. Y., & Chen, L. X. (2003)**. *The interannual variability of East Asian summer monsoon indices and its association with the large-scale circulation anomalies*. Chinese Journal of Atmospheric Sciences, 27(3), 353-368.
8. **Lee, J. Y., Wang, B., Wheeler, M. C., Fu, X., Waliser, D. E., & Kang, I. S. (2013)**. *Real-time multivariate indices for the boreal summer intraseasonal oscillation over the Asian summer monsoon region*. Climate Dynamics, 40(1-2), 493-509.
9. **Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)**. *Standar Operasional Prosedur Analisis dan Prakiraan Sirkulasi Monsun dan Seruakan Dingin (Cold Surge)*. Jakarta: Pusat Informasi Perubahan Iklim BMKG.
