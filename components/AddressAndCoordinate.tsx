"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { describeCoordinate } from "@/lib/place-coordinates";

/**
 * An address that is picked, and a coordinate that is checked against it.
 *
 * The address is a real one off the map rather than a line somebody typed, so
 * it can actually be found — a hand-typed address is one nothing has resolved,
 * and half of them here are Polish and Ukrainian street names with diacritics
 * that a keyboard gets wrong in a way no page ever notices.
 *
 * THE COORDINATE IS NEVER FILLED IN FROM THE ADDRESS, and that is deliberate.
 * The standing rule on the kever screen: leave it blank unless you know the
 * actual grave, because an approximate pin at the wrong end of a town is worse
 * than an address and a phone call. A town-centre coordinate written in here
 * automatically would be exactly that pin, and it would look checked. There is
 * no button to do it either — one click is all it takes to turn a guess into a
 * fact somebody drives to.
 *
 * What the address's coordinate IS used for is the check underneath: a
 * transposed digit moves a pin a hundred kilometres and nothing about the
 * number looks wrong. That is a question rather than a refusal — the person
 * typing may know where the grave is when the map does not, which happens
 * constantly on these routes.
 */
export default function AddressAndCoordinate({
  addressName = "address",
  coordinateName = "coordinates",
  addressLabel = "Address",
  coordinateLabel = "Coordinates",
  addressPlaceholder,
  coordinatePlaceholder = "50.251139, 22.422611",
  defaultAddress = "",
  defaultCoordinate = "",
  /**
   * Controlled use: pass both and hold the state yourself. Left out, the pair
   * keeps its own — which is what a plain <form> posting to a server action
   * needs, and what the kever screen uses.
   */
  address: addressProp,
  coordinates: coordinateProp,
  captionClass,
  inputClass,
  /** Told about every change, for a form that keeps its own state. */
  onChange,
}: {
  addressName?: string;
  coordinateName?: string;
  addressLabel?: string;
  coordinateLabel?: string;
  addressPlaceholder?: string;
  coordinatePlaceholder?: string;
  defaultAddress?: string;
  defaultCoordinate?: string;
  address?: string;
  coordinates?: string;
  captionClass: string;
  inputClass: string;
  onChange?: (next: { address: string; coordinates: string }) => void;
}) {
  const [ownAddress, setOwnAddress] = useState(defaultAddress);
  const [ownCoordinate, setOwnCoordinate] = useState(defaultCoordinate);
  const address = addressProp ?? ownAddress;
  const coordinate = coordinateProp ?? ownCoordinate;
  const setAddress = (next: string) => { if (addressProp === undefined) setOwnAddress(next); };
  const setCoordinate = (next: string) => { if (coordinateProp === undefined) setOwnCoordinate(next); };
  // Where the map says the picked address is. Used only to check the
  // coordinate below — never written into it.
  const [addressCoordinate, setAddressCoordinate] = useState("");

  const said = describeCoordinate(coordinate, addressCoordinate, address);

  return (
    <>
      <label className="block sm:col-span-2">
        <span className={captionClass}>{addressLabel}</span>
        <AddressAutocomplete
          name={addressName}
          value={address}
          placeholder={addressPlaceholder}
          className={inputClass}
          onChange={(next, coords) => {
            setAddress(next);
            // Kept, not applied.
            if (coords) setAddressCoordinate(coords);
            onChange?.({ address: next, coordinates: coordinate });
          }}
        />
      </label>

      <label className="block sm:col-span-2">
        <span className={captionClass}>{coordinateLabel}</span>
        <input
          name={coordinateName}
          value={coordinate}
          placeholder={coordinatePlaceholder}
          className={inputClass}
          onChange={(e) => {
            setCoordinate(e.target.value);
            onChange?.({ address, coordinates: e.target.value });
          }}
        />
        {said.tone !== "none" && (
          <span
            className={`mt-1.5 block text-xs leading-5 ${said.tone === "problem" ? "font-semibold text-red-700" : "text-[var(--navy)]"}`}
          >
            {said.says}
          </span>
        )}
        {said.tone === "none" && addressCoordinate && (
          <span className="mt-1.5 block text-xs leading-5 text-stone-500">
            {/* Shown, not applied — so somebody who genuinely means the address
                itself can copy it, and nobody gets it by accident. */}
            The address above is at <code className="text-[var(--navy)]">{addressCoordinate}</code>. Only use that if the
            address is the beis hachaim itself rather than the town.
          </span>
        )}
      </label>
    </>
  );
}
