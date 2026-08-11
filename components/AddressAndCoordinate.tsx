"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { describeCoordinate } from "@/lib/place-coordinates";

/**
 * An address and a coordinate reviewed together.
 *
 * THE COORDINATE IS NEVER FILLED IN FROM THE ADDRESS, and that is deliberate.
 * The standing rule on the kever screen: leave it blank unless you know the
 * actual grave, because an approximate pin at the wrong end of a town is worse
 * than an address and a phone call. A town-centre coordinate written in here
 * automatically would be exactly that pin, and it would look checked. There is
 * no button to do it either — one click is all it takes to turn a guess into a
 * fact somebody drives to.
 *
 * Coordinates remain a deliberate editorial field. A typed address does not
 * trigger any external geocoder or imply that its location has been checked.
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
  const said = describeCoordinate(coordinate, undefined, address);

  return (
    <>
      <label className="block sm:col-span-2">
        <span className={captionClass}>{addressLabel}</span>
        <AddressAutocomplete
          name={addressName}
          value={address}
          placeholder={addressPlaceholder}
          className={inputClass}
          onChange={(next) => {
            setAddress(next);
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
      </label>
    </>
  );
}
