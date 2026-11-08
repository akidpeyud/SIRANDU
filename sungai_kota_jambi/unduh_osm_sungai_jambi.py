"""
Script untuk mengunduh data jaringan sungai Kota Jambi secara langsung dari OpenStreetMap (Overpass API)
dan menyimpannya ke format GeoJSON.
"""

import os
import json
import urllib.request
import urllib.parse

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "sungai_osm_kota_jambi.geojson")

# Bounding box Kota Jambi: [south, west, north, east]
BBOX = "-1.685,103.520,-1.555,103.710"

query = f"""
[out:json][timeout:60];
(
  way["waterway"~"river|stream|canal|drain"]({BBOX});
  relation["waterway"~"river|stream|canal|drain"]({BBOX});
);
out body;
>;
out skel qt;
"""

def fetch_osm_rivers():
    print("Mengunduh data sungai Kota Jambi dari Overpass API...")
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "AntigravityGIS/1.0"})
    
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            res_json = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Gagal mengunduh: {e}")
        return

    elements = res_json.get("elements", [])
    nodes = {}
    ways = []
    
    for el in elements:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])
        elif el["type"] == "way":
            ways.append(el)

    features = []
    for w in ways:
        w_nodes = w.get("nodes", [])
        coords = [nodes[nid] for nid in w_nodes if nid in nodes]
        if len(coords) < 2:
            continue
        
        props = w.get("tags", {})
        props["id"] = w["id"]
        props["KAB_KOTA"] = "Kota Jambi"
        props["SUMBER"] = "OpenStreetMap Contributors"
        
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            }
        })

    geojson_out = {
        "type": "FeatureCollection",
        "name": "sungai_osm_kota_jambi",
        "features": features
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson_out, f, indent=2, ensure_ascii=False)

    print(f"Berhasil! Tersimpan {len(features)} segmen sungai di:")
    print(OUTPUT_FILE)

if __name__ == "__main__":
    fetch_osm_rivers()
