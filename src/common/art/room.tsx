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
import { standIn } from "./stand-in";

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

const photosOf = (kind: RoomKind): RoomPhotos => ({
  day: standIn(`room-${kind}`),
  nightOff: standIn(`room-${kind}-night-off`),
  nightOn: standIn(`room-${kind}-night-on`),
});

const ROOMS: Record<RoomKind, Room> = {
  living: {
    // ui-text-ok: schema label the manifest derives
    label: "Living room",
    icon: "mdi:sofa",
    photos: photosOf("living"),
    thumb: livingThumb,
  },
  bedroom: {
    // ui-text-ok: schema label the manifest derives
    label: "Bedroom",
    icon: "mdi:bed",
    photos: photosOf("bedroom"),
    thumb: bedroomThumb,
  },
  kitchen: {
    // ui-text-ok: schema label the manifest derives
    label: "Kitchen",
    icon: "mdi:stove",
    photos: photosOf("kitchen"),
    thumb: kitchenThumb,
  },
  dining: {
    // ui-text-ok: schema label the manifest derives
    label: "Dining room",
    icon: "mdi:table-chair",
    photos: photosOf("dining"),
    thumb: diningThumb,
  },
  bathroom: {
    // ui-text-ok: schema label the manifest derives
    label: "Bathroom",
    icon: "mdi:shower",
    photos: photosOf("bathroom"),
    thumb: bathroomThumb,
  },
  office: {
    // ui-text-ok: schema label the manifest derives
    label: "Office",
    icon: "mdi:desk",
    photos: photosOf("office"),
    thumb: officeThumb,
  },
  hallway: {
    // ui-text-ok: schema label the manifest derives
    label: "Hallway",
    icon: "mdi:door",
    photos: photosOf("hallway"),
    thumb: hallwayThumb,
  },
  kids: {
    // ui-text-ok: schema label the manifest derives
    label: "Kids room",
    icon: "mdi:teddy-bear",
    photos: photosOf("kids"),
    thumb: kidsThumb,
  },
  garage: {
    // ui-text-ok: schema label the manifest derives
    label: "Garage",
    icon: "mdi:garage",
    photos: photosOf("garage"),
    thumb: garageThumb,
  },
  garden: {
    // ui-text-ok: schema label the manifest derives
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
