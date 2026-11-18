import type { ImagePresetSource } from "@glasshome/widget-sdk";
import bathroomThumb from "./assets/room-bathroom-thumb.webp";
import bedroomThumb from "./assets/room-bedroom-thumb.webp";
import diningThumb from "./assets/room-dining-thumb.webp";
import garageThumb from "./assets/room-garage-thumb.webp";
import gardenThumb from "./assets/room-garden-thumb.webp";
import hallwayThumb from "./assets/room-hallway-thumb.webp";
import kidsThumb from "./assets/room-kids-thumb.webp";
import kitchenThumb from "./assets/room-kitchen-thumb.webp";
import livingThumb from "./assets/room-living-thumb.webp";
import officeThumb from "./assets/room-office-thumb.webp";
import "./room-art.css";

export type RoomKind =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "bathroom"
  | "office"
  | "hallway"
  | "kids"
  | "garage"
  | "garden";

interface Room {
  label: string;
  icon: string;
  photos: RoomPhotos;
  thumb: string;
}

export interface RoomPhotos {
  day: string;
  nightOff?: string;
  nightOn?: string;
}

/** An empty picture whose src names a photo; room-art.css paints that photo behind it. */
const standIn = (asset: string) =>
  `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20id='${asset}'/%3E`;

const photosOf = (kind: RoomKind): RoomPhotos => ({
  day: standIn(`room-${kind}`),
  nightOff: standIn(`room-${kind}-night-off`),
  nightOn: standIn(`room-${kind}-night-on`),
});

const ROOMS: Record<RoomKind, Room> = {
  living: {
    label: "Living room",
    icon: "mdi:sofa",
    photos: photosOf("living"),
    thumb: livingThumb,
  },
  bedroom: {
    label: "Bedroom",
    icon: "mdi:bed",
    photos: photosOf("bedroom"),
    thumb: bedroomThumb,
  },
  kitchen: {
    label: "Kitchen",
    icon: "mdi:stove",
    photos: photosOf("kitchen"),
    thumb: kitchenThumb,
  },
  dining: {
    label: "Dining room",
    icon: "mdi:table-chair",
    photos: photosOf("dining"),
    thumb: diningThumb,
  },
  bathroom: {
    label: "Bathroom",
    icon: "mdi:shower",
    photos: photosOf("bathroom"),
    thumb: bathroomThumb,
  },
  office: {
    label: "Office",
    icon: "mdi:desk",
    photos: photosOf("office"),
    thumb: officeThumb,
  },
  hallway: {
    label: "Hallway",
    icon: "mdi:door",
    photos: photosOf("hallway"),
    thumb: hallwayThumb,
  },
  kids: {
    label: "Kids room",
    icon: "mdi:teddy-bear",
    photos: photosOf("kids"),
    thumb: kidsThumb,
  },
  garage: {
    label: "Garage",
    icon: "mdi:garage",
    photos: photosOf("garage"),
    thumb: garageThumb,
  },
  garden: {
    label: "Garden",
    icon: "mdi:flower",
    photos: photosOf("garden"),
    thumb: gardenThumb,
  },
};

const ROOM_KINDS = Object.keys(ROOMS) as RoomKind[];

/** The built-in rooms, offered in a widget's photo picker. */
export const ROOM_PRESETS = Object.fromEntries(
  ROOM_KINDS.map((kind) => [
    kind,
    { label: ROOMS[kind].label, src: ROOMS[kind].photos.day, thumb: ROOMS[kind].thumb },
  ]),
) as Record<RoomKind, ImagePresetSource>;

export function isRoomKind(key: string | undefined): key is RoomKind {
  return key !== undefined && key in ROOMS;
}

export function roomPhotos(kind: RoomKind | undefined): RoomPhotos | undefined {
  return kind ? ROOMS[kind].photos : undefined;
}

export function roomIcon(kind: RoomKind | undefined): string {
  return kind ? ROOMS[kind].icon : "mdi:home-floor-1";
}
