import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import Icon from '../components/Icon';
import SimpleLineChart from '../components/SimpleLineChart';

const BLR_CENTER = [12.97, 77.59];
const BLR_DEFAULT_ZOOM = 11;

function MapFitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds || !map) return;
    const { south, north, west, east } = bounds;
    if (Math.abs(north - south) < 1e-6 && Math.abs(east - west) < 1e-6) {
      map.setView([south, west], BLR_DEFAULT_ZOOM);
      return;
    }
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [40, 40], maxZoom: 13 }
    );
  }, [bounds, map]);
  return null;
}

function narrativeFromTrends(analysis) {
  if (!analysis?.disease_prevalence) return '';
  const entries = Object.entries(analysis.disease_prevalence)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  if (!entries.length) return '';
  const top = entries[0];
  const secondary = entries.slice(1, 3).filter((e) => e.count > 0);
  const parts = [
    `Leading condition is ${top.name} (${(top.percentage ?? 0).toFixed(1)}% of visits in this extract).`,
  ];
  if (secondary.length) {
    parts.push(
      `Also notable: ${secondary.map((e) => `${e.name} (${(e.percentage ?? 0).toFixed(1)}%)`).join(', ')}.`
    );
  }
  const demo = analysis.demographic_patterns;
  if (demo?.gender_distribution && Object.keys(demo.gender_distribution).length) {
    const g = Object.entries(demo.gender_distribution)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Gender split (visit counts): ${g}.`);
  }
  return parts.join(' ');
}

export default function TrendsMapView({ apiBaseUrl }) {
  const [mapDiseases, setMapDiseases] = useState([]);
  const [mapData, setMapData] = useState({
    points: [],
    diseases: [],
    bounds: null,
    subregions: [],
    weekly_series: { weeks: [], series: {} },
    alerts: [],
  });
  const [regionalContext, setRegionalContext] = useState(null);
  const [contextError, setContextError] = useState('');
  const [mapError, setMapError] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [chartFocus, setChartFocus] = useState(['Dengue', 'Viral Fever']);

  const fetchMap = useCallback(async () => {
    setMapLoading(true);
    setMapError('');
    try {
      const u = new URL(`${apiBaseUrl}/regional_map_points`);
      u.searchParams.set('city', 'bengaluru');
      if (mapDiseases.length) {
        u.searchParams.set('diseases', mapDiseases.join(','));
      } else {
        u.searchParams.set('disease', 'all');
      }
      const res = await fetch(u.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Map data failed');
      setMapData({
        points: data.points || [],
        diseases: data.diseases || [],
        bounds: data.bounds || null,
        subregions: data.subregions || [],
        weekly_series: data.weekly_series || { weeks: [], series: {} },
        alerts: data.alerts || [],
      });
    } catch (e) {
      setMapError(e.message || 'Could not load map');
      setMapData({
        points: [],
        diseases: [],
        bounds: null,
        subregions: [],
        weekly_series: { weeks: [], series: {} },
        alerts: [],
      });
    } finally {
      setMapLoading(false);
    }
  }, [apiBaseUrl, mapDiseases]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setContextError('');
      try {
        const res = await fetch(`${apiBaseUrl}/regional_trends/Bangalore`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Context failed');
        setRegionalContext(data);
      } catch (e) {
        if (!cancelled) {
          setContextError(e.message || 'No regional narrative');
          setRegionalContext(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const maxW = useMemo(() => {
    const ws = mapData.points.map((p) => p.weight);
    return ws.length ? Math.max(...ws) : 1;
  }, [mapData.points]);

  const center = useMemo(() => {
    if (!mapData.points.length) return BLR_CENTER;
    const lat = mapData.points.reduce((s, p) => s + p.lat, 0) / mapData.points.length;
    const lng = mapData.points.reduce((s, p) => s + p.lng, 0) / mapData.points.length;
    return [lat, lng];
  }, [mapData.points]);

  const narrative = useMemo(() => narrativeFromTrends(regionalContext), [regionalContext]);

  const weekLabels = mapData.weekly_series.weeks.length
    ? mapData.weekly_series.weeks
    : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

  const toggleDisease = (name) => {
    setMapDiseases((prev) => (prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]));
  };

  const clearDiseaseFilters = () => setMapDiseases([]);

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-6 bg-background min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Regional trends — Bengaluru</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Area-level burden (aggregated localities), condition tags, heat-style intensity, and weekly trajectories
          derived from the Bengaluru demo extract. Use the checkboxes to compare syndromes; empty selection = all
          conditions.
        </p>
      </div>

      {mapData.alerts.length > 0 && (
        <div
          className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-on-surface"
          role="status"
        >
          <div className="font-semibold text-error flex items-center gap-2 mb-1">
            <Icon name="warning" className="text-lg" />
            Regional activity alert
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {mapData.alerts.map((a) => (
              <li key={a.area}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm ring-1 ring-outline-variant/10">
          <div className="flex flex-col gap-4 mb-4">
            <label className="text-sm font-medium text-on-surface flex items-center gap-2">
              <Icon name="coronavirus" className="text-primary text-lg" />
              Conditions on map (multi-select)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {mapData.diseases.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDisease(d)}
                  className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                    mapDiseases.includes(d)
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary/50'
                  }`}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={clearDiseaseFilters}
                className="text-xs rounded-full px-3 py-1 border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container"
              >
                All conditions
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              {mapLoading && <span>Updating map…</span>}
              {mapError && <span className="text-error">{mapError}</span>}
            </div>
          </div>

          <div className="h-[min(440px,58vh)] w-full rounded-xl overflow-hidden border border-outline-variant/20 z-0">
            {!mapError && (
              <MapContainer
                center={center}
                zoom={BLR_DEFAULT_ZOOM}
                scrollWheelZoom
                className="h-full w-full"
                style={{ minHeight: 320 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapData.bounds && <MapFitBounds bounds={mapData.bounds} />}
                {mapData.points.map((p, i) => {
                  const t = p.weight / maxW;
                  const radius = 8 + t * 28;
                  const fillOpacity = 0.32 + t * 0.5;
                  return (
                    <CircleMarker
                      key={`${p.lat}-${p.lng}-${p.area || i}`}
                      center={[p.lat, p.lng]}
                      radius={radius}
                      pathOptions={{
                        color: '#004d46',
                        fillColor: '#008378',
                        fillOpacity,
                        weight: 1,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -4]}>
                        <div className="text-xs max-w-[220px]">
                          {p.area && <div className="font-semibold">{p.area}</div>}
                          <div>Visits: {p.weight}</div>
                          <div>
                            Top diagnosis: {p.top_diagnosis} ({p.top_share_pct}%)
                          </div>
                          {p.diagnosis_mix && <div className="text-on-surface-variant">{p.diagnosis_mix}</div>}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            Heat-style layer: circle size and opacity scale with visit count per area. Tooltips show the dominant
            syndrome mix (privacy: synthetic aggregate extract).
          </p>
        </div>

        <aside className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-outline-variant/10 space-y-3">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Icon name="travel_explore" className="text-primary text-lg" />
            Regional intelligence
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Same analytic slice as <code className="text-[10px]">/regional_trends/Bangalore</code>: prevalence and
            demographics for the city extract.
          </p>
          {contextError && <p className="text-xs text-error">{contextError}</p>}
          {narrative && <p className="text-sm text-on-surface leading-relaxed">{narrative}</p>}
        </aside>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm ring-1 ring-outline-variant/10 overflow-x-auto">
        <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <Icon name="table_chart" className="text-primary" />
          Top subregions
        </h3>
        <table className="w-full text-sm text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="text-on-surface-variant text-xs border-b border-outline-variant/20">
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Visits</th>
              <th className="py-2 pr-4">% of city</th>
              <th className="py-2 pr-4">Leading diagnosis</th>
              <th className="py-2">Share in area</th>
            </tr>
          </thead>
          <tbody>
            {mapData.subregions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-on-surface-variant text-center">
                  No rows (load map data or widen filters).
                </td>
              </tr>
            )}
            {mapData.subregions.map((row) => (
              <tr key={row.area} className="border-b border-outline-variant/10 text-on-surface">
                <td className="py-2 pr-4 font-medium">{row.area}</td>
                <td className="py-2 pr-4">{row.count}</td>
                <td className="py-2 pr-4">{row.pct_of_city != null ? `${row.pct_of_city}%` : '—'}</td>
                <td className="py-2 pr-4">{row.top_diagnosis}</td>
                <td className="py-2">{row.share_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm ring-1 ring-outline-variant/10 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4">
        <div className="text-sm text-on-surface font-medium">Chart focus (pick two)</div>
        <div className="flex flex-wrap gap-2">
          {mapData.diseases.map((d) => (
            <button
              type="button"
              key={`ch-${d}`}
              onClick={() => {
                setChartFocus((prev) => {
                  if (prev.includes(d)) return prev.filter((x) => x !== d);
                  if (prev.length < 2) return [...prev, d];
                  return [prev[1], d];
                });
              }}
              className={`text-xs rounded-full px-3 py-1 border ${
                chartFocus.includes(d)
                  ? 'bg-secondary-container border-secondary text-on-secondary-container'
                  : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm ring-1 ring-outline-variant/10 space-y-6">
        <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
          <Icon name="trending_up" className="text-primary" />
          Weekly case trends (Bengaluru extract)
        </h3>
        {chartFocus.filter((d) => mapData.weekly_series.series[d]).length === 0 && (
          <p className="text-sm text-on-surface-variant">Select at least one condition with data for the current filters.</p>
        )}
        {chartFocus.map((title) => {
          const raw = mapData.weekly_series.series[title];
          if (!raw) return null;
          const data = raw.map((v, i) => ({
            date: weekLabels[i] || `W${i + 1}`,
            value: `${v}`,
          }));
          const color = title === 'Dengue' ? '#ba1a1a' : title.includes('Malaria') ? '#7c4dff' : '#00685f';
          return <SimpleLineChart key={title} data={data} title={title} color={color} />;
        })}
      </div>
    </div>
  );
}
