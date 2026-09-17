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
   - [Parameter Turunan Meteorologi](#parameter-turunan-meteorologi)
   - [Standar Jendela Waktu Ekstrem Sinoptik WMO/BMKG](#standar-jendela-waktu-ekstrem-sinoptik-wmobmkg)
   - [Imputasi Reanalisis Atmosfer (ECMWF ERA5)](#imputasi-reanalisis-atmosfer-ecmwf-era5)
   - [Prakiraan Ansambel Musiman Multi-Model Global](#prakiraan-ansambel-musiman-multi-model-global)
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
    
    FormatOption -- "Laporan Cetak A4" --> PrintView["Render Tata Letak A4 CSS @media print\n(react-to-print -> Dialog Cetak Browser / Simpan PDF)"]
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

### 5. Modul Pelaporan & Ekspor Data (`/dashboard/laporan`)
- Generator laporan cuaca berkala (harian, mingguan, bulanan).
- Tata letak cetak dokumen A4 resmi berstandar BMKG/WMO dengan tombol cetak langsung browser.
- Ekspor bulk upload terstruktur untuk **UK Met Office WOW** dan **Weather Underground**.
- Format unduhan CSV, JSON, dan integrasi cadangan basis data SQLite lokal.

### 6. Modul Agrometeorologi & Kualitas Udara (`/dashboard/agromet` & `/dashboard/air-quality`)
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
| **`react-to-print`** | `^3.1.1` | Pencetakan dokumen laporan A4 browser-to-PDF |
| **`jspdf`** & **`html2canvas`** | `^4.2.1` | Utilitas tangkapan kanvas dan konversi dokumen PDF |
| **`openmeteo`** | `^1.2.3` | Klien resmi Open-Meteo SDK untuk data reanalisis & musiman |
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
│   │   ├── klimatologi/                 # Modul Analisis Iklim & Ekstrem
│   │   ├── laporan/                     # Modul Laporan Resmi A4 & Bulk WOW
│   │   ├── meteorologi/                 # Dasbor Meteorologi Real-time & Diurnal
│   │   ├── perangkat-benchmark/         # Pemantauan Stasiun Standar BMKG
│   │   ├── peta/                        # Peta Geospasial Stasiun (Leaflet)
│   │   └── reanalisis-era5/             # Modul Reanalisis Atmosfer ERA5
│   ├── globals.css                      # Konfigurasi Tailwind CSS 4 & Design Tokens
│   ├── layout.tsx                       # Root Layout dengan Theme Provider
│   └── page.tsx                         # Landing Page Utama
├── components/                          # Komponen Antarmuka Pengguna (UI)
│   ├── climate-drivers/                 # Komponen Khusus Iklim & Prediksi Musiman
│   │   ├── ENSOCharts.tsx               # Grafik Deret Waktu ONI, Niño 1+2, 3, 3.4, 4, SOI
│   │   ├── ENSOForecastSection.tsx      # Komparasi 7 Model, Plume, & Probabilitas Fase
│   │   ├── ResponsiveEChart.tsx         # Pembungkus ECharts Otomatis Responsif (ResizeObserver)
│   │   └── SubpageHeader.tsx            # Header Konsisten Subhalaman
│   ├── ui/                              # Komponen UI Reusable (Radix / Shadcn)
│   └── weather/                         # Widget Cuaca, Gauge, & Indikator
├── lib/                                 # Logika Bisnis, Algoritma, & Utilitas
│   ├── bias-correction/                 # Pustaka Koreksi Bias & Evaluasi Statistik
│   │   ├── correction/                  # Model Offset, Linier, Polinomial, Quantile
│   │   ├── imputation/                  # Imputasi Reanalisis & Spasial
│   │   ├── matching/                    # Pencocokan Temporal Sensor vs Benchmark
│   │   ├── qc/                          # Quality Control & Limit Check WMO
│   │   └── statistics/                  # Penghitungan MBE, MAE, RMSE, R²
│   ├── calibration/                     # Mesin Kalibrasi & Integrasi Firestore
│   ├── climate-drivers/                 # Pengambil Data Live ENSO, IOD, MJO & Parsers
│   ├── reanalysis/                      # Sumber Data SQLite & ERA5 Correction
│   ├── ConfigFirebase.ts                # Inisialisasi Kredensial Firebase SDK
│   ├── FetchingSensorData.ts            # Akses Data Sensor dari Realtime Database
│   └── weatherUtils.ts                  # Formulasi Magnus-Tetens, Heat Index, WMO Extrema
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