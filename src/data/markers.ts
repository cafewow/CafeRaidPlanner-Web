// Standard 8 WoW raid target markers, in the in-game order.
// `id` is the persisted value on assignments; `icon` resolves under BASE_URL.

export type MarkerId =
  | "star"
  | "circle"
  | "diamond"
  | "triangle"
  | "moon"
  | "square"
  | "cross"
  | "skull";

export type Marker = {
  id: MarkerId;
  name: string;
  icon: string;
};

export const MARKERS: Marker[] = [
  { id: "star",     name: "Star",     icon: "icons/markers/marker_star.webp" },
  { id: "circle",   name: "Circle",   icon: "icons/markers/marker_circle.webp" },
  { id: "diamond",  name: "Diamond",  icon: "icons/markers/marker_diamond.webp" },
  { id: "triangle", name: "Triangle", icon: "icons/markers/marker_triangle.webp" },
  { id: "moon",     name: "Moon",     icon: "icons/markers/marker_moon.webp" },
  { id: "square",   name: "Square",   icon: "icons/markers/marker_square.webp" },
  { id: "cross",    name: "Cross",    icon: "icons/markers/marker_cross.webp" },
  { id: "skull",    name: "Skull",    icon: "icons/markers/marker_skull.webp" },
];

export const MARKER_BY_ID: Record<MarkerId, Marker> = Object.fromEntries(
  MARKERS.map((m) => [m.id, m]),
) as Record<MarkerId, Marker>;
