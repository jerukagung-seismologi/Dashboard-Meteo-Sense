# 🌦️ Dashboard Meteo-Sense (SIM-Jerukagung-Seismologi-Meteo-Sense)

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Apache ECharts](https://img.shields.io/badge/Apache_ECharts-6.1.0-e43961?style=for-the-badge&logo=apacheecharts)](https://echarts.apache.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_%26_Firestore-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![WMO Standards](https://img.shields.io/badge/WMO-No._8_Compliant-0284c7?style=for-the-badge)](https://wmo.int)

> **Sistem Informasi Meteorologi & Klimatologi Terpadu (SIM-Meteo-Sense)**: Platform pemantauan stasiun cuaca otomatis (*Automatic Weather Station* / AWS) telemetri IoT, analisis variabilitas iklim jangka panjang, mesin koreksi bias instrumen dinamis, imputasi reanalisis atmosfer ECMWF ERA5, serta sistem proyeksi ansambel musiman multi-model global (*Multi-Model Ensemble*).

---

## 📑 Daftar Isi
1. [Gambaran Umum Proyek](#-gambaran-umum-proyek)
2. [Arsitektur Sistem & Diagram Alir (Flowcharts)](#-arsitektur-sistem--diagram-alir-flowcharts)
   - [1. Arsitektur Sistem Terintegrasi](#1-arsitektur-sistem-terintegrasi)
   - [2. Alur Pemrosesan Telemetri, QC, & Imputasi ERA5](#2-alur-pemrosesan-telemetri-qc--imputasi-era5)
   - [3. Alur Kalibrasi & Koreksi Bias Sensor](#3-alur-kalibrasi--koreksi-bias-sensor)
   - [4. Alur Proyeksi Iklim Musiman Multi-Model (ENSO/IOD/MJO)](#4-alur-proyeksi-iklim-musiman-multi-model-ensoiodmjo)
   - [5. Alur Pelaporan & Ekspor Data Eksternal](#5-alur-pelaporan--ekspor-data-eksternal)
3. [Algoritma & Formulasi Ilmiah](#-algoritma--formulasi-ilmiah)
   - [Kalibrasi & Koreksi Bias Sensor](#kalibrasi--koreksi-bias-sensor)
   - [Koreksi Data, Adaptasi Pola Node, & Imputasi Celah 2-Fase](#koreksi-data-adaptasi-pola-node--imputasi-celah-2-fase)
   - [Pengawas Status Node & Deteksi Dini Anomali Suhu](#f-sistem-pengawas-status-node--deteksi-dini-anomali-suhu-real-time-periodic-node-health--temperature-anomaly-supervisor)
   - [Verifikasi Kategorikal Hujan & Tabel Kontingensi WMO/BMKG](#verifikasi-kategorikal-hujan--tabel-kontingensi-wmobmkg)
   - [Metrik Hidrometeorologi & Uji Homogenitas Deret Waktu](#metrik-hidrometeorologi--uji-homogenitas-deret-waktu)
   - [Reduksi Tekanan Barometrik ke Mean Sea Level Pressure (MSLP)](#reduksi-tekanan-barometrik-ke-mean-sea-level-pressure-mslp)
   - [Verifikasi Probabilistik Ensambel (CRPS, Brier Score, & Reliability)](#verifikasi-probabilistik-ensambel-crps-brier-score--reliability)
   - [Parameter Turunan Meteorologi](#parameter-turunan-meteorologi)
   - [Standar Jendela Waktu Ekstrem Sinoptik WMO/BMKG](#standar-jendela-waktu-ekstrem-sinoptik-wmobmkg)
   - [Imputasi Reanalisis Atmosfer (ECMWF ERA5)](#imputasi-reanalisis-atmosfer-ecmwf-era5)
   - [Prakiraan Ansambel Musiman Multi-Model Global](#prakiraan-ansambel-musiman-multi-model-global)
   - [Peramalan Curah Hujan Fuzzy Time Series (FTS Chen & Song-Chissom)](#peramalan-curah-hujan-fuzzy-time-series-fts-chen--song-chissom)
   - [Pipeline Rekayasa Fitur Meteorologi & Deret Waktu](#pipeline-rekayasa-fitur-meteorologi--deret-waktu)
   - [Backend Python ML Service & Kontrak Antarmuka JSON](#backend-python-ml-service--kontrak-antarmuka-json)
   - [Adaptor Model Cuaca AI Generasi Baru: WeatherNext 3 / PARDIG](#adaptor-model-cuaca-ai-generasi-baru-weathernext-3--pardig)
4. [Sumber Data & Integrasi Eksternal](#-sumber-data--integrasi-eksternal)
5. [Fitur-Fitur Utama Modul Dasbor](#-fitur-fitur-utama-modul-dasbor)
6. [Tumpukan Teknologi & Dependensi (Packages)](#-tumpukan-teknologi--dependensi-packages)
7. [Struktur Direktori Repositori](#-struktur-direktori-repositori)
8. [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
9. [Variabel Lingkungan (Environment Variables)](#-variabel-lingkungan-environment-variables)
10. [Lisensi & Hak Cipta](#-lisensi--hak-cipta)

---

## 🌟 Gambaran Umum Proyek

**Dashboard Meteo-Sense** adalah ekosistem pemantauan cuaca dan iklim generasi baru yang dikembangkan untuk menjembatani kebutuhan observasi operasional di tingkat tapak (*stasiun mikro/meso*) dengan data makro klimatologi global.

Platform ini tidak hanya menyajikan data mentah sensor, melainkan melakukan:
1. **Validasi & Quality Control (QC)** data telemetri otomatis sesuai kaidah WMO No. 8.
2. **Koreksi Bias Terkalibrasi** terhadap instrumen acuan (*benchmark*) BMKG secara *on-the-fly*.
3. **Imputasi Cerdas Data Hilang (*Data Imputation*)** memanfaatkan reanalisis atmosfer global resolusi tinggi ECMWF ERA5 yang dikalibrasi fungsi transfer lokal.
4. **Pemantauan Pendorong Iklim Global (*Climate Drivers*)**: Analisis multi-model ENSO (7 pusat iklim dunia), IOD (*Dipole Mode Index*), diagram fase MJO (*Wheeler-Hendon*), serta sirkulasi angin Monsun Asia-Australia.
5. **Ekspor Pelaporan Standar**: Format pelaporan dinas harian/bulanan A4 siap cetak, integrasi jaringan stasiun cuaca internasional **Met Office WOW** (*Weather Observations Website*) dan **Weather Underground PWS**.

---

## 📐 Arsitektur Sistem & Diagram Alir (Flowcharts)

### 1. Arsitektur Sistem Terintegrasi
Diagram berikut menggambarkan arsitektur dari lapisan sensor IoT di lapangan hingga lapisan analitik dan pelaporan:

```mermaid
flowchart TD
    subgraph IoT_Layer["1. Lapisan Sensor & Instrumentasi Lapangan"]
        S1["Suhu & Kelembapan (SHT30 / SHT35)"]
        S2["Tekanan Udara (BMP280 / BME280)"]
        S3["Curah Hujan Tipping Bucket"]
        S4["Kecepatan & Arah Angin (Anemometer)"]
        S5["Radiasi Surya (Pyranometer / BH1750)"]
        S6["Kelembapan & Suhu Tanah (Agromet)"]
        MCU["Mikrokontroler ESP32 / LoRa Node"]
        S1 --> MCU
        S2 --> MCU
        S3 --> MCU
        S4 --> MCU
        S5 --> MCU
        S6 --> MCU
    end

    subgraph Ingestion_Layer["2. Lapisan Telemetri & Ingesti Data"]
        Protocols{"Protokol: MQTT / HTTP / REST"}
        RTDB[("Firebase Realtime Database")]
        Firestore[("Cloud Firestore (Config & Kalibrasi)")]
        MCU --> Protocols
        Protocols --> RTDB
        Protocols --> Firestore
    end

    subgraph External_APIs["3. Layanan & Data Eksternal"]
        BMKG_API["API BMKG AWS & Prakiraan Cuaca"]
        ERA5_API["ECMWF ERA5 Reanalysis (Hourly)"]
        SEAS5_API["Open-Meteo ECMWF SEAS5 (51 Members)"]
        NOAA_CPC["NOAA CPC / IRI Climate Center"]
        BOM_AU["Bureau of Meteorology Australia"]
    end

    subgraph Processing_Engine["4. Mesin Pemrosesan & Analitik (Next.js API & Lib)"]
        QC["Quality Control & Boundary Check"]
        CalibEngine["Mesin Kalibrasi & Koreksi Bias (MBE / Linier / Polinomial)"]
        ImputeEngine["Mesin Imputasi Reanalisis ERA5"]
        WMOEngine["Mesin Ekstrem Sinoptik WMO (12-12 & 00-00 UTC)"]
        ClimateEngine["Mesin Prediksi Iklim Multi-Model (7 Pusat Iklim Global)"]
        
        RTDB --> QC
        QC --> CalibEngine
        CalibEngine --> ImputeEngine
        ERA5_API --> ImputeEngine
        ImputeEngine --> WMOEngine
        
        SEAS5_API --> ClimateEngine
        NOAA_CPC --> ClimateEngine
        BOM_AU --> ClimateEngine
    end

    subgraph UI_Presentation["5. Antarmuka Pengguna & Visualisasi (React 19 / ECharts)"]
        DashMet["Dasbor Meteorologi Real-Time & Profil Diurnal"]
        DashKlim["Klimatologi & Anomali Historis"]
        DashDrivers["Dinamika Iklim (ENSO, IOD, MJO, Monsun)"]
        DashCalib["Manajemen Kalibrasi & Kurva Sensor"]
        DashReports["Laporan Siap Cetak A4"]
        
        WMOEngine --> DashMet
        WMOEngine --> DashKlim
        CalibEngine --> DashCalib
        ClimateEngine --> DashDrivers
        WMOEngine --> DashReports
    end

    subgraph Outbound_Export["6. Distribusi & Ekspor Data"]
        WOW["UK Met Office WOW (Bulk CSV)"]
        WUnderground["Weather Underground PWS"]
        PDFPrint["Cetak Laporan PDF / A4"]
        SQLiteBackup["Cadangan SQLite Lokal"]
        
        DashReports --> WOW
        DashReports --> WUnderground
        DashReports --> PDFPrint
        DashReports --> SQLiteBackup
    end
```

---

### 2. Alur Pemrosesan Telemetri, QC, & Imputasi ERA5
Alur pembersihan data, pengujian fisik batas nilai (*gross error*), dan imputasi otomatis:

```mermaid
flowchart TD
    Start(["Data Telemetri Sensor Diterima"]) --> GrossCheck{"1. Uji Batas Fisik (Gross Limit)\nContoh: -10°C <= Suhu <= 55°C\n0% <= RH <= 100%"}
    GrossCheck -- "Gagal (Di Luar Batas)" --> FlagInvalid["Tandai Data Anomali / Buang"]
    GrossCheck -- "Lolos" --> StepCheck{"2. Uji Laju Perubahan (Step Test)\nΔSuhu <= 5°C/menit\nΔTekanan <= 4 hPa/10 menit"}
    
    StepCheck -- "Gagal" --> FlagSpike["Tandai Spike Anomali"]
    StepCheck -- "Lolos" --> Calibration{"3. Terapkan Koefisien Kalibrasi Aktif?"}
    
    Calibration -- "Ya" --> ApplyFit["Transformasi Nilai Terkalibrasi\n(MBE, Linier, atau Polinomial)"]
    Calibration -- "Tidak" --> RawStream["Gunakan Nilai Mentah"]
    
    ApplyFit --> GapCheck{"4. Apakah Terdapat Data Hilang (Gap > 1 Jam)?"}
    RawStream --> GapCheck
    
    GapCheck -- "Tidak Ada Gap" --> FinalDataset[("Basis Data Observasi Tervalidasi")]
    GapCheck -- "Ada Gap Observasi" --> QueryERA5["Query Titik Koordinat ke ECMWF ERA5 Hourly"]
    
    QueryERA5 --> TransferFunction["Terapkan Fungsi Transfer Kalibrasi Lokal\n(Koreksi Bias ERA5 ke Stasiun Setempat)"]
    TransferFunction --> ImputeRecord["Isi Slot Kosong dengan Nilai Terimputasi\n(Flag: isImputed = true)"]
    ImputeRecord --> FinalDataset
```

---

### 3. Alur Kalibrasi & Koreksi Bias Sensor
Mekanisme pencocokan waktu dengan instrumen standar (*benchmark*) dan penyimpanan ke Firestore:

```mermaid
flowchart LR
    SensorData["Data Sensor Uji (Node)"] --> Matching["Penyelarasan Waktu (Temporal Colocation)\nTimestamp Tolerance ±2 Menit"]
    BenchmarkData["Data Acuan Standar (BMKG AWS / Calibrator)"] --> Matching
    
    Matching --> CalcMetrics["Kalkulasi Metrik Perbedaan:\nMBE, MAE, RMSE, Pearson R, R²"]
    CalcMetrics --> SelectModel{"Pilih Model Regresi / Kalibrasi"}
    
    SelectModel --> MBE["1. Mean Bias Error (Offset)\ny = x + offset"]
    SelectModel --> Linear["2. Regresi Linier\ny = mx + c"]
    SelectModel --> Poly["3. Regresi Polinomial Derajat 2\ny = ax² + bx + c"]
    
    MBE --> LivePreview["Visualisasi Kurva Kalibrasi (ECharts)\nSebaran Titik Aktual vs Kurva Fitting"]
    Linear --> LivePreview
    Poly --> LivePreview
    
    LivePreview --> Apply["Klik Simpan & Terapkan (1-Click Apply)"]
    Apply --> FirestoreDoc[("Simpan ke Cloud Firestore\nKoleksi: sensor_calibrations")]
    FirestoreDoc --> LiveEngine["Aktif Otomatis pada Seluruh View & API"]
```

---

### 4. Alur Proyeksi Iklim Musiman Multi-Model (ENSO/IOD/MJO)
Arsitektur penarikan data 7 pusat iklim dunia dan visualisasi multi-mode:

```mermaid
flowchart TD
    Req(["Pengguna Memilih Wilayah Niño & Model Iklim"]) --> APIReq["GET /api/climate-drivers/enso/forecast\nParam: region (nino34, nino3, nino4, nino12)\nParam: model (mme, ecmwf, cfs, ukmo, bom, jma, meteo_france)"]
    
    APIReq --> FetchOpenMeteo["Tarik ECMWF SEAS5 dari Open-Meteo Seasonal API\n(51 Ensemble Members per Jam -> Agregasi Bulanan)"]
    
    FetchOpenMeteo --> ModelEngine{"Pusat Model yang Dipilih?"}
    
    ModelEngine -- "ECMWF" --> ECMWFData["51 Anggota Ansambel Riil SEAS5"]
    ModelEngine -- "MME Konsensus" --> MMEData["Konsensus Multi-Model Gabungan WMO (273 Anggota)"]
    ModelEngine -- "NOAA CFSv2" --> CFSData["NOAA NCEP CFSv2 (24 Anggota)"]
    ModelEngine -- "UKMO / BOM / JMA / MF" --> OtherModels["UKMO GloSea6 (42) / BOM (33) / JMA (30) / Météo-France (51)"]
    
    ECMWFData --> StatsCalc["Kalkulasi Anomali SST terhadap Baseline Iklim:\n- Ensemble Mean & Median\n- Rentang Keyakinan IQR (P25 - P75)\n- Sebaran Ekstrem (P10 - P90)\n- Probabilitas Tersil (% El Niño, Netral, La Niña)"]
    MMEData --> StatsCalc
    CFSData --> StatsCalc
    OtherModels --> StatsCalc
    
    StatsCalc --> ViewSwitch{"Pilih Mode Visualisasi (Frontend)"}
    
    ViewSwitch -- "compare" --> ChartCompare["Grafik Komparasi 7 Model\n(Semua model global diplot pada satu sumbu waktu)"]
    ViewSwitch -- "plume" --> ChartPlume["Grafik Ensemble Plume\n(51+ Garis Anggota + Pita Bayangan IQR 50% + Mean)"]
    ViewSwitch -- "prob" --> ChartProb["Grafik Probabilitas Fase\n(Diagram Batang Bertumpuk 100% per Bulan)"]
```

---

### 5. Alur Pelaporan & Ekspor Data Eksternal
Proses transformasi observasi harian/bulanan ke format interoperabilitas global:

```mermaid
flowchart TD
    UserSelect["Pilih Rentang Tanggal Observasi (Date Range Picker)"] --> FetchObs["Ambil Data Observasi Teragregasi dari Firebase/API"]
    FetchObs --> WMOAggregation["Agregasi Standar WMO / BMKG:\n- Tmax (12:00-12:00 UTC)\n- Tmin (00:00-00:00 UTC)\n- Curah Hujan 24 Jam (00:00-00:00 UTC)\n- Penyinaran Matahari & Evapotranspirasi"]
    
    WMOAggregation --> FormatOption{"Pilih Format Output"}
    
    FormatOption -- "Laporan Cetak A4" --> PrintView["Render Tata Letak A4 CSS @media print\n(Dialog Cetak Browser / Simpan PDF)"]
    FormatOption -- "WOW Met Office" --> WOWTransform["Konversi ke Skema Met Office WOW:\nFormat Tanggal: YYYY-MM-DD HH:mm:ss\nKonversi Satuan: Celcius, hPa, mm, km/h"]
    FormatOption -- "Weather Underground" --> WUStep["Format PWS Upload Data Stream"]
    FormatOption -- "Cadangan SQLite" --> SQLiteGen["Ekspor File Basis Data Relasional SQLite"]
    
    WOWTransform --> DownloadCSV["Unduh File CSV Bulk Upload WOW"]
```

---

## 🔬 Algoritma & Formulasi Ilmiah

### Kalibrasi & Koreksi Bias Sensor
Instrumen meteorologi IoT di lapangan kerap mengalami pergeseran instrumen (*sensor drift*) atau deviasi akibat efek mikroklimat sangkar radiasi. Dashboard ini mendukung 3 algoritma kalibrasi matematika terhadap alat standar:

#### 1. Mean Bias Error (Offset Correction)
Digunakan ketika deviasi sensor bersifat konstan sepanjang rentang pengukuran:
$$\text{MBE} = \frac{1}{N}\sum_{i=1}^{N}(y_i^{\text{sensor}} - y_i^{\text{ref}})$$
Nilai terkalibrasi:
$$y^{\text{cal}} = y^{\text{sensor}} - \text{MBE} = y^{\text{sensor}} + \text{offset}$$

#### 2. Regresi Linier ($y = mx + c$)
Mengoreksi kemiringan sensitivitas (*gain/span*) dan titik nol (*offset*):
$$m = \frac{N\sum(x_i y_i) - \sum x_i \sum y_i}{N\sum x_i^2 - (\sum x_i)^2}, \quad c = \bar{y} - m\bar{x}$$
Nilai terkalibrasi:
$$y^{\text{cal}} = m \cdot y^{\text{sensor}} + c$$

#### 3. Regresi Polinomial Derajat 2
Mengoreksi sensor non-linier (seperti sensor kelembapan relatif kapasitas tinggi atau anemometer cup pada rentang angin rendah):
$$y^{\text{cal}} = a \cdot (y^{\text{sensor}})^2 + b \cdot y^{\text{sensor}} + c$$

#### Metrik Evaluasi Kinerja Kalibrasi
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N}\sum_{i=1}^{N}|y_i^{\text{cal}} - y_i^{\text{ref}}|$$
- **Root Mean Square Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(y_i^{\text{cal}} - y_i^{\text{ref}})^2}$$
- **Koefisien Determinasi ($R^2$)**:
  $$R^2 = 1 - \frac{\sum (y_i^{\text{ref}} - y_i^{\text{cal}})^2}{\sum (y_i^{\text{ref}} - \bar{y}^{\text{ref}})^2}$$

---

### Koreksi Data, Adaptasi Pola Node, & Imputasi Celah 2-Fase

Berbeda dari modul **Kalibrasi Sensor** (yang menyimpan fungsi transfer pada lapisan tampilan Firestore tanpa menyentuh telemetri mentah), modul **Koreksi Data & Imputasi Celah** (`/dashboard/koreksi-data`) beroperasi langsung pada titik-titik waktu **RAW Firebase Realtime Database** beserta catatan audit permanen, dan mengutamakan replikasi pola mikroklimat khas masing-masing node stasiun pada skala waktu deterministik **WIB ($\text{UTC}+07:00$)**.

#### A. Mode Koreksi Nilai & Anomali (Point Correction)
Secara bawaan, halaman membuka mode **Interpolasi & Pola Node (Kosinus-Hermite)** dengan opsi **Hanya Koreksi Titik Anomali** aktif sehingga pembacaan sensor yang normal tetap utuh sementara titik anomali langsung direkonstruksi mengikuti pola diurnal node. Deteksi QC otomatis menandai empat jenis anomali: pelanggaran batas fisik **WMO No. 8** (`wmo_boundary`), lonjakan sesaat (`spike_jump`) yang dinormalisasi terhadap interval $\sqrt{\Delta t / 5}$ dengan pengecualian reset counter harian curah hujan `00:00 UTC` (`07:00 WIB`), sensor macet (`flatline`), dan paparan radiasi panas surya berlebih (`solar_overheating`, 09:00–17:30 WIB saat $\Delta T$ di atas *baseline* malam melampaui ambang batas sekaligus tetap positif terhadap kurva acuan node sehingga penurunan suhu sejuk sesaat tidak salah ditandai sebagai *overheating*).

Lima metode koreksi tersedia:
1. **Offset Tetap ($\Delta$)**:
   $$y'(t) = y(t) + \Delta$$
2. **Pergeseran Linier (*Linear Drift*)**:
   $$\Delta(t) = \delta_0 + \frac{t - t_0}{t_1 - t_0}(\delta_1 - \delta_0), \qquad y'(t) = y(t) + \Delta(t)$$
3. **Penjepitan Fisik WMO (*Physical Clamping*)**:
   $$y'(t) = \min(\text{Max}, \max(\text{Min}, y(t)))$$
4. **Faktor Skala (*Multiplicative Scaling*)**:
   $$y'(t) = k \cdot y(t)$$
5. **Interpolasi & Rekonstruksi Pola Node**:
   - **Kubik Monoton PCHIP (*Fritsch-Carlson*, standar WMO No. 8)**: Spline kubik Hermite dengan pembatasan gradien harmonik sehingga dijamin bebas osilasi palsu (*Runge's overshoot*) dan menjaga kemonotonan lokal antar jangkar valid.
   - **Akima Sub-Spline (5-Titik)**: Menghitung turunan lokal berbasis bobot selisih gradien 5 titik berurutan; tahan terhadap perubahan gradien tajam seperti *cold front*.
   - **Linier Berbobot Waktu**: Interpolasi lurus berbasis rasio milidetik $\tau = (t - t_A)/(t_B - t_A)$ untuk sampling asinkron.
   - **Terpandu Acuan (`model_guided`)**: Menyesuaikan fluktuasi kurva acuan ke titik jangkar valid $(t_A, y_A)$ dan $(t_B, y_B)$ secara kontinu per-menit via pencarian biner.
   - **Kosinus-Hermite S-Curve + Magnus RH (`solar_cosine_hermite`)**: Menghilangkan lompatan step (*C0/C1 discontinuity*) menggunakan fungsi transisi S-Curve:
     $$w(\tau) = \frac{1 - \cos(\pi \tau)}{2}, \quad \tau \in [0, 1]$$
     Bila opsi **Pulihkan RH Simultan** diaktifkan pada parameter `temperature`, nilai `humidity` dihitung ulang secara atomik dari $T_d$ dan $T'$ melalui persamaan Magnus-Tetens dan dijepit ketat pada batas fisik mutlak $[0\%, 100\%]$.

#### B. Rekonstruksi Berbasis Pola Node Sendiri (*Self-History* $H-1 \dots H-N$)
Agar kurva koreksi dan pengisian celah semirip mungkin dengan karakteristik mikroklimat node target (naungan vegetasi, elevasi, kelembapan lokal, dan ritme sunrise/sunset), sistem mengambil histori bersih stasiun itu sendiri untuk jendela *lookback* **1, 3, atau 7 hari** sebelumnya (`buildSelfHistoryDiurnalProfile`):
- Setiap observasi bersih yang lolos penyaringan kewajaran fisik dipetakan ke **1440 slot menit diurnal WIB** ($00:00 \dots 23:59$).
- Nilai tiap slot dihitung sebagai **median** (tahan terhadap pencilan sesaat), disambung secara melingkar (*circular wrapping* $23:59 \to 00:00\ \text{WIB}$), lalu dihaluskan menggunakan filter segitiga melingkar berbobot ($\pm 7$ menit) sehingga mempertahankan amplitudo puncak siang dan lembah dini hari.
- **Pengecualian Presipitasi**: Variabel `rainfall` (akumulasi harian UTC $00:00\text{Z}$) dan `rainrate` tidak menggunakan replikasi siklus diurnal karena kejadian hujan bersifat stokastik, sehingga celah curah hujan tetap mempertahankan perilaku *monotonic carry* dan reset harian `00:00 UTC`.

#### C. Penyangga Bahu Radiasi Surya (*Shoulder Buffer Expansion*) & Klasterisasi Visual ECharts
1. **Pelebaran Penyangga Anomali Bahu (*Shoulder Relaxation*)**:
   * *Akar Masalah Jangkar Terkontaminasi*: Saat sensor mengalami pemanasan surya berlebih (*solar overheating*), kenaikan suhu terjadi secara bertahap. Jika ambang kaku dipasang pada $\Delta T \ge +0.7^\circ\text{C}$, titik puncak (misal pukul 16:00 di 33.7°C) memang tertandai, namun lereng kenaikan (pukul 15:40 di 31.8°C dengan $\Delta T = +0.6^\circ\text{C}$) dianggap sebagai titik bersih (*clean anchor*). Akibatnya, interpolasi hanya menjembatani lereng yang sudah terlanjur panas sehingga kurva hasil koreksi tidak pernah turun ke kurva *baseline* acuan.
   * *Solusi Ekspansi*: Algoritma `effectiveAnomalyIndexSet` secara adaptif meluaskan jendela anomali ke arah kiri (mundur) dan kanan (maju) sepanjang jam siang (08:30–17:30 WIB) hingga kelebihan suhu mereda kembali di bawah ambang relaksasi ($\Delta T \le 0.25^\circ\text{C}$). Hal ini menjamin jangkar awal $(t_A, y_A)$ ditarik murni sebelum pemanasan terjadi dan jangkar akhir $(t_B, y_B)$ ditarik setelah sensor mendingin normal, sehingga kurva Kosinus-Hermite merekonstruksi seluruh kejadian panas tepat di atas kurva nominal diurnal stasiun:
     $$T_{\text{koreksi}}(t) = T_{\text{pola\_node}}(t) + \Delta T_{\text{malam}}$$
2. **Klasterisasi Penanda (*Clustered Peak MarkPoints & MarkArea*)**:
   * Menghilangkan penumpukan puluhan pin raksasa bertingkat (*visual clutter*) yang kerap menutupi grafik saat puluhan titik berurutan terdeteksi anomali.
   * Titik-titik anomali berurutan ($\le 3$ langkah sampling) digabung menjadi satu kluster terpadu. Sistem hanya menempatkan **tepat 1 pin penanda kompak** (`symbolSize: 32`) pada titik deviasi puncak (*peak deviation*), dilengkapi pita arsiran transparan durasi (*MarkArea*) lembut di latar belakang.

#### D. Adaptor Tanda Mikroklimat Node (*Node Signature Transfer* & Spatial Ridge Aman)
Saat pengguna memakai referensi eksternal (**Stasiun AWS Tetangga** atau **Model ECMWF IFS / ERA5**), sistem terlebih dahulu melatih fungsi transfer (`fitNodeSignatureTransferModel`) menggunakan pasangan data historis $H-1\dots H-N$ serta sampel malam hari dari node target:
$$\hat{y}_{\text{node}}(t) = \beta_0 \, r(t) + \beta_1 \sin\!\left(\frac{2\pi h_{\text{WIB}}}{24}\right) + \beta_2 \cos\!\left(\frac{2\pi h_{\text{WIB}}}{24}\right) + \beta_3$$
yang diselesaikan melalui regresi Ridge $L_2$ ($X^T X + \alpha I, \ \alpha = 1.0$) sehingga perbedaan amplitudo, pergeseran fase pagi/sore, dan offset dasar ikut menyesuaikan pola khas node target.
- **Guardrail Anti-Ekstrapolasi**: Model harmonik 4-fitur hanya diaktifkan jika sampel latih mencakup $\ge 24$ titik valid, $\ge 6$ jam unik, $\ge 2$ kuadran 6-jam yang berbeda, kemiringan wajar ($0.05 \le \beta_0 \le 2.5$), dan RMSE tidak lebih buruk daripada koreksi bias sederhana; jika data latih hanya berasal dari jam malam yang sempit, adaptor otomatis mundur ke pergeseran median skalar ($\hat{y}(t) = r(t) + \text{bias}$).

#### E. Mesin Imputasi Celah 2-Fase (`1440 Menit/Hari`)
Mengisi *missing timestamps* ke dalam grid seragam 1-menit kontinu melalui tiga tahap (`runUniversalGapImputation` & `buildCompleteGapNodePayloads`):
1. **Fase 1 — *Micro-Gap* ($\le \text{batas mikro}$, default 15 menit)**: Menggunakan spline kubik monoton PCHIP (*Fritsch-Carlson*), atau *monotonic rainfall carry* dengan deteksi batas reset harian `00:00 UTC` (`07:00 WIB`).
2. **Fase 2 — *Macro-Gap* ($> \text{batas mikro}$)**:
   - Pada mode **2-Fase Hibrida Otomatis**, prioritas berurutan adalah: **AWS Tetangga (Ridge teradaptasi)** $\to$ **Model ECMWF/ERA5 (teradaptasi)** $\to$ **Pola Node ($H-1\dots H-N$)** $\to$ **PCHIP** (tersedia juga mode khusus **Pola Node ($H-1\dots H-N$)** sebagai prioritas utama).
   - **Boundary-Conditioned Residual Bridging**: Selisih antara observasi valid sebelum/sesudah celah dengan prediksi acuan ($\delta_{\text{awal}}, \delta_{\text{akhir}}$) disisipkan mulus menggunakan kurva S Kosinus-Hermite (atau peluruhan eksponensial $\tau = 120$ menit bila celah terbuka di awal/akhir rentang) sehingga $\Delta = 0$ tepat di tepi celah tanpa patahan vertikal (*step-jump*).
3. **Fase 3 — *Physics Post-Processing* & Multi-Variabel RTDB**:
   - Penghalusan opsional *Savitzky-Golay* (otomatis dilewati untuk `rainfall` dan `rainrate` agar tidak menghasilkan presipitasi negatif).
   - Penjepitan batas WMO (`humidity` $\in [0\%, 100\%]$, `pressure` $\in [850, 1080]\ \text{hPa}$, non-negatif untuk intensitas angin/radiasi/hujan) serta penegakan konsistensi termodinamika $T_d \le T_{\text{ambient}}$ ketika menulis payload multi-variabel ke RTDB.

#### F. Sistem Pengawas Status Node & Deteksi Dini Anomali Suhu (*Real-Time Periodic Node Health & Temperature Anomaly Supervisor*)
Dashboard mengoperasikan subsistem pengawasan latar belakang mandiri (*background supervisor runtime*) yang berjalan otomatis saat pengguna membuka aplikasi dashboard tanpa membebani kinerja klien maupun konsumsi kuota Firebase:

1. **Arsitektur Eksekusi Hemat Daya (*Client-Side Throttled Supervisor*)**:
   - Dikelola oleh hook `useNodeHealthSupervisor` dan context global `NodeHealthProvider` (`/context/NodeHealthContext.tsx`).
   - Berjalan pada interval **2 menit** dengan memeriksa `document.visibilityState`: eksekusi otomatis **dijeda (pause)** saat tab peramban diminimalkan atau tidak aktif guna mencegah pemborosan panggilan jaringan dan kuota RTDB.
2. **Mesin Evaluasi Backend Terpusat (`/api/system/node-health`)**:
   - Setiap siklus, server mengevaluasi seluruh stasiun yang terdaftar pada pengguna secara paralel.
   - Mengambil 3 titik data terbaru (`limitToLast(3)`) per perangkat untuk meminimalkan beban bandwidth jaringan.
   - **Kriteria Deteksi Kenaikan Suhu Cepat (*Rapid Temperature Rise*)**:
     $$\frac{\Delta T}{\Delta t} \ge \frac{+2.0^\circ\text{C}}{15\ \text{menit}}$$
     Mendeteksi lonjakan panas mendadak (misalnya kegagalan insulasi sangkar radiasi, kebakaran lingkungan sekitar, atau gangguan sensor) berbasis diferensiasi waktu aktual dua titik telemetri berturutan.
   - **Kriteria Suhu Ekstrem & Galat Fisik Sensor (*Absolute Physical Bounds*)**:
     - **Panas Ekstrem (*Extreme Heat*)**: $T \ge 37.0^\circ\text{C}$ (kondisi kritis indeks kenyamanan tropis).
     - **Siaga Panas Tinggi (*High Heat Alert*)**: $T \ge 35.0^\circ\text{C}$.
     - **Suhu Dingin Anomali (*Cold Anomaly*)**: $T \le 18.0^\circ\text{C}$ (tidak wajar untuk dataran rendah tropis).
     - **Kerusakan Sensor (*Sensor Fault / Out of Bounds*)**: $T > 50.0^\circ\text{C} \lor T < 5.0^\circ\text{C}$.
   - **Pemantauan Daya & Komunikasi (*Battery & Station Offline*)**:
     - Tegangan Baterai Kritis: $V < 3.4\ \text{V}$.
     - Tegangan Baterai Rendah: $V < 3.6\ \text{V}$.
     - Stasiun Terputus (*Offline Timeout*): Selisih timestamp data terakhir $> 30\ \text{menit}$.
3. **Pencatatan Log & Deduplikasi Permanen RTDB**:
   - Setiap anomali yang lolos verifikasi dicatat secara atomik ke path Firebase Realtime Database:
     `logs/${userId}/${timestamp}`
   - **Jendela Deduplikasi 30 Menit**: Mencegah penumpukan log dan banjir notifikasi (*alert fatigue*) dengan memeriksa apakah peringatan sejenis untuk stasiun yang sama telah dicatat dalam kurun 30 menit terakhir.
   - Pengguna menerima notifikasi visual *Toast* interaktif secara *on-the-fly* pada antarmuka dashboard.

---

### Verifikasi Kategorikal Hujan & Tabel Kontingensi WMO/BMKG

Untuk mengevaluasi keandalan prakiraan presipitasi maupun estimasi satelit/ERA5 terhadap penakar hujan AWS, sistem menyediakan tabel kontingensi $2 \times 2$ biner berdasarkan ambang batas presipitasi ($T$, default $0.1\ \text{mm}$ untuk kejadian hujan/tidak hujan):

| Status Kejadian | Observasi $\ge T$ (Hujan) | Observasi $< T$ (Kering) | Total Prakiraan |
| :--- | :---: | :---: | :---: |
| **Prakiraan $\ge T$ (Hujan)** | **Hits ($a$)** | **False Alarms ($b$)** | $a + b$ |
| **Prakiraan $< T$ (Kering)** | **Misses ($c$)** | **Correct Negatives ($d$)** | $c + d$ |
| **Total Observasi** | $a + c$ | $b + d$ | $N = a + b + c + d$ |

#### Metrik Keterampilan Kategorikal (WMO Standard Verification)
- **Probability of Detection (POD / Hit Rate)**:
  $$\text{POD} = \frac{a}{a + c}, \quad [0, 1], \ \text{ideal} = 1.0$$
- **False Alarm Ratio (FAR)**:
  $$\text{FAR} = \frac{b}{a + b}, \quad [0, 1], \ \text{ideal} = 0.0$$
- **Frequency of Hits (FOH / Success Ratio)**:
  $$\text{FOH} = 1 - \text{FAR} = \frac{a}{a + b}, \quad [0, 1], \ \text{ideal} = 1.0$$
- **Critical Success Index (CSI / Threat Score)**:
  $$\text{CSI} = \frac{a}{a + b + c}, \quad [0, 1], \ \text{ideal} = 1.0$$
- **Heidke Skill Score (HSS)** (Mengoreksi keberuntungan acak / *random chance*):
  $$\text{HSS} = \frac{2(ad - bc)}{(a + c)(c + d) + (a + b)(b + d)}, \quad [-\infty, 1], \ \text{ideal} = 1.0$$

#### Klasifikasi Intensitas Hujan Harian BMKG
Sistem memetakan evaluasi per-kelas intensitas standar BMKG:
- **Sangat Ringan**: $R \le 5\ \text{mm/hari}$
- **Ringan**: $5 < R \le 20\ \text{mm/hari}$
- **Sedang**: $20 < R \le 50\ \text{mm/hari}$
- **Lebat**: $50 < R \le 100\ \text{mm/hari}$
- **Sangat Lebat**: $100 < R \le 150\ \text{mm/hari}$
- **Ekstrem**: $R > 150\ \text{mm/hari}$

---

### Metrik Hidrometeorologi & Uji Homogenitas Deret Waktu

#### 1. Nash-Sutcliffe Efficiency (NSE)
Mengukur proporsi variansi observasi yang berhasil dimodelkan oleh simulasi/reanalisis (Nash & Sutcliffe, 1970):
$$\text{NSE} = 1 - \frac{\sum_{i=1}^n (y_i^{\text{obs}} - y_i^{\text{sim}})^2}{\sum_{i=1}^n (y_i^{\text{obs}} - \bar{y}^{\text{obs}})^2}$$
- $\text{NSE} > 0.75$: **Sangat Baik**
- $0.65 < \text{NSE} \le 0.75$: **Baik**
- $0.50 \le \text{NSE} \le 0.65$: **Memuaskan**
- $\text{NSE} < 0.50$: **Tidak Memuaskan**

#### 2. RMSE-Observations Standard Deviation Ratio (RSR)
Standarisasi nilai RMSE terhadap dispersi data aktual (Moriasi et al., 2007):
$$\text{RSR} = \frac{\text{RMSE}}{\text{STDEV}_{\text{obs}}} = \frac{\sqrt{\frac{1}{n}\sum_{i=1}^n (y_i^{\text{obs}} - y_i^{\text{sim}})^2}}{\sqrt{\frac{1}{n}\sum_{i=1}^n (y_i^{\text{obs}} - \bar{y}^{\text{obs}})^2}}$$
- $\text{RSR} \le 0.50$: **Sangat Baik** | $0.50 < \text{RSR} \le 0.60$: **Baik** | $0.60 < \text{RSR} \le 0.70$: **Memuaskan** | $\text{RSR} > 0.70$: **Tidak Memuaskan**

#### 3. Kling-Gupta Efficiency (KGE)
Dekomposisi ortogonal korelasi, variabilitas, dan bias rata-rata (Gupta et al., 2009; Kling et al., 2012):
$$\text{KGE} = 1 - \sqrt{(r - 1)^2 + (\alpha - 1)^2 + (\beta - 1)^2}$$
di mana $r = \text{korelasi Pearson}$, $\alpha = \sigma_{\text{sim}} / \sigma_{\text{obs}}$, dan $\beta = \mu_{\text{sim}} / \mu_{\text{obs}}$. Dilengkapi proteksi kestabilan numerik jika $\mu_{\text{obs}} \approx 0$ atau $\sigma_{\text{obs}} \approx 0$.

#### 4. Uji Rescaled Adjusted Partial Sums (RAPS)
Mendeteksi diskontinuitas atau pergeseran struktural tiba-tiba (*structural shift*) akibat perubahan fisik lokasi stasiun:
$$S_k^* = \frac{\sum_{i=1}^k (Y_i - \bar{Y})}{s_Y \cdot \sqrt{n}}, \quad k=1, 2, \dots, n$$
Parameter statistik: $Q = \max(S_k^*) - \min(S_k^*)$ dan $R = \max |S_k^*|$.

#### 5. Kurva Massa Ganda (Double Mass Curve)
Memeriksa kestabilan konsistensi kumulatif deret observasi ($\sum Y_i$) terhadap deret referensi ($\sum X_i$). Rasio kemiringan $m_2 / m_1 \ne 1.0 \pm 0.10$ menandakan adanya pergeseran rezim mikroklimat atau drift instrumen.

#### 6. Uji Tren Monotonik Spearman ($r_s$)
Uji non-parametrik independen terhadap asumsi normalitas distribusi data:
$$r_s = 1 - \frac{6 \sum_{i=1}^n d_i^2}{n(n^2 - 1)}, \quad t = r_s \sqrt{\frac{n - 2}{1 - r_s^2}}$$

#### 7. Validasi Kecukupan Sampel
Sesuai pedoman WMO CIMO Guide, perbandingan observasi AWS dengan data reanalisis memerlukan sampel minimum kontinu:
$$N \ge 504\ \text{jam}\quad (3\ \text{minggu})$$
Peringatan visual otomatis muncul pada UI jika jumlah sampel yang cocok berada di bawah ambang batas kecukupan statistik ini.

---

### Reduksi Tekanan Barometrik ke Mean Sea Level Pressure (MSLP)

Pengukuran tekanan udara permukaan stasiun ($P_{\text{stn}}$) di stasiun inland/pegunungan harus dinormalisasi ke tekanan muka laut rata-rata (*Mean Sea Level Pressure* / MSLP, $P_0$) agar bias elevasi topografi tidak merusak validasi komparatif dengan model atmosfer permukaan laut:

Mengikuti persamaan barometrik atmosfer standar **WMO No. 8 & ICAO Doc 7488**:
$$P_0 = P_{\text{stn}} \left(1 + \frac{L \cdot h}{T_{\text{stn}}}\right)^{\frac{g \cdot M}{R \cdot L}}$$
Konversi sebaliknya (MSLP ke tekanan stasiun):
$$P_{\text{stn}} = P_0 \left(1 + \frac{L \cdot h}{T_{\text{stn}}}\right)^{-\frac{g \cdot M}{R \cdot L}}$$
Konstanta fisik baku:
- Lapse rate suhu troposfer standar ($L$): $0.0065\ \text{K/m}$ ($6.5^\circ\text{C}$ per $1000\ \text{m}$)
- Percepatan gravitasi standar ($g$): $9.80665\ \text{m/s}^2$
- Massa molar udara kering ($M$): $0.0289644\ \text{kg/mol}$
- Konstanta gas universal ($R$): $8.31432\ \text{J/(mol}\cdot\text{K)}$
- Eksponen barometrik: $\frac{g \cdot M}{R \cdot L} \approx 5.25588$
- Suhu termodinamika absolut: $T_{\text{stn}} = T\ (^\circ\text{C}) + 273.15\ \text{K}$

---

### Verifikasi Probabilistik Ensambel (CRPS, Brier Score, & Reliability)

#### 1. Continuous Ranked Probability Score (CRPS)
Mengukur jarak kuadrat antara fungsi distribusi kumulatif ansambel $F(x)$ terhadap fungsi tangga Heaviside observasi aktual $H(x - y)$ (Hersbach, 2000):
$$\text{CRPS}(F, y) = \int_{-\infty}^{\infty} [F(x) - \mathbf{1}(x \ge y)]^2 dx$$
Untuk ansambel diskrit dengan $M$ anggota ($x_1 \le x_2 \le \dots \le x_M$):
$$\text{CRPS} = \frac{1}{M}\sum_{m=1}^M |x_m - y| - \frac{1}{2M^2}\sum_{i=1}^M \sum_{j=1}^M |x_i - x_j|$$
- Memiliki satuan yang sama dengan variabel yang dievaluasi (misal $^\circ\text{C}$ atau mm).
- Tereduksi secara konsisten menjadi Mean Absolute Error (MAE) jika ukuran ansambel $M = 1$ (model deterministik).

#### 2. Brier Score (BS) & Brier Skill Score (BSS)
Mengukur akurasi kuadrat probabilitas prakiraan kejadian biner ($p_k \in [0, 1]$) terhadap kejadian aktual ($o_k \in \{0, 1\}$) pada ambang hujan tertentu:
$$\text{BS} = \frac{1}{N}\sum_{k=1}^N (p_k - o_k)^2, \quad \text{BS} \in [0, 1], \ \text{ideal} = 0.0$$
Skill score terhadap frekuensi klimatologi sampel ($\bar{o}$):
$$\text{BSS} = 1 - \frac{\text{BS}}{\text{BS}_{\text{clim}}} = 1 - \frac{\text{BS}}{\bar{o}(1 - \bar{o})}, \quad [-\infty, 1], \ \text{ideal} = 1.0$$

#### 3. Dekomposisi Tiga Komponen Murphy (1973) & Reliability Diagram
Brier Score didekomposisi secara analitik menjadi tiga suku ortogonal:
$$\text{BS} = \text{Reliability (REL)} - \text{Resolution (RES)} + \text{Uncertainty (UNC)}$$
di mana sampel dikelompokkan ke dalam $K=10$ bin probabilitas nominal ($p_k$):
- **Reliability (Keandalan)**: $\text{REL} = \sum_{k=1}^K \frac{N_k}{N} (p_k - \bar{o}_k)^2$ (penyimpangan kurva model dari garis diagonal 1:1, ideal = 0).
- **Resolution (Resolusi)**: $\text{RES} = \sum_{k=1}^K \frac{N_k}{N} (\bar{o}_k - \bar{o})^2$ (kemampuan membedakan kondisi kejadian ekstrem dari rata-rata klimatologi, semakin besar semakin baik).
- **Uncertainty (Ketidakpastian Alamiah)**: $\text{UNC} = \bar{o}(1 - \bar{o})$ (variansi inheren kejadian dalam sampel).
- **Visualisasi Diagram Reliabilitas**: Kurva model hanya menghubungkan bin dengan sampel aktual ($N_k > 0$) untuk mengeliminasi titik palsu, dilengkapi garis referensi 1:1, garis no-skill, dan histogram ketajaman (*sharpness bar*) untuk menunjukkan seberapa sering model berani memprediksi probabilitas tinggi.

---

### Analisis Curah Hujan Rencana & Statistik Frekuensi Hidrologi

Modul ini menghitung estimasi curah hujan rencana untuk periode ulang $T \in \{2, 5, 10, 20, 50, 100\}$ tahun dari deret Hujan Harian Maksimum Tahunan (HHMT) berdasarkan 4 distribusi probabilitas hidrologi standar WMO No. 168 dan Pedoman Analisis Hidrologi PUPR/BMKG:

#### 1. Distribusi Normal (Gauss)
Mengasumsikan distribusi variabel acak simetris dengan koefisien kemencengan $C_s \approx 0$:
$$X_T = \bar{X} + K_T \cdot s_X$$
di mana $K_T = z$ merupakan kuantil baku normal standar pada probabilitas kumulatif $F = 1 - 1/T$.

#### 2. Distribusi Log-Normal (2-Parameter)
Variabel ditransformasikan ke bentuk logaritma basis 10 ($Y = \log_{10} X$):
$$Y_T = \bar{Y} + K_T \cdot s_Y \implies X_T = 10^{Y_T}$$

#### 3. Distribusi Log-Pearson Tipe III (LP3)
Memperhitungkan ketidaksimetrisan deret logaritma menggunakan koefisien kemencengan $C_{sy}$:
$$Y_T = \bar{Y} + K_T(C_{sy}, T) \cdot s_Y \implies X_T = 10^{Y_T}$$
Faktor frekuensi $K_T$ dihitung menggunakan interpolasi tabel US Water Resources Council (Bulletin 17B/17C) dipadukan dengan transformasi analitik Wilson-Hilferty / Kite (1977):
$$K_T = \frac{2}{C_{sy}} \left[ \left( \frac{C_{sy}}{6}\left(z - \frac{C_{sy}}{6}\right) + 1 \right)^3 - 1 \right]$$

#### 4. Distribusi Gumbel Tipe I (Extreme Value Type I)
Menganalisis nilai-nilai ekstrem asimtotik:
$$Y_T = -\ln\left(-\ln\left(1 - \frac{1}{T}\right)\right)$$
$$X_T = \bar{X} + \frac{Y_T - Y_n}{S_n} s_X$$
di mana $Y_n$ (*reduced mean*) dan $S_n$ (*reduced standard deviation*) dikoreksi berdasarkan ukuran sampel data aktual ($n$).

#### 5. Uji Kecocokan Distribusi (*Goodness of Fit*)
- **Uji Chi-Square ($\chi^2$)**: Menguji signifikansi perbedaan antara frekuensi teramati $O_j$ dengan frekuensi ekspektasi $E_j = n/K$ pada $K$ kelas interval probabilitas:
  $$\chi^2 = \sum_{j=1}^K \frac{(O_j - E_j)^2}{E_j} < \chi^2_{\text{kritis}}(\alpha=0.05, dk)$$
  dengan derajat kebebasan $dk = K - (p + 1)$ ($p=2$ untuk Normal/LN/Gumbel; $p=3$ untuk LP3).
- **Uji Kolmogorov-Smirnov (KS)**: Menghitung selisih vertikal mutlak maksimum antara posisi plotting empiris Weibull $P_{\text{empiris}}(m) = \frac{m}{n+1}$ terhadap fungsi kumulatif teoritis $P_{\text{teoritis}}(X_m)$:
  $$\Delta P_{\max} = \max_{1 \le m \le n} |P_{\text{empiris}}(m) - P_{\text{teoritis}}(X_m)| < \Delta P_{\text{kritis}}(\alpha=0.05, n) \approx \frac{1.36}{\sqrt{n}}$$
- **Sistem Rekomendasi Otomatis**: Memilih distribusi yang lolos kedua uji ($\chi^2 < \chi^2_{\text{kritis}}$ dan $\Delta P_{\max} < \Delta P_{\text{kritis}}$) dengan galat $\Delta P_{\max}$ terkecil.

---

### Curah Hujan Wilayah Metode Poligon Thiessen Terpotong (*Clipped Voronoi*)

Untuk memperhitungkan heterogenitas spasial hujan di Kabupaten Kebumen (yang memiliki topografi gabungan pegunungan karst hulu di Sempor/Karangsambung dan dataran rendah pesisir di Ambal/Klirong), curah hujan wilayah dihitung menggunakan metode Poligon Thiessen:

1. **Pembentukan Poligon Voronoi Dinamis**: Dibangun menggunakan algoritma pemotongan bidang setengah (*Sutherland-Hodgman Half-Plane Clipping*) pada koordinat 20 stasiun jaringan Kebumen, lalu dipotong secara presisi terhadap batas administrasi Kabupaten Kebumen (`kebumen_kecamatan.json`).
2. **Normalisasi Bobot Luasan ($w_i$)**:
   $$w_i = \frac{A_i}{A_{\text{total}}}, \quad \sum_{i=1}^k w_i = 1.0 \ (100\%)$$
   dengan $A_{\text{total}} = 1.281,1\text{ km}^2$.
3. **Curah Hujan Rata-rata Tertimbang**:
   $$R_{\text{areal}} = \sum_{i=1}^k w_i \cdot R_i$$
4. **Reaktivitas Interaktif**: Sistem memungkinkan pengguna mengaktifkan/menonaktifkan stasiun tertentu secara langsung melalui peta GIS, dan poligon Thiessen serta bobot $w_i$ stasiun lain akan langsung dihitung ulang secara instan (*recalculated*).

---

### Parameter Turunan Meteorologi

#### 1. Titik Embun / Dew Point ($T_d$) — Formula Magnus-Tetens
Sesuai rekomendasi WMO dan Murray (1967):
$$\gamma(T, RH) = \frac{b \cdot T}{c + T} + \ln\left(\frac{RH}{100}\right)$$
$$T_d = \frac{c \cdot \gamma(T, RH)}{b - \gamma(T, RH)}$$
Konstanta empiris:
- $b = 17.27$
- $c = 237.7^\circ\text{C}$ (rentang suhu $0^\circ\text{C} \le T \le 60^\circ\text{C}$, akurasi $\pm 0.1^\circ\text{C}$)

#### 2. Indeks Kenyamanan / Panas (Heat Index) — Formula Rothfusz (NOAA NWS)
Untuk suhu udara $T \ge 27^\circ\text{C}$ ($80^\circ\text{F}$) dan kelembapan $RH \ge 40\%$:
$$\text{HI} = c_1 + c_2 T + c_3 RH + c_4 T \cdot RH + c_5 T^2 + c_6 RH^2 + c_7 T^2 \cdot RH + c_8 T \cdot RH^2 + c_9 T^2 \cdot RH^2$$
*(dilengkapi penyesuaian koreksi kelembapan ekstrem rendah dan tinggi sesuai pedoman National Weather Service AS).*

#### 3. Evapotranspirasi Acuan ($ET_0$) — Formula Hargreaves-Samani (FAO-56)
Menghitung kehilangan air referensi harian berbasis suhu dan radiasi ekstraterestrial ($R_a$):
$$ET_0 = 0.0023 \cdot \frac{R_a}{\lambda} \cdot (T_{\text{mean}} + 17.8) \cdot \sqrt{T_{\text{max}} - T_{\text{min}}}$$
di mana $\lambda = 2.45\ \text{MJ/kg}$ adalah panas laten penguapan air.

#### 4. Akumulasi Curah Hujan Numerik (Trapezoidal Rule)
Karena sensor mengirimkan laju intensitas hujan (*rain rate* dalam mm/jam) pada interval waktu asinkron $\Delta t$, total presipitasi dihitung dengan integrasi numerik trapesium:
$$R_{\text{total}} = \sum_{k=1}^{n-1} \left(\frac{RR_k + RR_{k+1}}{2}\right) \times \left(\frac{t_{k+1} - t_k}{3600}\right)$$
dengan batasan fisik $\Delta t \le 1800\ \text{detik}$ (30 menit) dan $RR \le 300\ \text{mm/jam}$ untuk mengeliminasi lonjakan akibat konektivitas terputus.

#### 5. Estimasi Radiasi Surya dari Sensor Iluminansi (Lux)
Konversi dari Lux (lumen/m²) ke radiasi energi radiasi gelombang pendek ($W/m^2$):
$$R_{\text{solar}} \approx \text{Lux} \times 0.0079\ \text{W/m}^2$$
*(Faktor pembagi standar radiasi spektrum matahari WMO untuk fotodetektor silikon).*

---

### Standar Jendela Waktu Ekstrem Sinoptik WMO/BMKG
Sistem mengadopsi standar observasi sinoptik internasional (WMO No. 306 & BMKG) agar data ekstrem stasiun dapat diverifikasi langsung dengan stasiun meteorologi resmi:

| Parameter | Jendela Waktu Observasi (UTC) | Jendela Waktu Indonesia Barat (WIB) | Keterangan Standar |
| :--- | :--- | :--- | :--- |
| **Suhu Maksimum ($T_{\text{max}}$)** | **12:00 UTC – 12:00 UTC** | **19:00 WIB (H-1) – 19:00 WIB (H)** | Menangkap puncak pemanasan insolasi matahari siang hari |
| **Suhu Minimum ($T_{\text{min}}$)** | **00:00 UTC – 00:00 UTC** | **07:00 WIB (H) – 07:00 WIB (H+1)** | Menangkap puncak pendinginan radiatif dini hari |
| **Curah Hujan Harian ($RR$)** | **00:00 UTC – 00:00 UTC** | **07:00 WIB (H) – 07:00 WIB (H+1)** | Standar penakar hujan Hellmann BMKG |
| **Hujan Ekstrem 24 Jam** | *Rolling Window 24-Jam* | Bergerak setiap jam | Deteksi dini banjir bandang & hidrometeorologi |

---

### Imputasi Reanalisis Atmosfer (ECMWF ERA5)
Jika stasiun mengalami mati listrik atau gangguan telemetri, sistem mengaktifkan modul imputasi:
1. Menarik data reanalisis per jam (*hourly surface levels*) dari model reanalisis atmosfer global **ECMWF ERA5**.
2. Melakukan interpolasi spasial bilineier (*bilinear interpolation*) dari grid 0.25° (~28 km) ke titik koordinat presisi stasiun.
3. Mengaplikasikan **Transfer Function Regresi Kalibrasi Lokal** yang dilatih dari pasangan data historis sensor-ERA5 untuk mengeliminasi bias mikroklimat elevasi lokal.
4. Memberikan tanda atribut khusus (`isImputed: true, imputedSource: "ECMWF-ERA5"`) demi transparansi data ilmiah.

---

### Prakiraan Ansambel Musiman Multi-Model Global
Untuk prakiraan jangka panjang 6–7 bulan (ENSO Niño 3.4, IOD, MJO):
- Menggabungkan **7 Pusat Iklim Global Operasional WMO**:
  1. 🌐 **WMO MME**: Multi-Model Consensus (273 anggota)
  2. 🇪🇺 **ECMWF SEAS5**: 51 anggota ansambel
  3. 🇺🇸 **NOAA CFSv2**: 24 anggota ansambel
  4. 🇬🇧 **UKMO GloSea6**: 42 anggota ansambel
  5. 🇦🇺 **BOM ACCESS-S2**: 33 anggota ansambel
  6. 🇯🇵 **JMA CPS3**: 30 anggota ansambel
  7. 🇫🇷 **Météo-France System 8**: 51 anggota ansambel
- Menghitung **Pita Keyakinan Interkuartil (IQR)**: Persentil 25 ($P_{25}$) dan Persentil 75 ($P_{75}$) untuk memetakan rentang kepastian 50%.
- Menghitung **Distribusi Tersil Fase**:
  - Peluang El Niño ($\text{Anomali SST} \ge +0.5^\circ\text{C}$)
  - Peluang Netral ($-0.5^\circ\text{C} < \text{Anomali SST} < +0.5^\circ\text{C}$)
  - Peluang La Niña ($\text{Anomali SST} \le -0.5^\circ\text{C}$)

---

### Peramalan Curah Hujan Fuzzy Time Series (FTS Chen & Song-Chissom)

Untuk peramalan cepat curah hujan lokal pada resolusi dasarian (10 hari) dan bulanan tanpa memerlukan beban server inferensi deep learning eksternal, sistem mengimplementasikan algoritma **Fuzzy Time Series (FTS) Chen (1996)** yang diperluas dari kerangka **Song & Chissom (1993)** murni dalam TypeScript (`lib/forecasting/fuzzyTimeSeries.ts`):

1. **Penentuan Semesta Pembicaraan (*Universe of Discourse*) $U$**:
   $$U = [D_{\min} - D_1, \; D_{\max} + D_2]$$
   di mana $D_{\min}$ dan $D_{\max}$ adalah nilai observasi curah hujan historis minimum dan maksimum, sedangkan $D_1$ dan $D_2$ adalah konstanta batas penyangga (dijaga non-negatif $U_{\min} \ge 0\ \text{mm}$).

2. **Partisi Interval & Penentuan Nilai Tengah ($m_i$)**:
   Semesta $U$ dipartisi menjadi $k$ interval dengan panjang sama:
   $$u_i = [l_i, u_i], \quad \text{panjang interval } l = \frac{U_{\max} - U_{\min}}{k}$$
   Nilai tengah (*midpoint*) masing-masing interval:
   $$m_i = \frac{l_i + u_i}{2}, \quad i = 1, 2, \dots, k$$
   Jumlah interval $k$ dapat diatur secara adaptif mengikuti Aturan Sturges: $k = \lceil 1 + 3.322 \log_{10}(n) \rceil$.

3. **Fuzzifikasi**:
   Data observasi numerik aktual $x(t)$ dipetakan ke himpunan fuzzy $A_i$ jika $x(t) \in u_i$.

4. **Pembentukan Hubungan Logika Fuzzy (*Fuzzy Logical Relationships* / FLR)**:
   Jika $x(t-1)$ difuzzifikasi ke $A_i$ dan $x(t)$ difuzzifikasi ke $A_j$, maka terbentuk relasi:
   $$A_i \to A_j$$

5. **Pengelompokan Relasi Logika Fuzzy (*Fuzzy Logical Relationship Groups* / FLRG)**:
   Seluruh relasi yang memiliki sisi kiri (*antecedent*) sama dikelompokkan:
   $$A_i \to A_{j_1}, A_{j_2}, \dots, A_{j_p}$$

6. **Defuzzifikasi Aturan Rata-Rata Chen (1996)**:
   Nilai ramalan dihitung berdasarkan tiga kondisi berikut:
   - **Kasus 1**: Jika sisi kanan relasi kosong ($A_i \to \emptyset$), maka nilai ramalan adalah nilai tengah intervalnya sendiri:
     $$\hat{y}_t = m_i$$
   - **Kasus 2**: Jika sisi kanan hanya memiliki satu relasi ($A_i \to A_j$), maka nilai ramalan adalah nilai tengah interval tujuan:
     $$\hat{y}_t = m_j$$
   - **Kasus 3**: Jika sisi kanan memiliki $p$ relasi ($A_i \to A_{j_1}, A_{j_2}, \dots, A_{j_p}$), maka nilai ramalan adalah rata-rata nilai tengah seluruh interval tujuan:
     $$\hat{y}_t = \frac{1}{p}\sum_{c=1}^{p} m_{j_c}$$

7. **Metrik Akurasi**:
   - $\text{MAPE} = \frac{1}{N}\sum_{t=1}^{N}\left|\frac{y_t - \hat{y}_t}{y_t}\right| \times 100\%$
   - $\text{RMSE} = \sqrt{\frac{1}{N}\sum_{t=1}^{N}(y_t - \hat{y}_t)^2}$

---

### Pipeline Rekayasa Fitur Meteorologi & Deret Waktu

Modul `lib/forecasting/meteorologicalFeatures.ts` mentransformasikan observasi per jam mentah menjadi matriks fitur berkualitas tinggi bebas kebocoran data (*data leakage*):

1. **Encoding Waktu Siklik Ortonormal**:
   $$\sin_{\text{hour}} = \sin\left(\frac{2\pi \cdot h}{24}\right), \quad \cos_{\text{hour}} = \cos\left(\frac{2\pi \cdot h}{24}\right)$$
   $$\sin_{\text{month}} = \sin\left(\frac{2\pi \cdot m}{12}\right), \quad \cos_{\text{month}} = \cos\left(\frac{2\pi \cdot m}{12}\right)$$
   $$\sin_{\text{DOY}} = \sin\left(\frac{2\pi \cdot \text{DOY}}{365.25}\right), \quad \cos_{\text{DOY}} = \cos\left(\frac{2\pi \cdot \text{DOY}}{365.25}\right)$$

2. **Variabel Fisis Atmosfer Turunan**:
   - **Titik Embun ($T_d$)**: Dihitung dengan rumus Magnus-Tetens.
   - **Defisit Tekanan Uap / Vapor Pressure Deficit (VPD)**:
     $$e_s(T) = 0.61078 \exp\left(\frac{17.27 T}{T + 237.3}\right)\ \text{kPa}, \quad \text{VPD} = e_s(T) \cdot \left(1 - \frac{RH}{100}\right)$$
   - **Suhu Terasa / Apparent Temperature ($T_{\text{app}}$)**: Menggunakan formula Steadman dengan pengaruh angin dan kelembapan.

3. **Statistik Jendela Bergerak (*Rolling Window*)**:
   - Perubahan 3-jam: $\Delta T_{3h} = T_t - T_{t-3}$, $\Delta P_{3h} = P_t - P_{t-3}$, $\Delta RH_{3h} = RH_t - RH_{t-3}$.
   - Simpangan baku 24-jam: $\sigma_{24h}(T)$ dan $\sigma_{24h}(RH)$.
   - Akumulasi presipitasi: $R_{3h} = \sum_{k=0}^{2} R_{t-k}$ dan $R_{24h} = \sum_{k=0}^{23} R_{t-k}$.

4. **Z-Score Anomali Klimatologis**:
   $$Z_{\text{anomali}} = \frac{x_{m,h} - \mu_{m,h}^{\text{klimatologi}}}{\sigma_{m,h}^{\text{klimatologi}}}$$
   dihitung terhadap normal 288 kombinasi bulan-jam ($12 \times 24$) khas pesisir selatan Kebumen.

5. **Imputasi Tanpa Kebocoran (*Forward-Fill / LOCF*)**:
   Pembersihan data hilang menggunakan *Last Observation Carried Forward* dengan batas jendela waktu lag maksimum (default 6 jam); gap yang melebihi batas diisi oleh profil diurnal klimatologi stasiun.

---

### Backend Python ML Service & Kontrak Antarmuka JSON

Layanan pembelajaran mesin berbasis Python Cloud Functions (`functions-python/main.py`) bertindak sebagai mesin pelatihan dan inferensi lanjutan dengan antarmuka proksi BFF di `app/api/weather/ml-model/route.ts`:

#### Spesifikasi Kontrak JSON Antarmuka Next.js & Python

| Aksi (`action`) | Metode | Payload Masukan (Request Body) | Respons Utama (Response Body) |
| :--- | :--- | :--- | :--- |
| `train` | POST | `{ action: "train", modelType: "xgboost" \| "random_forest", sampleSize: 365 }` | `{ success: true, modelType, accuracy, featureImportances: [ [name, score], ... ], message }` |
| `predict` | POST | `{ action: "predict", features: { temperature, humidity, pressure, pressure_change_3h, rain_accum_3h, ... } }` | `{ success: true, predictedClass, intensityLabel, probabilities: { nihil, ringan, sedang, lebat }, shapContributions: [ { feature, value, contribution } ] }` |
| `optimize` | POST | `{ action: "optimize", nTrials: 15, targetMetric: "rmse" }` | `{ success: true, bestParams: { n_units, dropout, learning_rate, sequence_length, batch_size }, bestLossRmse, nTrials, algorithm }` |

- **XGBoost & Random Forest Classifier**: Memprediksi 4 kelas intensitas hujan BMKG: Nihil (0 mm), Ringan (0.5–20 mm), Sedang (20–50 mm), dan Lebat (>50 mm).
- **Atribusi Nilai SHAP (*SHapley Additive exPlanations*)**: Menghitung kontribusi fisis masing-masing prediktor (positif: mendorong hujan; negatif: menekan konveksi).
- **Optimasi Hyperparameter Bayesian (Optuna TPE Sampler)**: Mencari kombinasi parameter arsitektur LSTM terbaik (`n_units`, `dropout`, `learning_rate`, `sequence_length`, `batch_size`) untuk meminimalkan RMSE.

---

### Adaptor Model Cuaca AI Generasi Baru: WeatherNext 3 / PARDIG

Modul `lib/weather-models/weatherNext3Adapter.ts` menyediakan lapisan normalisasi untuk luaran model prakiraan cuaca global berbasis kecerdasan buatan (*AI Numerical Weather Prediction* / DeepMind WeatherNext 3 & ECMWF AI NWP):

1. **Konversi Satuan Fisis**:
   - Suhu: $T(^\circ\text{C}) = T(\text{K}) - 273.15$
   - Vektor Angin $u, v$:
     $$\text{Wind Speed} = \sqrt{u^2 + v^2}\ (\text{m/s}), \quad \text{Wind Direction} = \left(\text{atan2}(-u, -v) \times \frac{180}{\pi} + 360\right) \pmod{360}$$
   - Presipitasi: $P_{\text{mm}} = P_{\text{meter}} \times 1000$
   - Tekanan: $P_{\text{hPa}} = P_{\text{Pa}} / 100$

2. **Resolusi Spasial & Siklus Operasional**:
   - Resolusi spasial tinggi $0.05^\circ$ (~5.5 km) untuk stasiun tapak Kebumen.
   - Mode *Deterministic Hourly*: jangkauan 48 jam dengan pembaruan siklus 24x/hari.
   - Mode *Medium-Range Ensemble*: jangkauan 15 hari dengan 64 anggota ensambel siklus 6-jam.

3. **Integrasi Konsensus Multi-Model**:
   Dapat diaktifkan secara dinamis pada konsensus prakiraan cuaca `app/api/weather/consensus/route.ts` melalui *feature flag* variabel lingkungan `ENABLE_WEATHERNEXT3=true` atau parameter URL `?weathernext=true`.

---

## 🌐 Sumber Data & Integrasi Eksternal

| Sumber Data | Institusi / Penyedia | Parameter / Produk | Frekuensi Pembaruan | Protokol Integrasi |
| :--- | :--- | :--- | :--- | :--- |
| **IoT Sensor Node** | Stasiun AWS Lokal Jerukagung | Suhu, RH, Tekanan Udara, Angin, Hujan, Radiasi, Tanah | 10–60 detik | MQTT / HTTP / Firebase RTDB |
| **BMKG Open Data** | BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) | Prakiraan Cuaca Kecamatan, Cuaca Ekstrem, Gempa Bumi | Real-time / 3-Jam | REST API / XML / JSON |
| **BMKG AWS Network** | BMKG | Data observasi stasiun pembanding terdekat | 10 Menit | REST API Client |
| **ECMWF ERA5** | Copernicus Climate Change Service (C3S) | Reanalisis Atmosfer Permukaan (Suhu, Titik Embun, Angin, Tekanan) | Historis Hourly | Open-Meteo Archive / CDS API |
| **ECMWF SEAS5** | ECMWF (Eropa) | Prediksi Musiman Suhu Permukaan Laut (SST Anomaly) Pasifik | Bulanan | Open-Meteo Seasonal API |
| **NOAA CPC** | NOAA Climate Prediction Center | Oceanic Niño Index (ONI), Niño 1+2, 3, 3.4, 4, Konsensus Resmi | Mingguan / Bulanan | Data Stream & Text Parser |
| **BOM Australia** | Australian Bureau of Meteorology | Indeks DMI (IOD), SOI (Southern Oscillation), RMM MJO | Harian / Mingguan | BOM Datafeed HTTP |
| **Met Office WOW** | Met Office (Inggris) | Weather Observations Website ingest & bulk upload | Harian / Sesuai Jadwal | HTTP POST / CSV Bulk Import |
| **Weather Underground**| The Weather Company / IBM | PWS Data API | Real-time | Rapid Fire PWS Protocol |

---

## 🎛️ Fitur-Fitur Utama Modul Dasbor

### 1. Modul Meteorologi (`/dashboard/meteorologi`)
- Pemantauan metrik langsung (*Live Gauges*) dengan penanda rentang nyaman.
- Profil diurnal 24 jam (pola fluktuasi harian suhu, kelembapan, radiasi, dan angin).
- Visualisasi mawar angin (*Wind Rose*) 16 arah mata angin lengkap dengan distribusi kecepatan.
- Grafik deret waktu interaktif Apache ECharts dengan penyesuaian tema *Light* dan *Dark Mode*.

### 2. Modul Klimatologi (`/dashboard/klimatologi`)
- Kalender panas (*Heatmap Calendar*) harian untuk suhu maksimum, minimum, dan intensitas hujan.
- Rekapitulasi bulanan dan perbandingan terhadap normal iklim WMO 30 tahun (1991–2020).
- Deteksi hari hujan (*Rainy Days*), hari kering berturut-turut (*Consecutive Dry Days* / CDD), dan hari sangat basah (*R95p*).

### 3. Modul Pendorong Iklim Global (`/dashboard/climate-drivers`)
- **ENSO (El Niño - Southern Oscillation)**:
  - Selector 7 Pusat Iklim Global (ECMWF, NOAA, UKMO, BOM, JMA, Météo-France, MME).
  - Mode Komparasi 7 Model simultan.
  - Ensemble Member Plume (51+ garis proyeksi) dan pita keyakinan 50% IQR.
  - Diagram batang stacked probabilitas tersil fase.
  - Deret waktu indeks historis ONI, Niño 1+2, 3, 3.4, 4, dan SOI.
- **IOD (Indian Ocean Dipole)**:
  - Dipole Mode Index (DMI) pasut barat vs timur Samudra Hindia.
- **MJO (Madden-Julian Oscillation)**:
  - Diagram fase Wheeler-Hendon (Fase 1–8) dan tracing amplitudo RMM1 / RMM2.
- **Indeks Monsun**:
  - Analisis indeks monsun Australia (AUSMI) dan Pasifik Barat Laut (WNPMI).

### 4. Modul Kalibrasi & Validasi Sensor (`/dashboard/kalibrasi`)
- Uji deviasi instrumen terhadap sensor standar.
- Pengaturan metode kalibrasi per variabel: MBE (Offset), Regresi Linier, atau Regresi Polinomial derajat 2.
- Visualisasi kurva fitting dinamis secara instan (*Live Scatter & Fitted Line Curve*).
- Fitur *1-Click Apply & Sync* ke Cloud Firestore untuk mengaktifkan koreksi pada seluruh sistem.

### 5. Modul Koreksi Data & Imputasi Celah (`/dashboard/koreksi-data`)
- Penyuntingan nilai **RAW Firebase RTDB** dengan deteksi QC otomatis (WMO limit, *spike jump*, *flatline*, dan *solar overheating*) serta audit trail permanen di Firestore.
- Koreksi nilai melalui 5 formula matematis (*Offset*, *Linear Drift*, *WMO Clamp*, *Scaling*, serta *Interpolasi PCHIP / Akima / Kosinus-Hermite + Pemulihan RH Magnus*).
- Adaptasi kurva khas node stasiun berbasis histori $H-1 \dots H-N$ (`1/3/7 hari`) dan *Node Signature Transfer* (Spatial Ridge aman) terhadap AWS tetangga maupun ECMWF IFS / ERA5.
- Mesin **Imputasi Celah 2-Fase** untuk rekonstruksi grid 1-menit kontinu (`1440 titik/hari`) lengkap dengan penulisan node multi-variabel yang menjaga kontinuitas reset curah hujan `00:00 UTC`.

### 6. Modul Pelaporan & Ekspor Data (`/dashboard/laporan`)
- Generator laporan cuaca berkala (harian, mingguan, bulanan).
- Tata letak cetak dokumen A4 resmi berstandar BMKG/WMO dengan tombol cetak langsung browser.
- Ekspor bulk upload terstruktur untuk **UK Met Office WOW** dan **Weather Underground**.
- Format unduhan CSV, JSON, dan integrasi cadangan basis data SQLite lokal.

### 7. Modul Agrometeorologi & Kualitas Udara (`/dashboard/agromet` & `/dashboard/air-quality`)
- Estimasi kebutuhan air tanaman dan evapotranspirasi acuan $ET_0$.
- Pemantauan partikulat PM2.5 dan PM10 dengan skala indeks kualitas udara (AQI).

---

## 📦 Tumpukan Teknologi & Dependensi (Packages)

Aplikasi dibangun menggunakan arsitektur modern berkinerja tinggi:

### Kategori Dependensi Utama

| Paket | Versi | Peran & Kegunaan |
| :--- | :--- | :--- |
| **`next`** | `^16.1.6` | Framework Fullstack React Server Components & App Router |
| **`react`** & **`react-dom`** | `^19.0.0` | Library utama antarmuka pengguna (React 19 Concurrent Engine) |
| **`typescript`** | `^5.x` | Type Safety dan integrasi skema statis |
| **`echarts`** | `^6.1.0` | Mesin rendering visualisasi grafik kanvas performa tinggi |
| **`echarts-for-react`** | `^3.0.6` | Pembungkus komponen React resmi untuk Apache ECharts |
| **`firebase`** | `latest` | SDK Firebase Realtime Database & Cloud Firestore |
| **`swr`** | `^2.4.1` | Manajemen state server, caching, revalidasi asinkron, deduping request |
| **`tailwindcss`** | `^4.3.3` | Framework styling utility-first generasi terbaru |
| **`zod`** | `^4.4.3` | Validasi skema runtime data sensor, konfigurasi, dan API input |
| **`leaflet`** & **`react-leaflet`** | `^1.9.4` | Rendering peta interaktif jaringan stasiun dan koordinat AWS |
| **`lucide-react`** | `^0.454.0` | Pustaka ikonografi meteorologi dan antarmuka terpadu |
| **`date-fns`** | `^4.1.0` | Manipulasi dan formatting manipulasi waktu |
| **`jspdf`** & **`html2canvas`** | `^4.2.1` | Utilitas tangkapan kanvas dan konversi dokumen PDF |
| **`@radix-ui/*`** | Berbagai | Komponen dasar headless UI aksesibel (Dialog, Dropdown, Tabs, dll.) |
| **`sonner`** | `^2.0.8` | Sistem notifikasi toast modern dan ringan |
| **`next-themes`** | `^0.4.4` | Penyedia tema dinamis Light / Dark Mode bebas flicker |

---

## 📁 Struktur Direktori Repositori

```
Dashboard-Meteo-Sense/
├── app/                                 # Next.js 16 App Router Directory
│   ├── api/                             # Backend API Routes
│   │   ├── air-quality/                 # Endpoint Kualitas Udara
│   │   ├── calibration/                 # Endpoint Simpan & Ambil Kalibrasi
│   │   ├── climate-drivers/             # Endpoint Data ENSO, IOD, MJO
│   │   │   └── enso/forecast/           # Multi-Model Ensemble Forecast Engine (7 Models)
│   │   ├── climatology/                 # Endpoint Normal & Ekstrem Klimatologi
│   │   ├── devices/                     # Manajemen Node Perangkat IoT
│   │   ├── reanalysis/                  # Integrasi ECMWF ERA5 & Imputasi
│   │   ├── weather/reference-guide/     # Penuntun Model ECMWF IFS / ERA5 untuk QC
│   │   └── wow/                         # Endpoint Ekspor Met Office WOW
│   ├── dashboard/                       # Subhalaman Modul Dashboard
│   │   ├── agromet/                     # Modul Agrometeorologi & Evapotranspirasi
│   │   ├── air-quality/                 # Modul Kualitas Udara (PM2.5 / PM10)
│   │   ├── backup-sqlite/               # Cadangan Basis Data SQLite
│   │   ├── climate-drivers/             # Modul Pendorong Iklim (ENSO, IOD, MJO)
│   │   │   ├── enso/                    # Halaman Utama ENSO Multi-Model
│   │   │   ├── iod/                     # Halaman Dipole Mode Index
│   │   │   ├── mjo/                     # Halaman Wheeler-Hendon Diagram
│   │   │   └── monsoon/                 # Halaman Analisis Monsun
│   │   ├── indeks-monsun/               # Analisis AUSMI & WNPMI
│   │   ├── kalibrasi/                   # Modul Kalibrasi Sensor & Fitting Curve
│   │   ├── klimatologi/                 # Modul Analisis Iklim, Ekstrem, SPI, & Agromet
│   │   ├── koreksi-data/                # Modul QC, Koreksi Nilai RAW, & Imputasi Celah 2-Fase
│   │   ├── laporan/                     # Modul Laporan Resmi A4 & Bulk WOW
│   │   ├── meteorologi/                 # Dasbor Meteorologi Real-time & Diurnal
│   │   ├── perangkat-benchmark/         # Pemantauan Stasiun Standar BMKG
│   │   ├── peta/                        # Peta Geospasial Stasiun (Leaflet)
│   │   └── reanalisis-era5/             # Modul Reanalisis Atmosfer ERA5
│   ├── api/                             # Route Handlers Next.js
│   │   ├── seasonal/villages/           # Endpoint Filter Geospasial Desa Kebumen (Cached)
│   │   └── system/node-health/          # Pengawas Telemetri Node & Deteksi Anomali
│   ├── globals.css                      # Konfigurasi Tailwind CSS 4 & Design Tokens
│   ├── layout.tsx                       # Root Layout dengan Theme Provider
│   └── page.tsx                         # Landing Page Utama
├── components/                          # Komponen Antarmuka Pengguna (UI)
│   ├── climate-drivers/                 # Komponen Khusus Iklim & Prediksi Musiman
│   ├── klimatologi/tabs/                # Tab Modular Klimatologi (Agromet, SPI, ZOM, ERA5)
│   ├── koreksi-data/                    # Sub-komponen Koreksi Data & Visualizer ECharts
│   ├── prakirawan/                      # Komponen Prakirawan Cuaca Konsensus Multi-Model
│   │   ├── form/                        # Form Input Parameter & Model Toggles
│   │   └── export/                      # Dialog Ekspor Buletin Resmi & Narasi Prakiraan
│   ├── ui/                              # Komponen UI Reusable (Radix / Shadcn)
│   └── weather/                         # Widget Cuaca, Gauge, & Indikator
├── hooks/                               # Custom Hooks Logika & State
│   └── koreksi-data/                    # State Orkestrasi, QC Anomali, Engine, & Imputasi
├── lib/                                 # Logika Bisnis, Algoritma, & Utilitas
│   ├── bias-correction/                 # Pustaka Koreksi Bias & Evaluasi Statistik
│   ├── calibration/                     # Mesin Kalibrasi & Integrasi Firestore
│   ├── climate-drivers/                 # Pengambil Data Live ENSO, IOD, MJO & Parsers
│   ├── forecast/                        # Mesin Konsensus Ansambel Multi-Model Prakiraan
│   ├── reanalysis/                      # Sumber Data SQLite & ERA5 Correction
│   ├── types/meteorology.ts             # Tipe Domain Meteorologi Bersama (Shared Types)
│   ├── ConfigFirebase.ts                # Inisialisasi Kredensial Firebase SDK
│   ├── FetchingSensorData.ts            # Akses Data Sensor dari Realtime Database
│   ├── meteorologicalImputationEngine.ts # Imputasi 2-Fase, Profil Pola Node, & Spatial Ridge
│   ├── meteorologicalInterpolation.ts   # PCHIP, Akima, Kosinus-Hermite S-Curve, & Magnus RH
│   └── weatherUtils.ts                  # Formulasi Magnus-Tetens, Heat Index, WMO Extrema
├── scripts/archive/                     # Arsip Skrip Diagnostik & Analisis Offline
├── .agents/                             # Aturan & Standar Proyek (Project Rules & Guardrails)
│   └── rules/                           # Standar Visualisasi ECharts, Kalibrasi, Pelaporan
├── public/                              # Aset Statis (Ikon, Logo, Peta Wilayah)
├── firestore.rules                      # Aturan Keamanan Basis Data Cloud Firestore
├── package.json                         # Definisi Dependensi & Script Proyek
└── tsconfig.json                        # Konfigurasi Kompilasi TypeScript
```

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### Prasyarat Sistem
- **Node.js**: Versi `18.18.0` atau yang lebih baru (disarankan Node.js 20 LTS / 22 LTS).
- **Package Manager**: `npm`, `pnpm`, atau `yarn`.
- **Proyek Firebase**: Realtime Database dan Cloud Firestore yang telah diaktifkan.

### Langkah-Langkah Instalasi

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/Dashboard-Meteo-Sense.git
   cd Dashboard-Meteo-Sense
   ```

2. **Pasang Dependensi**:
   ```bash
   npm install
   # atau jika menggunakan pnpm
   pnpm install
   ```

3. **Konfigurasi Lingkungan (`.env.local`)**:
   Salin berkas lingkungan dan lengkapi kredensial Firebase serta API eksternal:
   ```bash
   cp .env.example .env.local
   ```
   *(Lihat rincian variabel di bagian berikutnya).*

4. **Jalankan Server Pengembangan (Dev Server)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

5. **Kompilasi Produksi (Production Build)**:
   Untuk memverifikasi kesiapan rilis produksi:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔐 Variabel Lingkungan (Environment Variables)

Buat file `.env.local` pada direktori *root* dengan konfigurasi berikut:

```env
# ==============================================================================
# FIREBASE CLIENT CONFIGURATION
# ==============================================================================
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyYourApiKeyHere"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"

# ==============================================================================
# FIREBASE ADMIN / SERVICE ACCOUNT (Optional for server-side endpoints)
# ==============================================================================
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

# ==============================================================================
# METEOROLOGICAL EXTERNAL DATA SERVICES
# ==============================================================================
# Open-Meteo API (Defaults to public endpoint if omitted)
OPEN_METEO_API_URL="https://api.open-meteo.com/v1"
OPEN_METEO_SEASONAL_API_URL="https://seasonal-api.open-meteo.com/v1"

# BMKG Open Data Client Configuration
BMKG_AWS_ENDPOINT="https://api.bmkg.go.id/station/data"

# Station Metadata Defaults
NEXT_PUBLIC_STATION_NAME="Stasiun Meteorologi Jerukagung"
NEXT_PUBLIC_STATION_LATITUDE="-7.6833"
NEXT_PUBLIC_STATION_LONGITUDE="109.6500"
NEXT_PUBLIC_STATION_ELEVATION="28"
```

---

## 📄 Lisensi & Hak Cipta

Proyek ini didistribusikan di bawah lisensi resmi **MIT License**.

```text
MIT License

Copyright (c) 2026 SIM Jerukagung Seismologi Meteo-Sense Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">
  <b>Dikembangkan dengan dedikasi untuk kemajuan instrumentasi meteorologi, klimatologi, dan geofisika Indonesia.</b><br/>
  <i>Compliant with World Meteorological Organization (WMO) Guide to Meteorological Instruments and Methods of Observation (WMO-No. 8).</i>
</p>
