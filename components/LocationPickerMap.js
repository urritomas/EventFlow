"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from "react-leaflet";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";

// Fix default marker icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Click handler
function LocationMarker({ position, readonly, onLocationSelect }) {
  const internalClickRef = useRef(false);
  
  useMapEvents({
    click(e) {
      if (!readonly) {
        internalClickRef.current = true;
        onLocationSelect && onLocationSelect(e.latlng);
      }
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPickerMap({
	onLocationSelect,
	radius = 100,
	initialLocation,
	readonly = false,
}) {
	const [position, setPosition] = useState(initialLocation || null);
	const [mounted, setMounted] = useState(false);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		setMounted(true);
		if (!isInitializedRef.current && initialLocation) {
			setPosition(initialLocation);
			isInitializedRef.current = true;
		}
	}, []);

	if (!mounted) {
		return (
			<div
				style={{
					height: "350px",
					width: "100%",
					borderRadius: "12px",
					backgroundColor: "var(--surface-soft)",
					border: "1px solid var(--border-subtle)",
				}}
			/>
		);
	}

	// Calculate center: convert {lat, lng} to [lat, lng] array for Leaflet
	const center = position ? [position.lat, position.lng] : [7.0731, 125.6128];
	const circlePos = position ? [position.lat, position.lng] : null;

	return (
		<MapContainer
			center={center}
			zoom={15}
			style={{ height: "350px", width: "100%", borderRadius: "12px" }}
		>
			<TileLayer
				attribution='&copy; OpenStreetMap contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>

			<LocationMarker
				position={position}
				readonly={readonly}
				onLocationSelect={(pos) => {
					setPosition(pos);
					onLocationSelect && onLocationSelect(pos);
				}}
			/>

			{circlePos && (
				<Circle
					center={circlePos}
					radius={radius}
					pathOptions={{
						color: "blue",
						fillColor: "blue",
						fillOpacity: 0.2,
					}}
				/>
			)}
		</MapContainer>
	);
}