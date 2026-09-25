import type { ImagePresetSource } from "@glasshome/widget-sdk";
import bathroom from "./assets/room-bathroom.webp";
import bathroomNightOff from "./assets/room-bathroom-night-off.webp";
import bathroomNightOn from "./assets/room-bathroom-night-on.webp";
import bathroomThumb from "./assets/room-bathroom-thumb.webp";
import bedroom from "./assets/room-bedroom.webp";
import bedroomNightOff from "./assets/room-bedroom-night-off.webp";
import bedroomNightOn from "./assets/room-bedroom-night-on.webp";
import bedroomThumb from "./assets/room-bedroom-thumb.webp";
import dining from "./assets/room-dining.webp";
import diningNightOff from "./assets/room-dining-night-off.webp";
import diningNightOn from "./assets/room-dining-night-on.webp";
import diningThumb from "./assets/room-dining-thumb.webp";
import garage from "./assets/room-garage.webp";
import garageNightOff from "./assets/room-garage-night-off.webp";
import garageNightOn from "./assets/room-garage-night-on.webp";
import garageThumb from "./assets/room-garage-thumb.webp";
import garden from "./assets/room-garden.webp";
import gardenNightOff from "./assets/room-garden-night-off.webp";
import gardenNightOn from "./assets/room-garden-night-on.webp";
import gardenThumb from "./assets/room-garden-thumb.webp";
import hallway from "./assets/room-hallway.webp";
import hallwayNightOff from "./assets/room-hallway-night-off.webp";
import hallwayNightOn from "./assets/room-hallway-night-on.webp";
import hallwayThumb from "./assets/room-hallway-thumb.webp";
import kids from "./assets/room-kids.webp";
import kidsNightOff from "./assets/room-kids-night-off.webp";
import kidsNightOn from "./assets/room-kids-night-on.webp";
import kidsThumb from "./assets/room-kids-thumb.webp";
import kitchen from "./assets/room-kitchen.webp";
import kitchenNightOff from "./assets/room-kitchen-night-off.webp";
import kitchenNightOn from "./assets/room-kitchen-night-on.webp";
import kitchenThumb from "./assets/room-kitchen-thumb.webp";
import living from "./assets/room-living.webp";
import livingNightOff from "./assets/room-living-night-off.webp";
import livingNightOn from "./assets/room-living-night-on.webp";
import livingThumb from "./assets/room-living-thumb.webp";
import office from "./assets/room-office.webp";
import officeNightOff from "./assets/room-office-night-off.webp";
import officeNightOn from "./assets/room-office-night-on.webp";
import officeThumb from "./assets/room-office-thumb.webp";

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

const ROOMS: Record<RoomKind, Room> = {
  living: {
    label: "Living room",
    icon: "mdi:sofa",
    photos: { day: living, nightOff: livingNightOff, nightOn: livingNightOn },
    thumb: livingThumb,
  },
  bedroom: {
    label: "Bedroom",
    icon: "mdi:bed",
    photos: { day: bedroom, nightOff: bedroomNightOff, nightOn: bedroomNightOn },
    thumb: bedroomThumb,
  },
  kitchen: {
    label: "Kitchen",
    icon: "mdi:stove",
    photos: { day: kitchen, nightOff: kitchenNightOff, nightOn: kitchenNightOn },
    thumb: kitchenThumb,
  },
  dining: {
    label: "Dining room",
    icon: "mdi:table-chair",
    photos: { day: dining, nightOff: diningNightOff, nightOn: diningNightOn },
    thumb: diningThumb,
  },
  bathroom: {
    label: "Bathroom",
    icon: "mdi:shower",
    photos: { day: bathroom, nightOff: bathroomNightOff, nightOn: bathroomNightOn },
    thumb: bathroomThumb,
  },
  office: {
    label: "Office",
    icon: "mdi:desk",
    photos: { day: office, nightOff: officeNightOff, nightOn: officeNightOn },
    thumb: officeThumb,
  },
  hallway: {
    label: "Hallway",
    icon: "mdi:door",
    photos: { day: hallway, nightOff: hallwayNightOff, nightOn: hallwayNightOn },
    thumb: hallwayThumb,
  },
  kids: {
    label: "Kids room",
    icon: "mdi:teddy-bear",
    photos: { day: kids, nightOff: kidsNightOff, nightOn: kidsNightOn },
    thumb: kidsThumb,
  },
  garage: {
    label: "Garage",
    icon: "mdi:garage",
    photos: { day: garage, nightOff: garageNightOff, nightOn: garageNightOn },
    thumb: garageThumb,
  },
  garden: {
    label: "Garden",
    icon: "mdi:flower",
    photos: { day: garden, nightOff: gardenNightOff, nightOn: gardenNightOn },
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
