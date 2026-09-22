import bathroom from "./assets/room-bathroom.webp";
import bathroomNightOff from "./assets/room-bathroom-night-off.webp";
import bathroomNightOn from "./assets/room-bathroom-night-on.webp";
import bedroom from "./assets/room-bedroom.webp";
import bedroomNightOff from "./assets/room-bedroom-night-off.webp";
import bedroomNightOn from "./assets/room-bedroom-night-on.webp";
import dining from "./assets/room-dining.webp";
import diningNightOff from "./assets/room-dining-night-off.webp";
import diningNightOn from "./assets/room-dining-night-on.webp";
import garage from "./assets/room-garage.webp";
import garageNightOff from "./assets/room-garage-night-off.webp";
import garageNightOn from "./assets/room-garage-night-on.webp";
import garden from "./assets/room-garden.webp";
import gardenNightOff from "./assets/room-garden-night-off.webp";
import gardenNightOn from "./assets/room-garden-night-on.webp";
import hallway from "./assets/room-hallway.webp";
import hallwayNightOff from "./assets/room-hallway-night-off.webp";
import hallwayNightOn from "./assets/room-hallway-night-on.webp";
import kids from "./assets/room-kids.webp";
import kidsNightOff from "./assets/room-kids-night-off.webp";
import kidsNightOn from "./assets/room-kids-night-on.webp";
import kitchen from "./assets/room-kitchen.webp";
import kitchenNightOff from "./assets/room-kitchen-night-off.webp";
import kitchenNightOn from "./assets/room-kitchen-night-on.webp";
import living from "./assets/room-living.webp";
import livingNightOff from "./assets/room-living-night-off.webp";
import livingNightOn from "./assets/room-living-night-on.webp";
import office from "./assets/room-office.webp";
import officeNightOff from "./assets/room-office-night-off.webp";
import officeNightOn from "./assets/room-office-night-on.webp";
const ROOMS: [RegExp, string, string][] = [
  [/kid|child|nursery|play/i, kids, "mdi:teddy-bear"],
  [/bed|sleep|guest/i, bedroom, "mdi:bed"],
  [/dining/i, dining, "mdi:table-chair"],
  [/kitchen|pantry/i, kitchen, "mdi:stove"],
  [/bath|shower|wc|toilet/i, bathroom, "mdi:shower"],
  [/office|study|work/i, office, "mdi:desk"],
  [/hall|entr|corridor|foyer|lobby/i, hallway, "mdi:door"],
  [/garage|carport|workshop/i, garage, "mdi:garage"],
  [/garden|terrace|patio|balcony|outdoor|yard|porch/i, garden, "mdi:flower"],
  [/living|lounge|family|salon|den/i, living, "mdi:sofa"],
];

export interface RoomPhotos {
  day: string;
  nightOff?: string;
  nightOn?: string;
}

const NIGHT: Record<string, Omit<RoomPhotos, "day">> = {
  [bathroom]: { nightOff: bathroomNightOff, nightOn: bathroomNightOn },
  [bedroom]: { nightOff: bedroomNightOff, nightOn: bedroomNightOn },
  [dining]: { nightOff: diningNightOff, nightOn: diningNightOn },
  [garage]: { nightOff: garageNightOff, nightOn: garageNightOn },
  [garden]: { nightOff: gardenNightOff, nightOn: gardenNightOn },
  [hallway]: { nightOff: hallwayNightOff, nightOn: hallwayNightOn },
  [kids]: { nightOff: kidsNightOff, nightOn: kidsNightOn },
  [kitchen]: { nightOff: kitchenNightOff, nightOn: kitchenNightOn },
  [living]: { nightOff: livingNightOff, nightOn: livingNightOn },
  [office]: { nightOff: officeNightOff, nightOn: officeNightOn },
};

export function roomPhotos(name: string): RoomPhotos | undefined {
  const day = ROOMS.find(([re]) => re.test(name))?.[1];
  return day ? { day, ...NIGHT[day] } : undefined;
}

export function roomIcon(name: string): string {
  return ROOMS.find(([re]) => re.test(name))?.[2] ?? "mdi:home-floor-1";
}
