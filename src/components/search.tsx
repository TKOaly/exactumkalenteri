import { Searcher } from "fast-fuzzy";
import { useEffect, useState, useMemo, useRef } from "react"
import { dateTimeFormat } from "../utils";
import type { CalType } from "../cal";
import "./search.css"

const weekdays = [
  "Maanantai",
  "Tiistai",
  "Keskiviikko",
  "Torstai",
  "Perjantai",
  "Lauantai",
  "Sunnuntai",
];
const weekdaysShort = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];
const DURATION_24H = 1000 * 3600 * 24;
const weekFirstDay = new Date(new Date(
  (Date.now() - (new Date().getDay() - 1) * DURATION_24H)
).setHours(0));
const today = new Date();

function renderRow(x: CalType) {
  return <div className={"event-row" + (x.event.end && x.event.end.date < today ? " past" : "")} key={x.event.uid}>
    <div className="c1">
      <span>
        {weekdaysShort[x.event.start.date.getDay() - 1]}
        {" "}
        {`${x.event.start.date.getDate()}.${x.event.start.date.getMonth() + 1}.${x.event.start.date.getFullYear()}`}
      </span>
    </div>
    <div className="c2">
      <span>
        {dateTimeFormat(x.event.start.date)} -{" "}
        {x.event.end && dateTimeFormat(x.event.end.date)}
      </span>
    </div>
    <div className="c3">
      <span>
        {x.location.building} {" "}
        {x.location.room}
      </span>
    </div>
    <div className="c4">
      <span>
        {x.event.summary}
      </span>
    </div>
  </div>
}

export function Search() {
  const [searchQuery, setSearchQuery] = useState(new URL(window.location.href).searchParams.get("query") ?? "");
  useEffect(() => {
    const url = new URL(window.location.href);
    if (searchQuery.length === 0)
      url.searchParams.delete("query");
    else
      url.searchParams.set("query", searchQuery);
    window.history.replaceState(null, '', url.toString());
  }, [searchQuery]);

  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [events, setEvents] = useState<CalType[]>([]);
  useEffect(() => {
    fetch("/events.json").then(r => r.json()).then((e: CalType[]) => e.map(e => {
      e.event.start.date = new Date(e.event.start.date);
      if (e.event.end)
        e.event.end.date = new Date(e.event.end.date);
      return e;
    }).filter(x => x.event.start.date >= weekFirstDay))
      .then(setEvents)
  }, [])

  const searchIndex = useMemo(() => new Searcher(events, {
    keySelector: x => (x.event.description ?? "")
  }), [events]); // React compiler does not automatically memoize this

  const rooms = new Set(events.map(x => x.location.room.toLowerCase()));
  const buildings = new Set(events.map(x => x.location.building.toLowerCase()));
  const searchWords = searchQuery.split(/\s/).map(x => x.trim()).filter(x => x.length > 0)
  const filterByRoom = searchWords.filter(x => rooms.has(x)).map(x => x.toLowerCase())
  const filterByBuilding = searchWords.filter(x => buildings.has(x)).map(x => x.toLowerCase())

  const descriptionFilter = searchWords.filter(x =>
    !filterByRoom.includes(x.toLowerCase()) &&
    !filterByBuilding.includes(x.toLowerCase()))
    .join(" ")

  let filteredEvents: CalType[] = events;

  const roomBuildingMatch = (x: CalType) => {
    const matchRoom = (filterByRoom.length === 0 || filterByRoom.includes(x.location.room.toLowerCase()))
    const matchBuilding = (filterByBuilding.length === 0 || filterByBuilding.includes(x.location.building.toLowerCase()))
    return matchRoom && matchBuilding
  };

  if (searchIndex && descriptionFilter.length > 0) {
    const fuzzied = searchIndex.search(descriptionFilter, { returnMatchData: true, threshold: 0.2 })
    const results = [];
    let bestScore = -1;
    for (const event of fuzzied) {
      if (!roomBuildingMatch(event.item))
        continue;
      if (bestScore === -1) {
        bestScore = event.score;
      }
      if (event.score < bestScore)
        break;
      results.push(event.item);
    }
    filteredEvents = results;
  } else {
    filteredEvents = filteredEvents.filter(roomBuildingMatch)
  }

  const tooManyEvents = filteredEvents.length > 1000;
  filteredEvents = filteredEvents.toSorted(
    (a, b) =>
      a.event.start.date < b.event.start.date ? -1 : a.event.start.date > b.event.start.date ? 1 : 0
  ).slice(0, 1000)

  return <>
    <div className="search-wrap">
      <span>hakutuloksia: {tooManyEvents && "yli "}{filteredEvents.length}</span>
      <input ref={inputRef} placeholder="Haku (tapahtuman, huoneen, rakennuksen nimi)" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
    </div>
    <div>
      {weekdays.map((day, idx) => <>
        <div className={"day-row" + (today.getDay() - 1 === idx ? " today" : "")}>
          <span>
            {day}
          </span>
        </div>
        {(filteredEvents.filter(x =>
          x.event.start.date >=
          new Date(weekFirstDay.getTime() + DURATION_24H * idx) &&
          x.event.start.date <
          new Date(weekFirstDay.getTime() + DURATION_24H * (idx + 1))).length === 0
        ) &&
          <div className="info-row">
            <span>
              Ei tapahtumia.
            </span>
          </div >
        }
        <div className="rows-wrap">
          {filteredEvents.filter(x =>
            x.event.start.date >=
            new Date(weekFirstDay.getTime() + DURATION_24H * idx) &&
            x.event.start.date <
            new Date(weekFirstDay.getTime() + DURATION_24H * (idx + 1))).map(x => (
              renderRow(x)
            ))}
        </div>
      </>)}
      <div className="day-row">
        <span>
          Myöhemmin
        </span>
      </div>
      <div className="rows-wrap">
        {filteredEvents.filter(x => x.event.start.date >= new Date(weekFirstDay.getTime() + DURATION_24H * 7)).map(renderRow)}
      </div>
      {tooManyEvents &&
        <div className="info-row">
          <span>
            Vain {filteredEvents.length} ensimmäistä tulosta näytettiin. Tarkenna hakua.
          </span>
        </div>
      }
    </div >
  </>
}