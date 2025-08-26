import { convertIcsCalendar, type IcsCalendar, type IcsEvent } from "ts-ics";
import { readFile } from "node:fs/promises"



async function fetchCalendarRemote(url: string): Promise<IcsCalendar> {

  console.log(`Fetching events from remote ${url}, this may take a while...`)
  const resp = await fetch(url)
  if (resp.status !== 200) {
    throw new Error(`non-200 code: ${resp.status}`);
  }

  return convertIcsCalendar(undefined, await resp.text());
}

async function fetchCalendarLocal(filename: string): Promise<IcsCalendar> {
  console.log(`Reading events from path: ${filename}...`)
  const f = await readFile(filename);
  return convertIcsCalendar(undefined, await f.toString());
}


let calendar: IcsCalendar;
if (import.meta.env.MODE === "production") {
  console.log("Production mode detected, fetching data from remote...")
  calendar = await fetchCalendarRemote("https://optime.helsinki.fi/icalservice/Building/13");
} else {
  console.log("Development mode detected, fetching data from disk...")
  calendar = await fetchCalendarLocal("building13.ics")
}


function parseEvents(cal: IcsCalendar) {
  if (!calendar.events) {
    throw new Error("no events in the ics");
  }
  const buildings = new Map<string, Map<string, IcsEvent[]>>(); // Building -> Room
  for (const event of calendar.events) {
    if (!event.location || !event.start || !event.end) {
      continue
    }
    const locationRegex = /(.*?),(.*?)($|,)/g;
    const locations = event.location.matchAll(locationRegex).map(x => ({ building: x[1].trim(), room: x[2].trim() })).toArray();
    for (const location of locations) {
      if (!buildings.has(location.building))
        buildings.set(location.building, new Map())
      const building = buildings.get(location.building)!;
      if (!building.has(location.room))
        building.set(location.room, [])
      const room = building.get(location.room)!;
      room.push(event)
    }
  }
  return buildings
}

const ev = parseEvents(calendar);
export default ev;