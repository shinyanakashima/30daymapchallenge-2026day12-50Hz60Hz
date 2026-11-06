#!/usr/bin/env bash
# Builds data/*.topo.json from Natural Earth and 国土数値情報 N03.
# Requires: curl, unzip, node (npm i installs mapshaper).
set -euo pipefail
cd "$(dirname "$0")/.."
MS="node --max-old-space-size=14000 node_modules/.bin/mapshaper"
SRC=build/src
TMP=build/tmp
mkdir -p "$SRC/ne" "$SRC/n03" "$TMP" data

# ---------- downloads ----------
ne() { # $1 = scale/category/name
  local name; name=$(basename "$1")
  if [ ! -f "$SRC/ne/$name/$name.shp" ]; then
    curl -sSL -o "$SRC/ne/$name.zip" "https://naciscdn.org/naturalearth/$1.zip"
    unzip -oq "$SRC/ne/$name.zip" -d "$SRC/ne/$name"
  fi
}
ne 10m/cultural/ne_10m_admin_0_countries
ne 10m/physical/ne_10m_rivers_lake_centerlines
ne 10m/physical/ne_10m_lakes

N03=N03-20260101
if [ ! -f "$SRC/n03/$N03.shp" ]; then
  curl -sSL -o "$SRC/n03/$N03.zip" "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/${N03}_GML.zip"
  unzip -oq "$SRC/n03/$N03.zip" "$N03.*" -d "$SRC/n03"
fi

# ---------- South America ----------
NEC=$SRC/ne/ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp
# French Guiana is part of the France feature in Natural Earth; keep only the South American part.
$MS "$NEC" -filter 'CONTINENT=="South America" || ADMIN=="France"' \
  -clip bbox=-92,-56,-30,13.5 \
  -each 'id = ADM0_A3=="BRI"?"BRA":(ADM0_A3=="FRA"?"GUF":ADM0_A3)' \
  -dissolve id -o "$TMP/sa_raw.json" format=geojson

# hz assignment
$MS "$TMP/sa_raw.json" -join scripts/hz-south-america.csv keys=id,id string-fields=id,hz fields=hz \
  -o "$TMP/sa_hz.json" format=geojson

RIV=$SRC/ne/ne_10m_rivers_lake_centerlines/ne_10m_rivers_lake_centerlines.shp
LAK=$SRC/ne/ne_10m_lakes/ne_10m_lakes.shp
SA_RIVERS='name=="Paraná" || name=="Paraguay" || name=="Uruguay" || name=="Iguazú" || name=="Iguaçu"'

# continental (coarse)
$MS -i "$TMP/sa_hz.json" name=countries -simplify 7% keep-shapes \
  -i "$RIV" name=rivers -clip bbox=-82,-40,-34,-14 -filter "$SA_RIVERS" -filter-fields name -simplify 20% \
  -i "$LAK" name=lakes -clip bbox=-60,-30,-44,-18 -filter 'scalerank<=6' -filter-fields name \
  -target '*' \
  -o data/south-america.topo.json format=topojson combine-layers quantization=100000 precision=0.0001

# Itaipu region (detail)
BOX=-62,-32,-43,-17
$MS -i "$TMP/sa_hz.json" name=countries -clip bbox=$BOX -simplify interval=250 keep-shapes \
  -i "$RIV" name=rivers -clip bbox=$BOX -filter "$SA_RIVERS" -filter-fields name \
  -i "$LAK" name=lakes -clip bbox=$BOX -filter-fields name \
  -target '*' \
  -o "$TMP/itaipu-region.topo.json" format=topojson combine-layers quantization=100000
node -e '
const fs=require("fs");const t=JSON.parse(fs.readFileSync(process.argv[1]));
t.bbox_region=process.argv[2].split(",").map(Number);
fs.writeFileSync("data/itaipu-region.topo.json",JSON.stringify(t));' "$TMP/itaipu-region.topo.json" "$BOX"

# ---------- Japan ----------
$MS "$SRC/n03/$N03.shp" encoding=utf8 \
  -simplify interval=120 keep-shapes -filter-slivers \
  -each 'code=N03_007||"", pref=N03_001, name=N03_004+(N03_005||"")' \
  -dissolve code copy-fields=pref,name \
  -o "$TMP/jp_muni.json" format=geojson precision=0.00005
node scripts/assign-japan.mjs "$TMP/jp_muni.json" "$TMP/jp_hz.json"
$MS -i "$TMP/jp_hz.json" name=muni -filter-fields code,name,pref,hz \
  -o data/japan.topo.json format=topojson quantization=200000

ls -l data
