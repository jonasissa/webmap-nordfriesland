// ==============================
// 1. Karte initialisieren
// ==============================
const map = L.map("map").setView([54.65, 8.85], 9);

// Basiskarte OpenStreetMap
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ==============================
// 2. Hilfsfunktionen
// ==============================
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  return num.toFixed(decimals);
}

function createPopupPotenzial(feature, titel) {
  const p = feature.properties;

  return `
    <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5;">
      <b>${titel}</b><br>
      <hr style="margin: 6px 0;">
      <b>Fläche:</b> ${formatNumber(p.area_ha, 2)} ha<br>
      <b>Wind (mean):</b> ${formatNumber(p.windspeed_mean, 2)} m/s<br>
      <b>Gesamtscore:</b> ${formatNumber(p.score_total || p.score_total_Gewichtung, 3)}<br>
      <b>Volllaststunden:</b> ${formatNumber(p.vlh_individuell, 0)} h/a<br>
      <b>P installierbar (4 MW/km²):</b> ${formatNumber(p.p4, 2)} MW<br>
      <b>P installierbar (6 MW/km²):</b> ${formatNumber(p.p6, 2)} MW<br>
      <b>Energiepotenzial (4 MW/km²):</b> ${formatNumber(p.e4, 2)} GWh/a<br>
      <b>Energiepotenzial (6 MW/km²):</b> ${formatNumber(p.e6, 2)} GWh/a
    </div>
  `;
}

function createPopupWEA(feature) {
  const p = feature.properties;

  return `
    <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5;">
      <b>Bestehende Windenergieanlage</b><br>
      <hr style="margin: 6px 0;">
      <b>Bruttoleistung:</b> ${formatNumber(p["Bruttoleistung_MW"], 2)} MW<br>
      <b>Nabenhöhe:</b> ${formatNumber(p["Nabenhöhe der Windenergieanlage"], 0)} m<br>
      <b>Rotordurchmesser:</b> ${formatNumber(p["Rotordurchmesser der Windenergieanlage"], 0)} m<br>
      <b>Jahr Inbetriebnahme:</b> ${p["Jahr Inbetriebnahme"] ?? "-"}
    </div>
  `;
}

// ==============================
// 3. Styles
// ==============================
function getScoreColor(score) {
  if (score >= 0.70) return "#1a9850";   // dunkelgrün
  if (score >= 0.60) return "#66bd63";   // grün
  if (score >= 0.50) return "#d9ef8b";   // gelbgrün
  if (score >= 0.40) return "#fee08b";   // gelb
  if (score >= 0.30) return "#fdae61";   // orange
  return "#d73027";                      // rot
}

function stylePot800(feature) {
  const score = Number(feature.properties.score_total || feature.properties.score_total_Gewichtung);
  return {
    color: "#2b8cbe",
    weight: 2,
    fillColor: getScoreColor(score),
    fillOpacity: 0.45
  };
}

function stylePot1000(feature) {
  const score = Number(feature.properties.score_total || feature.properties.score_total_Gewichtung);
  return {
    color: "#6a3d9a",
    weight: 2,
    fillColor: getScoreColor(score),
    fillOpacity: 0.45
  };
}

function styleTop15(feature) {
  const score = Number(feature.properties.score_total || feature.properties.score_total_Gewichtung);
  return {
    color: "#1b7837",
    weight: 3,
    fillColor: getScoreColor(score),
    fillOpacity: 0.65
  };
}

function styleWEA() {
  return {
    radius: 4,
    fillColor: "#ff8c00",
    color: "#222",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.9
  };
}

function styleSchutzgebiete() {
  return {
    color: "#b2182b",
    weight: 1.5,
    fillColor: "#ef8a62",
    fillOpacity: 0.25
  };
}

function styleSchutzgebietePuffer() {
  return {
    color: "#d6604d",
    weight: 2,
    dashArray: "6,4",
    fillColor: "#fddbc7",
    fillOpacity: 0.15
  };
}

function styleWohngebaeude() {
  return {
    color: "#4d4d4d",
    weight: 1,
    fillColor: "#737373",
    fillOpacity: 0.35
  };
}

function styleWohngebaeudePuffer800() {
  return {
    color: "#1f78b4",
    weight: 2,
    dashArray: "5,3",
    fillColor: "#a6cee3",
    fillOpacity: 0.12
  };
}

function styleWohngebaeudePuffer1000() {
  return {
    color: "#6a3d9a",
    weight: 2,
    dashArray: "2,4",
    fillColor: "#cab2d6",
    fillOpacity: 0.12
  };
}

// Hover-Effekt
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 4,
    fillOpacity: 0.6
  });
  layer.bringToFront();
  info.update(layer.feature.properties);
}

const info = L.control({ position: "topright" });

info.onAdd = function () {
  this._div = L.DomUtil.create("div", "info-box");
  this.update();
  return this._div;
};

info.update = function (props) {
  this._div.innerHTML = props
    ? `
      <h4>Flächeninfo</h4>
      <b>Fläche:</b> ${formatNumber(props.area_ha, 2)} ha<br>
      <b>Wind:</b> ${formatNumber(props.windspeed_mean, 2)} m/s<br>
      <b>Score:</b> ${formatNumber(props.score_total || props.score_total_Gewichtung, 3)}
    `
    : `<h4>Flächeninfo</h4>Mit der Maus über eine Potenzialfläche fahren`;
};

info.addTo(map);
// ==============================
// 4. Layer laden
// ==============================
let layerPot800;
let layerPot1000;
let layerTop15;
let layerWEA;

let layerSchutzgebiete;
let layerSchutzgebietePuffer;

let layerWohngebaeude;
let layerWohngebaeudePuffer800;
let layerWohngebaeudePuffer1000;

// Promise helper
function loadGeoJSON(url) {
  return fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(`Fehler beim Laden von ${url}`);
    }
    return response.json();
  });
}

// Alle Layer laden
Promise.all([
  loadGeoJSON("Daten/Potenzialflaechen/pot_800.geojson"),
  loadGeoJSON("Daten/Potenzialflaechen/pot_1000.geojson"),
  loadGeoJSON("Daten/Potenzialflaechen/pot_top15.geojson"),
  loadGeoJSON("Daten/Bestandsanlagen/bestehende_WEA_NF.geojson"),

  loadGeoJSON("Daten/Ausschlussflaechen/Schutzgebiete_gesamt.geojson"),
  loadGeoJSON("Daten/Ausschlussflaechen/Schutzgebiete_Puffer_gesamt.geojson"),

  loadGeoJSON("Daten/Gebaeude/Wohngebaeude_NF.geojson"),
  loadGeoJSON("Daten/Gebaeude/Wohngebaeude_Puffer800.geojson"),
  loadGeoJSON("Daten/Gebaeude/Wohngebaeude_Puffer1000.geojson")
])
.then(([
  pot800Data,
  pot1000Data,
  top15Data,
  weaData,
  schutzgebieteData,
  schutzgebietePufferData,
  wohngebaeudeData,
  wohngebaeudePuffer800Data,
  wohngebaeudePuffer1000Data
]) => {

  // 800 m
  layerPot800 = L.geoJSON(pot800Data, {
    style: stylePot800,
    onEachFeature: function(feature, layer) {
      layer.bindPopup(createPopupPotenzial(feature, "Potenzialfläche (800 m)"));
      layer.on({
        mouseover: highlightFeature,
        mouseout: function() {
  layerPot800.resetStyle(layer);
  info.update();
}
      });
    }
  }).addTo(map);

  // 1000 m
  layerPot1000 = L.geoJSON(pot1000Data, {
    style: stylePot1000,
    onEachFeature: function(feature, layer) {
      layer.bindPopup(createPopupPotenzial(feature, "Potenzialfläche (1.000 m)"));
      layer.on({
        mouseover: highlightFeature,
        mouseout: function() {
  layerPot1000.resetStyle(layer);
  info.update();
}
      });
    }
  }).addTo(map);

  // Top 15 %
  layerTop15 = L.geoJSON(top15Data, {
    style: styleTop15,
    onEachFeature: function(feature, layer) {
      layer.bindPopup(createPopupPotenzial(feature, "Top 15 % Fläche"));
      layer.on({
        mouseover: highlightFeature,
        mouseout: function() {
  layerTop15.resetStyle(layer);
  info.update();
}
      });
    }
  }).addTo(map);

  // WEA
  layerWEA = L.geoJSON(weaData, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, styleWEA());
    },
    onEachFeature: function(feature, layer) {
      layer.bindPopup(createPopupWEA(feature));
    }
  }).addTo(map);

    // Schutzgebiete
  layerSchutzgebiete = L.geoJSON(schutzgebieteData, {
    style: styleSchutzgebiete,
    onEachFeature: function(feature, layer) {
      const p = feature.properties || {};
      layer.bindPopup(`
        <b>Schutzgebiet</b><br>
        ${Object.keys(p).length ? Object.entries(p).map(([k,v]) => `<b>${k}:</b> ${v}`).join("<br>") : "Keine Attribute verfügbar"}
      `);
    }
  });

  // Schutzgebiete-Puffer
  layerSchutzgebietePuffer = L.geoJSON(schutzgebietePufferData, {
    style: styleSchutzgebietePuffer,
    onEachFeature: function(feature, layer) {
      layer.bindPopup("<b>Schutzgebiete – Puffer</b>");
    }
  });

  // Wohngebäude
  layerWohngebaeude = L.geoJSON(wohngebaeudeData, {
    style: styleWohngebaeude,
    onEachFeature: function(feature, layer) {
      const p = feature.properties || {};
      layer.bindPopup(`
        <b>Wohngebäude</b><br>
        ${Object.keys(p).length ? Object.entries(p).map(([k,v]) => `<b>${k}:</b> ${v}`).join("<br>") : "Keine Attribute verfügbar"}
      `);
    }
  });

  // Wohngebäude-Puffer 800
  layerWohngebaeudePuffer800 = L.geoJSON(wohngebaeudePuffer800Data, {
    style: styleWohngebaeudePuffer800,
    onEachFeature: function(feature, layer) {
      layer.bindPopup("<b>Wohngebäude – Puffer 800 m</b>");
    }
  });

  // Wohngebäude-Puffer 1000
  layerWohngebaeudePuffer1000 = L.geoJSON(wohngebaeudePuffer1000Data, {
    style: styleWohngebaeudePuffer1000,
    onEachFeature: function(feature, layer) {
      layer.bindPopup("<b>Wohngebäude – Puffer 1.000 m</b>");
    }
  });

  // Layer Control
  const baseMaps = {
    "OpenStreetMap": osm
  };

    const overlayMaps = {
    "Potenzialflächen 800 m": layerPot800,
    "Potenzialflächen 1.000 m": layerPot1000,
    "Top 15 %": layerTop15,
    "Bestehende WEA": layerWEA,

    "Schutzgebiete": layerSchutzgebiete,
    "Schutzgebiete – Puffer": layerSchutzgebietePuffer,

    "Wohngebäude": layerWohngebaeude,
    "Wohngebäude – Puffer 800 m": layerWohngebaeudePuffer800,
    "Wohngebäude – Puffer 1.000 m": layerWohngebaeudePuffer1000
  };

  L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

  // Auf alle Layer zoomen
  const allLayers = L.featureGroup([layerPot800, layerPot1000, layerTop15, layerWEA]);
  map.fitBounds(allLayers.getBounds(), { padding: [20, 20] });

})
.catch(error => {
  console.error("Fehler beim Laden der GeoJSON-Dateien:", error);
  alert("Eine oder mehrere GeoJSON-Dateien konnten nicht geladen werden. Bitte Dateinamen und Pfade prüfen.");
});

const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "info legend");
  div.innerHTML = `
    <h4>Legende</h4>
    <div><span style="background:#1a9850;"></span> Score ≥ 0.70</div>
    <div><span style="background:#66bd63;"></span> 0.60 – 0.69</div>
    <div><span style="background:#d9ef8b;"></span> 0.50 – 0.59</div>
    <div><span style="background:#fee08b;"></span> 0.40 – 0.49</div>
    <div><span style="background:#fdae61;"></span> 0.30 – 0.39</div>
    <div><span style="background:#d73027;"></span> &lt; 0.30</div>
    <hr>
    <div><span class="line blue"></span> Potenzialflächen 800 m</div>
    <div><span class="line purple"></span> Potenzialflächen 1.000 m</div>
    <div><span class="line green"></span> Top 15 %</div>
    <div><span class="dot"></span> Bestehende WEA</div>
  `;
  return div;
};

legend.addTo(map);