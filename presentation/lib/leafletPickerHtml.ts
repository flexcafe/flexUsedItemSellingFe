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
  kind?: "default" | "proposed";
};

export type LeafletRouteLine = {
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
  color?: string;
};

export type LeafletFocusPoint = {
  latitude: number;
  longitude: number;
};

/**
 * Read-only live map with multiple markers.
 * Used by chat live-location section to show both parties.
 */
export function buildLeafletLiveViewHtml(
  markers: LeafletLiveMarker[],
  routeLine?: LeafletRouteLine | null,
  focusPoint?: LeafletFocusPoint | null,
): string {
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
      kind: m.kind === "proposed" ? "proposed" : "default",
    }));
  const markersJson = JSON.stringify(safeMarkers).replace(/</g, "\\u003c");
  const safeRoute =
    routeLine &&
    Number.isFinite(routeLine.fromLatitude) &&
    Number.isFinite(routeLine.fromLongitude) &&
    Number.isFinite(routeLine.toLatitude) &&
    Number.isFinite(routeLine.toLongitude)
      ? {
          fromLatitude: routeLine.fromLatitude,
          fromLongitude: routeLine.fromLongitude,
          toLatitude: routeLine.toLatitude,
          toLongitude: routeLine.toLongitude,
          color:
            typeof routeLine.color === "string" && routeLine.color.trim()
              ? routeLine.color
              : "#1565C0",
        }
      : null;
  const routeJson = JSON.stringify(safeRoute).replace(/</g, "\\u003c");
  const safeFocusPoint =
    focusPoint &&
    Number.isFinite(focusPoint.latitude) &&
    Number.isFinite(focusPoint.longitude)
      ? {
          latitude: focusPoint.latitude,
          longitude: focusPoint.longitude,
        }
      : null;
  const focusJson = JSON.stringify(safeFocusPoint).replace(/</g, "\\u003c");

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
        var routeLine = ${routeJson};
        var focusPoint = ${focusJson};
        var hasMarkers = Array.isArray(markers) && markers.length > 0;
        var center = focusPoint
          ? [focusPoint.latitude, focusPoint.longitude]
          : hasMarkers
          ? [markers[0].latitude, markers[0].longitude]
          : [16.8, 96.15];
        var zoom = focusPoint ? 16 : hasMarkers ? 15 : 6;

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
          var isProposed = m.kind === 'proposed';
          L.circleMarker(latlng, {
            radius: isProposed ? 6 : 8,
            color: '#FFFFFF',
            weight: 2,
            fillColor: m.color || '#2E7D32',
            fillOpacity: isProposed ? 0.65 : 0.95
          })
            .addTo(map)
            .bindTooltip(m.label, {
              direction: 'top',
              offset: [0, -6],
              permanent: true,
              opacity: 0.95
            });
        });

        if (routeLine) {
          var fallbackPoints = [
            [routeLine.fromLatitude, routeLine.fromLongitude],
            [routeLine.toLatitude, routeLine.toLongitude]
          ];
          bounds.push(fallbackPoints[0], fallbackPoints[1]);

          var routeUrl =
            'https://router.project-osrm.org/route/v1/driving/' +
            routeLine.fromLongitude + ',' + routeLine.fromLatitude + ';' +
            routeLine.toLongitude + ',' + routeLine.toLatitude +
            '?overview=full&geometries=geojson';

          fetch(routeUrl)
            .then(function (res) { return res.json(); })
            .then(function (data) {
              var coords =
                data &&
                Array.isArray(data.routes) &&
                data.routes[0] &&
                data.routes[0].geometry &&
                Array.isArray(data.routes[0].geometry.coordinates)
                  ? data.routes[0].geometry.coordinates
                  : null;
              if (!coords || coords.length < 2) throw new Error('No route');

              var latLngs = coords.map(function (p) {
                return [p[1], p[0]];
              });
              latLngs.forEach(function (p) { bounds.push(p); });
              L.polyline(latLngs, {
                color: routeLine.color || '#1565C0',
                weight: 4,
                opacity: 0.85
              }).addTo(map);
              if (!focusPoint && bounds.length > 1) {
                map.fitBounds(bounds, { padding: [26, 26], maxZoom: 16 });
              }
            })
            .catch(function () {
              // Fallback to straight line if routing service is unavailable.
              L.polyline(fallbackPoints, {
                color: routeLine.color || '#1565C0',
                weight: 4,
                opacity: 0.7,
                dashArray: '8 8'
              }).addTo(map);
              if (!focusPoint && bounds.length > 1) {
                map.fitBounds(bounds, { padding: [26, 26], maxZoom: 16 });
              }
            });
        }

        if (!routeLine && !focusPoint && bounds.length > 1) {
          map.fitBounds(bounds, { padding: [26, 26], maxZoom: 16 });
        }
      })();
    </script>
  </body>
</html>`;
}
