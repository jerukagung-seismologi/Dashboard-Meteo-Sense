# Proposal Pembelajaran (/learn): Standar Metode Koreksi Error Kelembapan Relatif (RH)

## 1. Klasifikasi & Cakupan
- **Tipe**: Workspace Rule (Pedoman Ilmiah & Perhitungan Meteorologi)
- **Target Berkas**: [AGENTS.md](file:///d:/Github/Dashboard-Meteo-Sense/AGENTS.md)
- **Komponen Terdampak**: 
  - [ForecastFunction.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/prakirawan/ForecastFunction.tsx)
  - [consensus/route.ts](file:///d:/Github/Dashboard-Meteo-Sense/app/api/weather/consensus/route.ts)
  - [EnsembleProbabilityChart.tsx](file:///d:/Github/Dashboard-Meteo-Sense/components/prakirawan/EnsembleProbabilityChart.tsx)

---

## 2. Latar Belakang & Masalah Saat Ini
Pada formulir prakiraan cuaca, nilai error kelembapan (`humidityError`) saat ini dihitung secara ad-hoc menggunakan rentang ekstrim model:
$$\text{humError} = \min\left(15, \max\left(2, \text{round}\left(\frac{\max - \min}{2}\right)\right)\right)$$

### Kelemahan Metode Eksisting:
1. **Sensitivitas Outlier**: Nilai rentang $(\max - \min)$ sangat rentan terhadap 1 model anomali dari 8 model ensemble, sehingga melebih-lebihkan tingkat ketidakpastian (*overestimated error*).
2. **Pelanggaran Batas Fisik Termodinamika**: Kelembapan Relatif ($RH$) berada dalam interval tertutup $[0\%, 100\%]$. Pada kelembapan tinggi ($RH = 95\%$), error simetris $\pm 8\%$ menghasilkan batas atas $103\%$, yang secara fisik tidak realistis dalam troposfer bawah bebas.
3. **Penyimpangan Kovariansi Diurnal**: Hubungan antara suhu ($T$) dan kelembapan ($RH$) bersifat terbalik ($RH \propto e_s(T)^{-1}$). Di malam hari menjelang fajar saat $T \approx T_d$, sebaran error kelembapan seharusnya menyempit ke batas jenuh.

---

## 3. Rekomendasi Metode Terbaik (4 Pilar)

### Pilar A: Statistik Dispersi Robust (IQR / Standard Deviation Truncated)
Gantikan perhitungan berbasis rentang $\frac{\max - \min}{2}$ dengan deviasi standar ensemble terpotong atau Interquartile Range (IQR):
$$\Delta RH = \text{clamp}\left(\text{round}(1.0 \times \sigma_{\text{ensemble}}), 2, 10\right)$$
Model pencilan (misal selisih $> 2.5\sigma$) diabaikan dari perhitungan error.

### Pilar B: Physical Clamping Asimetris ($0 \le RH \pm \Delta RH \le 100$)
Nilai error simetris $\pm E$ wajib di-*clamp* secara dinamis terhadap jarak ke batas fisik terdekat:
$$E_{\text{safe}} = \min(E, 100 - RH, RH)$$
*(Dengan batas bawah minimum $2\%$ agar tetap mencerminkan ketidakpastian instrumen/model).*

### Pilar C: Coupled Diurnal Consistency
Pada jam-jam mendekati titik embun (dini hari 00:00–06:00 WIB) dengan kondisi $RH \ge 90\%$, error kelembapan dibatasi maksimal $\pm 5\%$. Pada siang hari terik (11:00–14:00 WIB), error diselaraskan dengan sensitivitas suhu $\Delta RH \approx 5 \times \Delta T$.

### Pilar D: Interaksi Form UI yang Human-Error-Proof
- Pembatasan input form: $0 \le \text{input} \le 100$.
- Auto-recalculate error rekomendasi saat prakirawan mengganti nilai kelembapan manual.

---

## 4. Teks Aturan yang Diusulkan untuk AGENTS.md

```markdown
## Standar Meteorologi Koreksi Error Kelembapan (RH)
1. **Batas Fisik Mutlak (0 - 100%)**:
   - Seluruh nilai kelembapan dan interval ketidakpastian $(RH \pm \Delta RH)$ tidak boleh melebihi $100\%$ atau kurang dari $0\%$.
   - Batas error atas wajib dibatasi: $\Delta RH \le (100 - RH)$.
2. **Kalkulasi Ketidakpastian Ensemble**:
   - Gunakan deviasi standar ($\sigma$) atau IQR multi-model, hindari rentang absolut $(\max - \min)/2$ agar tidak terdistorsi model outlier.
3. **Kovariansi Suhu & Waktu Diurnal**:
   - Saat mendekati kondisi jenuh ($RH \ge 90\%$, malam/subuh), margin error dibatasi maksimal $\pm 5\%$.
```
