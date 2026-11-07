import os
import json
import math
import struct
from datetime import datetime

# Path tujuan di folder scratch
OUTPUT_DIR = r"C:\Users\LENOVO\.gemini\antigravity\scratch\sungai_kota_jambi"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Dataset Hidrografi Jaringan Sungai Kota Jambi
rivers_data = [
    {
        "NAMOBJ": "Sungai Batanghari (Alur Utama)",
        "TIPSNG": "Sungai Utama",
        "KLSSNG": "Ordo 1",
        "FCODE": "BA0020000",
        "REMARK": "Sungai utama Provinsi Jambi yang membelah Kota Jambi",
        "coords": [
            [103.5350, -1.5980],
            [103.5450, -1.5930],
            [103.5550, -1.5900],
            [103.5650, -1.5870],
            [103.5750, -1.5850],
            [103.5850, -1.5860],
            [103.5950, -1.5880],
            [103.6050, -1.5900],
            [103.6150, -1.5895],
            [103.6250, -1.5850],
            [103.6350, -1.5780],
            [103.6450, -1.5690],
            [103.6550, -1.5630],
            [103.6650, -1.5610],
            [103.6780, -1.5600],
            [103.6920, -1.5620],
            [103.7050, -1.5660]
        ]
    },
    {
        "NAMOBJ": "Sungai Batanghari (Percabangan Utara)",
        "TIPSNG": "Sungai Utama",
        "KLSSNG": "Ordo 1",
        "FCODE": "BA0020000",
        "REMARK": "Alur percabangan sisi seberang Kota Jambi (Pelayangan)",
        "coords": [
            [103.5800, -1.5830],
            [103.5900, -1.5820],
            [103.6000, -1.5830],
            [103.6100, -1.5840],
            [103.6200, -1.5820],
            [103.6300, -1.5770]
        ]
    },
    {
        "NAMOBJ": "Sungai Asam",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0020000",
        "REMARK": "Sistem drainase utama pengendali banjir melintasi Jelutung-Pasar Jambi",
        "coords": [
            [103.6020, -1.6600],
            [103.6040, -1.6520],
            [103.6060, -1.6440],
            [103.6090, -1.6360],
            [103.6110, -1.6280],
            [103.6130, -1.6200],
            [103.6150, -1.6120],
            [103.6160, -1.6040],
            [103.6170, -1.5960],
            [103.6175, -1.5900]
        ]
    },
    {
        "NAMOBJ": "Sungai Asam (Cabang Jelutung)",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Cabang anak sungai asam kawasan Jelutung",
        "coords": [
            [103.6280, -1.6300],
            [103.6230, -1.6230],
            [103.6180, -1.6160],
            [103.6150, -1.6120]
        ]
    },
    {
        "NAMOBJ": "Sungai Maram",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0020000",
        "REMARK": "Melintasi kawasan bersejarah Pasar Lama Jambi dan Kelenteng Hok Tek",
        "coords": [
            [103.5930, -1.6120],
            [103.5960, -1.6070],
            [103.5990, -1.6020],
            [103.6030, -1.5970],
            [103.6070, -1.5930],
            [103.6110, -1.5900]
        ]
    },
    {
        "NAMOBJ": "Sungai Tembuku",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0020000",
        "REMARK": "Sistem sungai dan stasiun pompa pengendali banjir Jambi Timur/Sijenjang",
        "coords": [
            [103.6380, -1.6150],
            [103.6400, -1.6070],
            [103.6420, -1.5990],
            [103.6430, -1.5910],
            [103.6440, -1.5830],
            [103.6450, -1.5750],
            [103.6450, -1.5690]
        ]
    },
    {
        "NAMOBJ": "Sungai Kenali Besar",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0020000",
        "REMARK": "Hulu kawasan Alam Barajo mengalir ke Danau Sipin",
        "coords": [
            [103.5550, -1.6650],
            [103.5580, -1.6540],
            [103.5600, -1.6420],
            [103.5620, -1.6300],
            [103.5650, -1.6180],
            [103.5680, -1.6080],
            [103.5700, -1.5980],
            [103.5710, -1.5900]
        ]
    },
    {
        "NAMOBJ": "Sungai Kenali Kecil",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Anak sungai di kawasan Kenali Asam Bawah & Paal Lima",
        "coords": [
            [103.5820, -1.6550],
            [103.5800, -1.6430],
            [103.5770, -1.6310],
            [103.5740, -1.6200],
            [103.5710, -1.6100],
            [103.5680, -1.6020]
        ]
    },
    {
        "NAMOBJ": "Danau Sipin (Alur Perairan)",
        "TIPSNG": "Danau / Oxbow",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0010000",
        "REMARK": "Alur perairan danau tapal kuda Danau Sipin terhubung ke Batanghari",
        "coords": [
            [103.5720, -1.5920],
            [103.5760, -1.5910],
            [103.5800, -1.5900],
            [103.5850, -1.5890],
            [103.5890, -1.5880],
            [103.5930, -1.5875],
            [103.5960, -1.5880]
        ]
    },
    {
        "NAMOBJ": "Sungai Buluran",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Melintasi Buluran Kenali menuju Danau Sipin",
        "coords": [
            [103.5600, -1.6050],
            [103.5650, -1.5990],
            [103.5700, -1.5940],
            [103.5730, -1.5920]
        ]
    },
    {
        "NAMOBJ": "Sungai Kambang",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Melintasi kawasan Telanaipura dekat RSUD Raden Mattaher",
        "coords": [
            [103.5850, -1.6180],
            [103.5870, -1.6120],
            [103.5890, -1.6050],
            [103.5920, -1.5980],
            [103.5950, -1.5920]
        ]
    },
    {
        "NAMOBJ": "Sungai Putri",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Alur anak sungai di Kelurahan Sungai Putri Telanaipura",
        "coords": [
            [103.5900, -1.6080],
            [103.5930, -1.6020],
            [103.5970, -1.5960],
            [103.6000, -1.5910]
        ]
    },
    {
        "NAMOBJ": "Sungai Legok",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Alur drainase dan anak sungai di Kelurahan Legok",
        "coords": [
            [103.5940, -1.5950],
            [103.5980, -1.5920],
            [103.6010, -1.5890]
        ]
    },
    {
        "NAMOBJ": "Sungai Selincah",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 2",
        "FCODE": "BA0020000",
        "REMARK": "Mengalir dari Paal Merah/Payo Selincah menuju Batanghari",
        "coords": [
            [103.6600, -1.6450],
            [103.6620, -1.6330],
            [103.6640, -1.6210],
            [103.6650, -1.6090],
            [103.6660, -1.5970],
            [103.6670, -1.5850],
            [103.6670, -1.5730],
            [103.6660, -1.5640]
        ]
    },
    {
        "NAMOBJ": "Sungai Lubuk Rusan",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Anak sungai di kawasan Jambi Timur dan Sijenjang",
        "coords": [
            [103.6500, -1.6250],
            [103.6520, -1.6130],
            [103.6540, -1.6010],
            [103.6560, -1.5890],
            [103.6570, -1.5770],
            [103.6580, -1.5680]
        ]
    },
    {
        "NAMOBJ": "Sungai Bakung",
        "TIPSNG": "Anak Sungai",
        "KLSSNG": "Ordo 3",
        "FCODE": "BA0020000",
        "REMARK": "Aliran anak sungai kawasan Paal Merah",
        "coords": [
            [103.6350, -1.6500],
            [103.6420, -1.6400],
            [103.6480, -1.6300],
            [103.6520, -1.6200],
            [103.6550, -1.6100]
        ]
    }
]

# Fungsi menghitung panjang segmen (Haversine km)
def haversine_km(lon1, lat1, lon2, lat2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_length_km(coords):
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_km(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    return round(total, 2)

for r in rivers_data:
    r["PJG_KM"] = calculate_length_km(r["coords"])
    r["KAB_KOTA"] = "Kota Jambi"
    r["PROVINSI"] = "Jambi"
    r["SUMBER"] = "Badan Informasi Geospasial / Pemkot Jambi"

# 1. GENERATE GEOJSON
geojson_features = []
for idx, r in enumerate(rivers_data, start=1):
    feat = {
        "type": "Feature",
        "id": idx,
        "properties": {
            "ID": idx,
            "NAMOBJ": r["NAMOBJ"],
            "TIPSNG": r["TIPSNG"],
            "KLSSNG": r["KLSSNG"],
            "FCODE": r["FCODE"],
            "PJG_KM": r["PJG_KM"],
            "REMARK": r["REMARK"],
            "KAB_KOTA": r["KAB_KOTA"],
            "PROVINSI": r["PROVINSI"],
            "SUMBER": r["SUMBER"]
        },
        "geometry": {
            "type": "LineString",
            "coordinates": r["coords"]
        }
    }
    geojson_features.append(feat)

geojson_doc = {
    "type": "FeatureCollection",
    "name": "sungai_kota_jambi",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": geojson_features
}

geojson_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.geojson")
with open(geojson_file, "w", encoding="utf-8") as f:
    json.dump(geojson_doc, f, indent=2, ensure_ascii=False)
print("GeoJSON berhasil dibuat:", geojson_file)

# 2. GENERATE SHAPEFILE (.shp, .shx, .dbf, .prj, .cpg)
# Menghitung global bounding box
all_lons = [pt[0] for r in rivers_data for pt in r["coords"]]
all_lats = [pt[1] for r in rivers_data for pt in r["coords"]]
g_xmin, g_xmax = min(all_lons), max(all_lons)
g_ymin, g_ymax = min(all_lats), max(all_lats)

shp_records = []
shx_records = []
cur_shp_offset_words = 50 # 100 bytes header / 2

for i, r in enumerate(rivers_data, start=1):
    pts = r["coords"]
    n_pts = len(pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    r_xmin, r_xmax = min(xs), max(xs)
    r_ymin, r_ymax = min(ys), max(ys)
    
    # Content format:
    # shape_type (int32, little) = 3
    # box (4 doubles, little) = xmin, ymin, xmax, ymax
    # num_parts (int32, little) = 1
    # num_points (int32, little) = n_pts
    # parts (1 int32, little) = 0
    # points (n_pts * 2 doubles, little) = x, y
    content = bytearray()
    content += struct.pack("<i", 3)
    content += struct.pack("<4d", r_xmin, r_ymin, r_xmax, r_ymax)
    content += struct.pack("<i", 1)
    content += struct.pack("<i", n_pts)
    content += struct.pack("<i", 0)
    for p in pts:
        content += struct.pack("<2d", p[0], p[1])
        
    content_len_words = len(content) // 2
    
    # Record header (8 bytes): record_num (big), content_len_words (big)
    rec_header = struct.pack(">2i", i, content_len_words)
    shp_records.append(rec_header + content)
    
    # shx record (8 bytes): offset_words (big), content_len_words (big)
    shx_records.append(struct.pack(">2i", cur_shp_offset_words, content_len_words))
    cur_shp_offset_words += (len(rec_header) + len(content)) // 2

# Total file length in 16-bit words
shp_file_length_words = cur_shp_offset_words
shx_file_length_words = 50 + (len(shx_records) * 8) // 2

# Write .shp
shp_header = bytearray(100)
struct.pack_into(">i", shp_header, 0, 9994) # File code
struct.pack_into(">i", shp_header, 24, shp_file_length_words) # File length
struct.pack_into("<i", shp_header, 28, 1000) # Version
struct.pack_into("<i", shp_header, 32, 3) # Shape type PolyLine
struct.pack_into("<4d", shp_header, 36, g_xmin, g_ymin, g_xmax, g_ymax) # Bbox
struct.pack_into("<4d", shp_header, 68, 0.0, 0.0, 0.0, 0.0) # Z, M

shp_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.shp")
with open(shp_file, "wb") as f:
    f.write(shp_header)
    for rec in shp_records:
        f.write(rec)
print("SHP berhasil dibuat:", shp_file)

# Write .shx
shx_header = bytearray(100)
struct.pack_into(">i", shx_header, 0, 9994)
struct.pack_into(">i", shx_header, 24, shx_file_length_words)
struct.pack_into("<i", shx_header, 28, 1000)
struct.pack_into("<i", shx_header, 32, 3)
struct.pack_into("<4d", shx_header, 36, g_xmin, g_ymin, g_xmax, g_ymax)
struct.pack_into("<4d", shx_header, 68, 0.0, 0.0, 0.0, 0.0)

shx_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.shx")
with open(shx_file, "wb") as f:
    f.write(shx_header)
    for s_rec in shx_records:
        f.write(s_rec)
print("SHX berhasil dibuat:", shx_file)

# Write .dbf
# Fields:
# ID: N, 6, 0
# NAMOBJ: C, 40, 0
# TIPSNG: C, 20, 0
# KLSSNG: C, 15, 0
# FCODE: C, 10, 0
# PJG_KM: N, 8, 2
# REMARK: C, 80, 0
# KAB_KOTA: C, 20, 0
# PROVINSI: C, 15, 0
# SUMBER: C, 45, 0

fields_def = [
    ("ID", "N", 6, 0),
    ("NAMOBJ", "C", 40, 0),
    ("TIPSNG", "C", 20, 0),
    ("KLSSNG", "C", 15, 0),
    ("FCODE", "C", 10, 0),
    ("PJG_KM", "N", 8, 2),
    ("REMARK", "C", 80, 0),
    ("KAB_KOTA", "C", 20, 0),
    ("PROVINSI", "C", 15, 0),
    ("SUMBER", "C", 45, 0),
]

num_records = len(rivers_data)
record_length = 1 + sum(f[2] for f in fields_def) # 1 byte delete flag
header_length = 32 + (len(fields_def) * 32) + 1

dbf_header = bytearray(32)
dbf_header[0] = 0x03 # dBASE III
now = datetime.now()
dbf_header[1] = (now.year - 2000) if now.year >= 2000 else (now.year - 1900)
dbf_header[2] = now.month
dbf_header[3] = now.day
struct.pack_into("<i", dbf_header, 4, num_records)
struct.pack_into("<h", dbf_header, 8, header_length)
struct.pack_into("<h", dbf_header, 10, record_length)

dbf_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.dbf")
with open(dbf_file, "wb") as f:
    f.write(dbf_header)
    for name, ftype, length, dec in fields_def:
        fdesc = bytearray(32)
        fdesc[0:len(name)] = name.encode("ascii")
        fdesc[11] = ord(ftype)
        fdesc[16] = length
        fdesc[17] = dec
        f.write(fdesc)
    f.write(b"\x0d") # Header terminator
    
    # Records
    for idx, r in enumerate(rivers_data, start=1):
        rec_bytes = bytearray()
        rec_bytes.append(0x20) # Not deleted
        
        # ID (N, 6)
        rec_bytes += f"{idx:6d}".encode("ascii")
        # NAMOBJ (C, 40)
        rec_bytes += r["NAMOBJ"][:40].ljust(40).encode("utf-8")[:40]
        # TIPSNG (C, 20)
        rec_bytes += r["TIPSNG"][:20].ljust(20).encode("utf-8")[:20]
        # KLSSNG (C, 15)
        rec_bytes += r["KLSSNG"][:15].ljust(15).encode("utf-8")[:15]
        # FCODE (C, 10)
        rec_bytes += r["FCODE"][:10].ljust(10).encode("utf-8")[:10]
        # PJG_KM (N, 8, 2)
        rec_bytes += f"{r['PJG_KM']:8.2f}".encode("ascii")
        # REMARK (C, 80)
        rec_bytes += r["REMARK"][:80].ljust(80).encode("utf-8")[:80]
        # KAB_KOTA (C, 20)
        rec_bytes += r["KAB_KOTA"][:20].ljust(20).encode("utf-8")[:20]
        # PROVINSI (C, 15)
        rec_bytes += r["PROVINSI"][:15].ljust(15).encode("utf-8")[:15]
        # SUMBER (C, 45)
        rec_bytes += r["SUMBER"][:45].ljust(45).encode("utf-8")[:45]
        
        f.write(rec_bytes)
        
    f.write(b"\x1a") # EOF
print("DBF berhasil dibuat:", dbf_file)

# Write .prj (WGS 84 / EPSG:4326)
prj_wkt = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
prj_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.prj")
with open(prj_file, "w", encoding="utf-8") as f:
    f.write(prj_wkt)
print("PRJ berhasil dibuat:", prj_file)

# Write .cpg (UTF-8)
cpg_file = os.path.join(OUTPUT_DIR, "sungai_kota_jambi.cpg")
with open(cpg_file, "w", encoding="utf-8") as f:
    f.write("UTF-8")
print("CPG berhasil dibuat:", cpg_file)

print("Semua file GIS Sungai Kota Jambi berhasil digenerate di:", OUTPUT_DIR)
