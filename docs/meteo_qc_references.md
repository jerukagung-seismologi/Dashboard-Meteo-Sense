# Landasan Teoretis, Standar WMO, dan Publikasi Ilmiah Kendali Mutu & Rekonstruksi Data Meteorologi (MeteoSense QC Reference)

Dokumen ini merangkum seluruh landasan teoretis, standar operasional meteorologi internasional, formulasi matematis algoritma interpolasi, serta publikasi ilmiah terkini yang mendasari implementasi modul **Koreksi Data & Kendali Mutu (Quality Control)** pada sistem *MeteoSense Dashboard*.

---

## 1. Publikasi Ilmiah Terindeks & arXiv

### 1.1 Steckler et al. (2025) – arXiv:2502.05191v1
- **Judul**: *Descriptor: Five years of meteorological surface data at Oak Ridge Reserve in Tennessee*
- **Tautan**: [arXiv:2502.05191](https://arxiv.org/abs/2502.05191)
- **Kontribusi Metodologis**:
  - Menjabarkan kerangka kerja *Quality Assurance/Quality Control* (QA/QC) bertingkat untuk jaringan Automatic Weather Station (AWS).
  - Mengklasifikasikan anomali instrumen menjadi 4 kategori:
    1. **Plausibility Limit Failures**: Nilai melewati batas fisik ekstrem atmosfer lokal.
    2. **Sensor Drift**: Pergeseran nilai bertahap (*gradual drift*) akibat akumulasi debu, penuaan sel fotometrik, atau degradasi termistor.
    3. **Step-shift Baseline**: Pergeseran tiba-tiba pada baseline pengukuran pasca kalibrasi ulang fisik atau intervensi perawatan perangkat keras.
    4. **Artefactual Spikes**: Lonjakan buatan berdurasi 1–2 langkah waktu akibat gangguan elektromagnetik (EMI) atau tetesan air yang menempel sesaat.
- **Implementasi pada MeteoSense**:
  - Diterapkan pada deteksi batas fisik (WMO bounds check), deteksi lonjakan (*spike test*), serta fitur kalibrasi *Offset Konstan* ($y' = y + \Delta$) dan *Koreksi Drift Waktu* ($\Delta(t)$).

---

### 1.2 Kirkwood et al. (2022) – arXiv:2201.10544v1
- **Judul**: *A deep mixture density network for outlier-corrected interpolation of crowd-sourced weather data*
- **Tautan**: [arXiv:2201.10544](https://arxiv.org/abs/2201.10544)
- **Kontribusi Metodologis**:
  - Memformulasikan pemisahan galat sensor cuaca permukaan menjadi dua komponen ortogonal:
    $$\epsilon_{total}(t) = \delta_{additive} + (k - 1) \cdot y(t) + \eta(t)$$
    di mana $\delta_{additive}$ adalah galat offset aditif, $k$ adalah faktor pengali sensitivitas (*scaling factor*), dan $\eta(t)$ adalah derau stokastik.
  - Menekankan pentingnya batas fisik (*boundary clamping*) agar koreksi tidak merusak atau menekan sinyal dinamika konvektif riil (misalnya hembusan *cold pool outflow* saat badai).
- **Implementasi pada MeteoSense**:
  - Diterapkan pada metode koreksi faktor skala ($y' = k \cdot y$) dan penjepitan batas fisik (*Physical Boundary Clamping*).

---

### 1.3 Wang et al. (2017) – arXiv:1707.03682v1 (IEEE Sensors Journal)
- **Judul**: *A Deep Learning Approach for Blind Drift Calibration of Sensor Networks*
- **Tautan**: [arXiv:1707.03682](https://arxiv.org/abs/1707.03682)
- **Kontribusi Metodologis**:
  - Merumuskan model pergeseran sensor dinamis seiring berjalannya waktu:
    $$\Delta(t) = \delta_0 + \left( \frac{t - t_0}{t_1 - t_0} \right) (\delta_1 - \delta_0)$$
    sehingga penyesuaian interpolatif dapat diterapkan secara mulus (*smooth time-continuous drift correction*) tanpa menimbulkan diskontinuitas buatan (*artificial step jump*).
- **Implementasi pada MeteoSense**:
  - Diterapkan pada panel koreksi pergeseran linier (*Linear Time Drift Correction*) pada rentang waktu yang dipilih pengguna.

---

### 1.4 Talukder et al. (2022) – arXiv:2208.13819v1
- **Judul**: *Dynamic Calibration of Nonlinear Sensors with Time-Drifts and Delays by Bayesian Inference*
- **Tautan**: [arXiv:2208.13819](https://arxiv.org/abs/2208.13819)
- **Kontribusi Metodologis**:
  - Menegaskan prinsip integritas data instrumen:
    1. **Non-Destructive Live Preview**: Perubahan parameter wajib divisualisasikan berdampingan (*before vs after*) sebelum dituliskan secara permanen ke basis data.
    2. **Immutable Audit Trail**: Setiap modifikasi wajib mencatat stempel waktu, identitas operator, jenis metode, nilai parameter, dan rentang stempel waktu titik yang diubah.
- **Implementasi pada MeteoSense**:
  - Visualisasi real-time ECharts sebelum eksekusi, dialog konfirmasi modal dengan rincian titik terdampak, dan penyimpanan riwayat audit di Firebase RTDB (`sensor_correction_logs`).

---

## 2. Standar Organisasi Meteorologi Dunia (WMO)

### 2.1 WMO-No. 8: *Guide to Instruments and Methods of Observation*
- **Bagian II Bab 1 (Quality Management)**:
  - Batas fisik kelembaban relatif (*Relative Humidity*):
    $$0\% \le RH \le 100\%$$
    Tidak ada nilai RH yang diperbolehkan secara fisik bernilai $< 0\%$ atau $> 100\%$. Pada kondisi jenuh (*saturation / dew point*), ketidakpastian menyempit mendekati plafon $\le 5\%$.
  - Batas tekanan atmosfer terestrial permukaan laut/daratan: $850 \text{ hPa} \le P \le 1080 \text{ hPa}$.
  - Nilai presipitasi (curah hujan $RR$ dan intensitas hujan *rainrate*): $RR \ge 0.0 \text{ mm}$.
  - Ketentuan akumulasi curah hujan harian mengacu pada standar 24 jam UTC (00:00Z – 24:00Z).

---

## 3. Penuntun Model Cuaca Atmosfer Operasional (ECMWF IFS & ERA5)

### 3.1 ECMWF Integrated Forecasting System (IFS - High Resolution HRES)
- Resolusi horizontal ~9 km, representasi siklus diurnal temperatur atmosfer bebas terbaik di dunia.
- Digunakan sebagai penuntun operasional (*operational reference guide*) untuk rentang pengamatan terkini ($\le 90$ hari).

### 3.2 ECMWF ERA5 / ERA5-Land Reanalysis (Hersbach et al., 2020)
- Reanalisis iklim global generasi ke-5 dari Copernicus Climate Change Service (C3S) dengan asimilasi data observasi global 4D-Var.
- Digunakan sebagai penuntun historis untuk data arsip ($> 90$ hari).

---

## 4. Anomali Radiasi Matahari (*Solar Shield Overheating*) & Rekonstruksi Penuntun Model

### 4.1 Fenomena Fisika *Solar Overheating Shield Bias*
Pada stasiun cuaca otomatis (*Automatic Weather Station* - AWS), sensor temperatur dan kelembaban udara ditempatkan di dalam pelindung radiasi (*radiation shield* / *louvered screen*). Ketika:
1. Radiasi matahari langsung sangat kuat (*peak midday solar irradiance* $\ge 800 \text{ W/m}^2$),
2. Kecepatan angin rendah (*calm wind* $< 1.0 \text{ m/s}$),
3. Terjadi akumulasi panas termal di dalam kisi-kisi pelindung (*solar thermal trapping*),

pembacaan temperatur sensor AWS dapat melonjak hingga $+3^\circ\text{C}$ s/d $+6^\circ\text{C}$ di atas temperatur ambien atmosfer sebenarnya (umumnya terjadi pada rentang waktu 10:00 – 14:30 WIB).

### 4.2 Kegagalan Interpolasi Garis Lurus (Naive Linear)
Jika lonjakan siang hari dihapus menggunakan interpolasi garis lurus antar titik ujung (misal jam 09:30 dan 15:30), kurva temperatur siang hari menjadi garis datar horizontal atau miring kaku yang melanggar kurva pemanasan insolasi alami bumi.

### 4.3 Solusi: *Model-Guided Diurnal Interpolation*
Metode ini menggunakan profil kurva variasi diurnal dari model atmosfer resolusi tinggi (ECMWF IFS / ERA5) pada koordinat stasiun, lalu melakukan koreksi bias diferensial terhadap titik observasi valid:
$$M(t) = \text{Nilai Model Cuaca pada waktu } t$$
$$B_0 = y_0 - M(t_0), \quad B_1 = y_1 - M(t_1)$$
$$B(t) = B_0 + \left(\frac{t - t_0}{t_1 - t_0}\right)(B_1 - B_0)$$
$$y'(t) = M(t) + B(t)$$

Dengan formulasi ini:
- Kurva hasil rekonstruksi tetap mengikuti kontur pemanasan dan pendinginan diurnal alami atmosfer.
- Nilai hasil koreksi di kedua titik batas ($t_0$ dan $t_1$) menyambung sempurna (*zero boundary step discontinuity*) dengan data observasi sensor yang valid.

---

## 5. Formulasi Algoritma Interpolasi Meteorologi

### 5.1 Time-Weighted Linear Interpolation
Memperhitungkan interval waktu fisik riil ($\Delta t$ dalam milidetik) antar titik data:
$$y'(t) = y_0 + \left(\frac{t - t_0}{t_1 - t_0}\right)(y_1 - y_0)$$
Digunakan untuk pengisian celah singkat atau sensor dengan interval sampling acak.

### 5.2 Piecewise Cubic Hermite Interpolating Polynomial (PCHIP - WMO Standard)
Mengacu pada algoritma **Fritsch & Carlson (1980)** (*SIAM J. Numer. Anal.*):
- Memenuhi kondisi monotonik Fritsch-Carlson:
  $$\text{Jika } d_k \cdot \Delta_k < 0 \implies d_k = 0$$
- Menghasilkan kurva transisi mulus berkontur diurnal tanpa osilasi palsu (*Runge's overshoot phenomenon*). Sangat ideal untuk suhu udara dan tekanan atmosfer.

### 5.3 Akima Sub-Spline Interpolation
Mengacu pada algoritma **Hiroshi Akima (1970)** (*Journal of the ACM*):
- Menggunakan pembobotan kemiringan lokal berbasis 5 titik:
  $$m = \frac{|s_{i+1} - s_i| s_{i-1} + |s_{i-1} - s_{i-2}| s_i}{|s_{i+1} - s_i| + |s_{i-1} - s_{i-2}|}$$
- Sangat stabil ketika terdapat gradien tajam (misal penurunan suhu ekstrem saat terjadi *gust front* atau hujan badai lebat).

---

## 6. Aturan Mutlak Sumbu Y Visualisasi (User Rule Invariant)

Dalam visualisasi meteorologi MeteoSense:
- Batas bawah sumbu Y ($y_{min}$) untuk variabel berskala kontinu seperti Suhu Udara, Tekanan Udara, Titik Embun, dan Suhu Tanah **WAJIB berbasis nilai minimum data aktual** ($\text{floor}(\min(y))$), **BUKAN 0**!
- Memulai sumbu Y dari 0 pada variabel seperti Tekanan Udara (misal 1012 hPa) atau Suhu Tropis (misal 28°C) akan meratakan variasi dinamika atmosfer menjadi garis lurus tanpa resolusi visual yang bermakna.
- Nilai 0 hanya menjadi batas bawah untuk variabel fluks non-negatif: Curah Hujan (*rainfall*), Intensitas Hujan (*rainrate*), dan Kecepatan Angin (*wind speed*).
