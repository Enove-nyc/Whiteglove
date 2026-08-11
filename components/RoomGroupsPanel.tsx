"use client";

import { useState } from "react";
import { travelersOf, type Itinerary } from "@/data/itinerary";
import {
  assignTravelerRoom,
  roomLabelProblem,
  roomsOf,
  type TripRoom,
  unassignedTravelers,
} from "@/lib/trip-collaboration";

function newRoomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `room-${crypto.randomUUID()}`;
  return `room-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Traveler ↔ room groupings on the itinerary planner.
 *
 * Lives on the itinerary the planner already holds — not a second storage copy.
 * A parallel store returned a new object on every snapshot read, which made
 * React re-render forever and froze /itinerary.
 */
export default function RoomGroupsPanel({
  itinerary,
  onChange,
}: {
  itinerary: Itinerary;
  onChange: (next: Itinerary) => void;
}) {
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");

  const rooms = roomsOf(itinerary);
  const travelers = travelersOf(itinerary);
  const free = unassignedTravelers(travelers, rooms);

  function persist(roomsNext: TripRoom[]) {
    onChange({ ...itinerary, rooms: roomsNext });
  }

  function addRoom(e: React.FormEvent) {
    e.preventDefault();
    const problem = roomLabelProblem(roomName);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    const room: TripRoom = {
      id: newRoomId(),
      label: roomName.trim(),
      travelerIds: [],
    };
    persist([...rooms, room]);
    setRoomName("");
  }

  function move(travelerId: string, roomId: string | null) {
    persist(assignTravelerRoom(rooms, travelerId, roomId));
  }

  if (travelers.length === 0) {
    return (
      <p className="text-sm leading-6 text-stone-600">
        Add travelers to this trip first, then you can group them into rooms.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-stone-600">
        Group who shares a room. Useful for families booking multiple rooms — saved with the trip and visible to anyone
        you share it with.
      </p>

      {rooms.map((room) => (
        <div key={room.id} className="border-t border-[var(--gold-light)] pt-3">
          <p className="font-semibold text-[var(--navy)]">{room.label}</p>
          <ul className="mt-2 space-y-1">
            {room.travelerIds.map((id) => {
              const person = travelers.find((t) => t.id === id);
              if (!person) return null;
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{person.name}</span>
                  <button type="button" className="text-xs font-semibold text-stone-500 underline" onClick={() => move(id, null)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          {free.length > 0 && (
            <label className="mt-2 block text-xs text-stone-500">
              Add traveler
              <select
                className="mt-1 block min-h-11 w-full rounded-md border border-[var(--gold-light)] px-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) move(e.target.value, room.id);
                  e.target.value = "";
                }}
              >
                <option value="">Choose…</option>
                {free.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ))}

      {free.length > 0 && (
        <p className="text-sm text-stone-500">
          Not in a room yet: {free.map((t) => t.name).join(", ")}.
        </p>
      )}

      <form onSubmit={addRoom} className="flex flex-wrap gap-2">
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name"
          className="min-h-11 flex-1 rounded-md border border-[var(--gold-light)] px-3 text-sm"
        />
        <button
          type="submit"
          className="min-h-11 border border-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]"
        >
          Add room
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
