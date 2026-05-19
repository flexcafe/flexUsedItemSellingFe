/**
 * Leaflet + OSM in WebView (Expo-friendly).
 * The page posts `{ latitude, longitude }` through ReactNativeWebView.
 */
export function buildLeafletPickerHtml(
  latitude: number,
  longitude: number,
): string {
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body { height: 100%; margin: 0; padding: 0; }
      #map { height: 100%; width: 100%; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        var lat = ${latitude};
        var lng = ${longitude};
        var map = L.map('map', { zoomControl: true }).setView([lat, lng], 16);

        L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        var marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        function send(lat, lng) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
          } catch (e) {}
        }

        map.on('click', function (e) {
          marker.setLatLng(e.latlng);
          send(e.latlng.lat, e.latlng.lng);
        });

        marker.on('dragend', function () {
          var p = marker.getLatLng();
          send(p.lat, p.lng);
        });
      })();
    </script>
  </body>
</html>`;
}

/**
 * Same tiles + marker as the picker, but the view and pin are fixed (no drag, no tap-to-move).
 * Use in the form for a preview; use {@link buildLeafletPickerHtml} inside the modal for editing.
 */
export function buildLeafletStaticViewHtml(
  latitude: number,
  longitude: number,
): string {
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body { height: 100%; margin: 0; padding: 0; }
      #map { height: 100%; width: 100%; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        var lat = ${latitude};
        var lng = ${longitude};
        var map = L.map('map', {
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false,
        }).setView([lat, lng], 16);

        L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.marker([lat, lng], { draggable: false, interactive: false }).addTo(map);
      })();
    </script>
  </body>
</html>`;
}

export type LeafletLiveMarker = {
  latitude: number;
  longitude: number;
  label: string;
  color: string;
};

/**
 * Read-only live map with multiple markers.
 * Used by chat live-location section to show both parties.
 */
export function buildLeafletLiveViewHtml(markers: LeafletLiveMarker[]): string {
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const safeMarkers = markers
    .filter(
      (m) =>
        Number.isFinite(m.latitude) &&
        Number.isFinite(m.longitude) &&
        typeof m.label === "string" &&
        typeof m.color === "string",
    )
    .map((m) => ({
      latitude: m.latitude,
      longitude: m.longitude,
      label: m.label,
      color: m.color,
    }));
  const markersJson = JSON.stringify(safeMarkers).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body { height: 100%; margin: 0; padding: 0; }
      #map { height: 100%; width: 100%; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        var markers = ${markersJson};
        var hasMarkers = Array.isArray(markers) && markers.length > 0;
        var center = hasMarkers
          ? [markers[0].latitude, markers[0].longitude]
          : [16.8, 96.15];
        var zoom = hasMarkers ? 15 : 6;

        var map = L.map('map', {
          zoomControl: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: false,
        }).setView(center, zoom);

        L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        if (!hasMarkers) return;

        var bounds = [];
        var occupied = {};
        markers.forEach(function (m, idx) {
          var key = m.latitude.toFixed(6) + ',' + m.longitude.toFixed(6);
          var count = occupied[key] || 0;
          occupied[key] = count + 1;
          var lat = m.latitude;
          var lng = m.longitude;
          if (count > 0) {
            // Slight offset so both markers stay visible when coordinates are identical.
            var n = count;
            var sign = n % 2 === 0 ? 1 : -1;
            var step = 0.00008 * (Math.floor((n + 1) / 2));
            lat = lat + step * sign;
            lng = lng - step * sign;
          }
          var latlng = [lat, lng];
          bounds.push(latlng);
          L.circleMarker(latlng, {
            radius: 8,
            color: '#FFFFFF',
            weight: 2,
            fillColor: m.color || '#2E7D32',
            fillOpacity: 0.95
          })
            .addTo(map)
            .bindTooltip(m.label, {
              direction: 'top',
              offset: [0, -6],
              permanent: true,
              opacity: 0.95
            });
        });

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [26, 26], maxZoom: 16 });
        }
      })();
    </script>
  </body>
</html>`;
}
