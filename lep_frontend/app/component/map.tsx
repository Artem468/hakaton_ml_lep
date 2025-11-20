"use client";

import { YMaps, Map, Placemark } from "react-yandex-maps";

interface Point {
  lat: number;
  lng: number;
  balloon: string;
  color?: "red" | "blue";
}

interface Props {
  center: [number, number];
  points: Point[];
}

export default function YMapComponent({ center, points }: Props) {
  return (
    <YMaps>
      <Map defaultState={{ center, zoom: 10 }} width="100%" height="400px">
        {points.map((p, i) => (
          <Placemark
            key={i}
            geometry={[p.lat, p.lng]}
            properties={{ balloonContent: p.balloon }}
            options={{ preset: p.color === "red" ? "islands#redIcon" : "islands#blueIcon" }}
          />
        ))}
      </Map>
    </YMaps>
  );
}
