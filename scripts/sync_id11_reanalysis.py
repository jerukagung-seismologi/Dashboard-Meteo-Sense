#!/usr/bin/env python3
"""
sync_id11_reanalysis.py
Feeder & Synchronizer Data Reanalisis (ECMWF / ERA5) ke Firebase RTDB & Firestore
untuk Node 'id-11' (MetSen Reanalisis) di Dashboard Meteo-Sense.

Penggunaan:
  # Mode satu kali sinkronisasi (update data terbaru & aktifkan status online)
  python sync_id11_reanalysis.py

  # Mode continuous feeder (loop tiap N detik)
  python sync_id11_reanalysis.py --loop 60
"""

import sys
import os
import argparse
import time
import math
import datetime
import urllib.request
import json
import re
import firebase_admin
from firebase_admin import credentials, firestore, db

# Koordinat Jerukagung, Klirong, Kebumen
DEFAULT_LAT = -7.736756
DEFAULT_LNG = 109.646881
SENSOR_ID = "id-11"

def init_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    # Prioritas 1: File service account lokal jika ada
    sa_paths = [
        "D:/staklimjerukagung-firebase-adminsdk-kcfma-e091165a9b.json",
        os.path.join(os.path.dirname(__file__), "..", "service-account.json"),
    ]
    for p in sa_paths:
        if os.path.exists(p):
            cred = credentials.Certificate(p)
            with open(p, "r", encoding="utf-8") as f:
                pj = json.load(f)
            return firebase_admin.initialize_app(cred, {
                "databaseURL": f"https://{pj.get('project_id')}-default-rtdb.asia-southeast1.firebasedatabase.app/"
            })

    # Prioritas 2: Baca dari .env.local
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
    if not os.path.exists(env_path):
        raise FileNotFoundError(f"File .env.local tidak ditemukan di {env_path}")

    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read()

    pk_match = re.search(r'NEXT_PUBLIC_FIREBASE_PRIVATE_KEY=(.*)', content)
    if not pk_match:
        raise ValueError("NEXT_PUBLIC_FIREBASE_PRIVATE_KEY tidak ditemukan di .env.local")
    pk_raw = pk_match.group(1).replace("\\n", "\n").replace('\\"', '').strip().strip('"').strip("'").strip('\\')
    if not pk_raw.endswith("-----END PRIVATE KEY-----"):
        pk_raw = pk_raw + "\n-----END PRIVATE KEY-----"

    ce = re.search(r'NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL=(.*)', content).group(1).strip().strip('"').strip("'")
    pi = re.search(r'NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.*)', content).group(1).strip().strip('"').strip("'")
    db_url = re.search(r'NEXT_PUBLIC_FIREBASE_DATABASE_URL=(.*)', content).group(1).strip().strip('"').strip("'")

    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": pi,
        "private_key": pk_raw,
        "client_email": ce,
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    return firebase_admin.initialize_app(cred, {"databaseURL": db_url})

def calc_dew(temp, hum):
    a = 17.27
    b = 237.7
    alpha = (a * temp) / (b + temp) + math.log(max(hum, 1.0) / 100.0)
    return round((b * alpha) / (a - alpha), 2)

def fetch_live_era5(lat=DEFAULT_LAT, lng=DEFAULT_LNG):
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}"
        f"&current=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m,wind_direction_10m"
        f"&hourly=soil_temperature_0_to_7cm,direct_normal_irradiance&forecast_hours=1&timezone=Asia%2FBangkok"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "MeteoSense-Sync/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())

def push_sync_record(now_ts=None):
    if now_ts is None:
        now_ts = int(time.time())

    meteo_data = fetch_live_era5()
    cur = meteo_data.get("current", {})
    hourly = meteo_data.get("hourly", {})

    temp = cur.get("temperature_2m", 26.0)
    rh = cur.get("relative_humidity_2m", 80.0)
    pressure = cur.get("surface_pressure", 1012.0)
    rain = cur.get("precipitation", 0.0)
    ws = cur.get("wind_speed_10m", 2.0)
    wd = cur.get("wind_direction_10m", 120)

    soil_list = hourly.get("soil_temperature_0_to_7cm", [27.0])
    solar_list = hourly.get("direct_normal_irradiance", [0.0])
    soil_temp = soil_list[-1] if soil_list else 27.0
    solar_rad = solar_list[-1] if solar_list else 0.0

    dt_wib = datetime.datetime.fromtimestamp(now_ts, tz=datetime.timezone(datetime.timedelta(hours=7)))
    hour = dt_wib.hour

    if 6 <= hour <= 17:
        lux = round(max(50.0, solar_rad * 115.0), 2)
        volt = round(4.12 + 0.05 * math.sin(((hour - 6) / 12) * math.pi), 2)
    else:
        lux = 0.83
        volt = round(4.08 - 0.03 * ((hour if hour < 6 else hour - 18) / 12), 2)

    dew = calc_dew(temp, rh)

    # Standar BMKG: Hari pengamatan meteorologi dimulai pukul 07:00 WIB
    if dt_wib.hour < 7:
        day_start = dt_wib.replace(hour=7, minute=0, second=0, microsecond=0) - datetime.timedelta(days=1)
    else:
        day_start = dt_wib.replace(hour=7, minute=0, second=0, microsecond=0)
    day_start_ts = int(day_start.timestamp())

    ref_root = db.reference(f"auto_weather_stat/{SENSOR_ID}/data")
    prev_records = ref_root.order_by_key().start_at(str(day_start_ts)).end_at(str(now_ts - 1)).limit_to_last(1).get()
    prev_rainfall = 0.0
    if prev_records:
        latest_prev = list(prev_records.values())[-1]
        prev_rainfall = float(latest_prev.get("rainfall", 0.0))

    # Intensitas hujan per jam (mm/h) dan volume interval (asumsi step 30 menit = rain * 0.5)
    rain_rate = round(rain, 1)
    rain_step = round(rain * 0.5, 2)
    current_rainfall = round(prev_rainfall + rain_step, 2) if (hour != 7 or dt_wib.minute != 0) else rain_step

    record = {
        "timestamp": now_ts,
        "temperature": round(temp, 2),
        "humidity": round(rh, 2),
        "pressure": round(pressure, 2),
        "dew": dew,
        "lux": lux,
        "rainfall": current_rainfall,
        "rainrate": rain_rate,
    }

    # 1. Update RTDB
    ref = db.reference(f"auto_weather_stat/{SENSOR_ID}/data/{now_ts}")
    ref.set(record)

    # 2. Update Firestore TelemetryStatus
    fs = firestore.client()
    fs.collection("devices").document(SENSOR_ID).update({
        "TelemetryStatus": "online",
        "lastUpdate": now_ts * 1000,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })

    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Pushed telemetry for {SENSOR_ID}: Temp={temp}°C, Hum={rh}%, Press={pressure} hPa, Status=ONLINE")
    return record

def main():
    parser = argparse.ArgumentParser(description="Synchronizer Reanalisis ERA5 untuk Node id-11")
    parser.add_argument("--loop", type=int, default=0, help="Interval loop dalam detik (0 untuk one-shot)")
    args = parser.parse_args()

    print("Menginisialisasi koneksi Firebase...")
    init_firebase()

    if args.loop <= 0:
        push_sync_record()
        print("Sinkronisasi one-shot berhasil.")
    else:
        print(f"Memulai continuous feeder loop tiap {args.loop} detik. Tekan Ctrl+C untuk berhenti.")
        while True:
            try:
                push_sync_record()
            except Exception as e:
                print("Error saat sync:", e)
            time.sleep(args.loop)

if __name__ == "__main__":
    main()
