import { MapPin } from 'lucide-react';

/** OpenStreetMap embed of the truck's live position (FR-10). No API key needed. */
export default function TruckMap({ truck, height }) {
  const lat = Number(truck?.latitude);
  const lng = Number(truck?.longitude);
  if (!truck || Number.isNaN(lat) || Number.isNaN(lng) || (!lat && !lng)) {
    return <div className="map-box"><span className="pin"><MapPin size={24} aria-hidden="true" /></span></div>;
  }
  const d = 0.004;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d * 0.6},${lng + d},${lat + d * 0.6}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="map-frame" style={height ? { aspectRatio: 'auto', height } : undefined}>
      <iframe title={`Map showing the truck at ${truck.locationName}`} src={src} loading="lazy" referrerPolicy="no-referrer" />
      <a className="btn btn-sm map-link" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noreferrer">
        Open map
      </a>
    </div>
  );
}
