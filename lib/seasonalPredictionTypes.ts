export type SeasonId = "hujan" | "kemarau";

export type AdminLevel = "kecamatan" | "desa";

export type BasemapId = "jalan" | "satelit" | "topografi";

export interface SeasonCatalogEntry {
  season_id: string;
  year: number;
  label: string;
  hujan_title: string;
  kemarau_title: string;
  is_active: boolean;
  has_evaluation: boolean;
  climate_desc: string;
  akurasi_amh_pct?: number | null;
  akurasi_amk_pct?: number | null;
  akurasi_sifat_pct?: number | null;
  rata_selisih_dasarian?: number | null;
  folder: string;
}

export interface SeasonCatalog {
  generated_at: string;
  total_seasons: number;
  active_season_id: string;
  seasons: SeasonCatalogEntry[];
}

export interface KatamStage {
  nama: string;
  olah_tanah?: string;
  tanam: string;
  panen: string;
  varietas?: string[];
  komoditas?: string[];
  tips: string;
}

export interface KatamProfile {
  mt1: KatamStage;
  mt2: KatamStage;
  mt3: KatamStage;
}

export interface CewsMetrics {
  hth_hari: number;
  hth_kategori: string;
  hth_status: string;
  pdcht_status: string;
  spi_1_bulan: number;
  spi_1_kategori: string;
  spi_3_bulan: number;
  spi_3_kategori: string;
}

export interface DasarianChartData {
  labels: string[];
  normal: number[];
  aktual: (number | null)[];
  proyeksi: (number | null)[];
}

export interface HujanRecord {
  code?: string;
  desa?: string;
  kecamatan: string;
  normal_amh_dasarian: number;
  normal_amh_label: string;
  prakiraan_amh_dasarian: number;
  prakiraan_amh_label: string;
  perbandingan_terhadap_normal: string;
  probabilitas_maju_pct: number;
  probabilitas_sama_pct: number;
  probabilitas_mundur_pct: number;
  prakiraan_sifat_hujan: string;
  prakiraan_puncak_bulan: string;
  normal_puncak_bulan: string;
  perbandingan_puncak_thd_normal: string;
  prakiraan_puncak_dasarian: number;
  prakiraan_puncak_label: string;
  rekomendasi_olah_tanah: string;
  rekomendasi_tanam_padi_mt1: string;
  total_hujan_mh_mm?: number;
  kelas_hujan_mh?: string;
  amh_dasarian_250m?: number;
  amh_label_250m?: string;
  // Fitur Tambahan
  katam?: KatamProfile;
  cews?: CewsMetrics;
  chart?: DasarianChartData;
  hth_hari?: number;
  hth_kategori?: string;
  spi_1_bulan?: number;
  spi_1_kategori?: string;
  spi_3_bulan?: number;
  spi_3_kategori?: string;
  // Evaluasi Historis (Khusus Arsip)
  realisasi_amh_dasarian?: number | null;
  realisasi_amh_label?: string | null;
  realisasi_perbandingan_terhadap_normal?: string | null;
  realisasi_sifat_hujan?: string | null;
  realisasi_puncak_bulan?: string | null;
  selisih_dasarian_eval?: number | null;
  status_evaluasi_amh?: string | null;
  status_evaluasi_sifat?: string | null;
}

export interface KemarauRecord {
  code?: string;
  desa?: string;
  kecamatan: string;
  normal_amk_dasarian: number;
  normal_amk_label: string;
  prakiraan_amk_dasarian: number;
  prakiraan_amk_label: string;
  perbandingan_terhadap_normal: string;
  probabilitas_maju_pct: number;
  probabilitas_sama_pct: number;
  probabilitas_mundur_pct: number;
  prakiraan_sifat_hujan_mk: string;
  prakiraan_pmk_bulan: string;
  normal_pmk_bulan: string;
  perbandingan_pmk_thd_normal: string;
  prakiraan_pmk_dasarian: number;
  prakiraan_pmk_label: string;
  rekomendasi_keringkan_sawah_mt2: string;
  rekomendasi_tanam_palawija_mt3: string;
  total_hujan_mk_mm?: number;
  kelas_hujan_mk?: string;
  amk_dasarian_250m?: number;
  amk_label_250m?: string;
  kekeringan_skor?: number;
  kelas_kekeringan?: string;
  // Fitur Tambahan
  katam?: KatamProfile;
  cews?: CewsMetrics;
  chart?: DasarianChartData;
  hth_hari?: number;
  hth_kategori?: string;
  spi_1_bulan?: number;
  spi_1_kategori?: string;
  spi_3_bulan?: number;
  spi_3_kategori?: string;
  // Evaluasi Historis (Khusus Arsip)
  realisasi_amk_dasarian?: number | null;
  realisasi_amk_label?: string | null;
  realisasi_perbandingan_terhadap_normal?: string | null;
  realisasi_sifat_hujan?: string | null;
  realisasi_sifat_hujan_mk?: string | null;
  realisasi_pmk_bulan?: string | null;
  selisih_dasarian_eval?: number | null;
  status_evaluasi_amk?: string | null;
  status_evaluasi_sifat?: string | null;
}

export interface RasterOverlayMeta {
  id: string;
  season: SeasonId;
  label: string;
  unit: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  gradientColors: string[];
  url: string;
  bounds: [[number, number], [number, number]];
}

export interface SeasonalDataset {
  metadata: {
    is_archive?: boolean;
    season_id?: string;
    year?: number;
    title?: string;
    generated_at: string;
    kabupaten: string;
    total_kecamatan: number;
    total_desa?: number;
    model?: string;
    standard?: string;
    evaluasi?: {
      akurasi_amh_pct: number;
      akurasi_sifat_hujan_pct: number;
      rata_selisih_dasarian: number;
      keterangan_kinerja: string;
    };
    seasons: {
      hujan: { id: string; title: string; enso_context: string; normal_period: string };
      kemarau: { id: string; title: string; enso_context: string; normal_period: string };
    };
  };
  overlays: RasterOverlayMeta[];
  hujan: HujanRecord[];
  kemarau: KemarauRecord[];
}

export interface SeasonalVillageDataset {
  metadata: SeasonalDataset["metadata"];
  hujan: HujanRecord[];
  kemarau: KemarauRecord[];
}

export interface UnifiedLayerDef {
  id: string;
  kind: "polygon";
  season: SeasonId;
  label: string;
  bannerTitle: string;
  field: string;
  desaField?: string;
  colorMap: Record<string, string>;
  order?: string[];
}
