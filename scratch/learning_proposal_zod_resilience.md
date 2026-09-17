# Learning Proposal: Resilient Zod Schema Pattern for Evolving Firestore Documents

## 1. Context & Trigger
- **Trigger**: Runtime `ZodError` on form submission or document loading:
  ```json
  [
    { "expected": "boolean", "code": "invalid_type", "path": ["rainrate", "enabled"], "message": "Invalid input: expected boolean, received undefined" },
    { "expected": "boolean", "code": "invalid_type", "path": ["volt", "enabled"], "message": "Invalid input: expected boolean, received undefined" },
    { "expected": "boolean", "code": "invalid_type", "path": ["lux", "enabled"], "message": "Invalid input: expected boolean, received undefined" },
    { "expected": "boolean", "code": "invalid_type", "path": ["soil_temp", "enabled"], "message": "Invalid input: expected boolean, received undefined" },
    { "expected": "boolean", "code": "invalid_type", "path": ["windSpeed", "enabled"], "message": "Invalid input: expected boolean, received undefined" },
    { "expected": "boolean", "code": "invalid_type", "path": ["windDirection", "enabled"], "message": "Invalid input: expected boolean, received undefined" }
  ]
  ```
- **Root Cause**:
  Ketika variabel-variabel baru ditambahkan ke dalam sistem IoT (seperti `rainrate`, `volt`, `lux`, `soil_temp`, `windSpeed`, `windDirection`), dokumen yang sudah ada di database Cloud Firestore hanya menyimpan sebagian variabel lama (`temperature`, `humidity`, `pressure`, `dew`, `rainfall`).
  Jika skema Zod mendefinisikan properti boolean atau sub-objek secara kaku (`enabled: z.boolean()`) tanpa nilai default atau sanitasi preprocess, maka:
  1. Zod resolver pada formulir (misalnya `react-hook-form` + `zodResolver`) menolak input karena `enabled` bernilai `undefined`.
  2. Parsing dokumen dari Firestore dapat gagal dan mengembalikan `null`.

---

## 2. Classification
- **Type**: Project Rule / TypeScript Architecture Guideline
- **Target File**: `.agents/rules/zod_resilient_schemas.md`
- **Scope**: Seluruh schema Zod yang memetakan data dokumen Firestore atau model formulir IoT yang berkembang (evolving schema).

---

## 3. Rationale & Behavioral Guardrails
1. **Gunakan Preprocessed Safe Booleans & Defaults**:
   - Untuk atribut status aktif/nonaktif (seperti `enabled`), selalu gunakan preprocess agar `undefined` atau `null` otomatis menjadi `false`:
     ```ts
     const safeBoolean = z.preprocess(
       (val) => (val === undefined || val === null ? false : Boolean(val)),
       z.boolean().default(false)
     );
     ```
2. **Defensif terhadap Variabel Masa Lalu & Masa Depan**:
   - Setiap sub-objek variabel dalam dokumen stasiun harus memiliki nilai default lengkap (`DEFAULT_VARIABLE_CALIBRATION`), sehingga saat dokumen lawas dimuat, seluruh variabel yang belum tercatat otomatis diisi `{ enabled: false, method: "none" }`.
3. **Inisialisasi Form yang Lengkap**:
   - Saat me-reset formulir dari data Firestore (`form.reset`), iterasi seluruh daftar variabel resmi sistem (`SENSOR_VARIABLES`) dan gabungkan dengan data yang ada, sehingga tidak ada field formulir yang berstatus `undefined`.
4. **Akses & Keamanan Firestore**:
   - Database Firestore menerapkan security rules (`allow write: if isAdmin()`). Perubahan struktur database secara langsung di client dilakukan melalui sesi admin yang terautentikasi atau script admin dengan kredensial yang valid.
