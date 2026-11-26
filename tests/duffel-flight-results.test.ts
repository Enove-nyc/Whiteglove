import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultFlightFilters, filterFlightResults, flightMetrics, type FlightOption } from "@/lib/duffel-flight-results";

const option = (id: string, price: number, airline = "Test Air", overrides: Partial<FlightOption> = {}): FlightOption => ({
  id, airline, route: "JFK – LAX", departure: "2027-02-04T08:30:00", stops: 0, totalAmount: String(price), totalCurrency: "USD",
  slices: [{duration: "PT6H", segments: [{origin:"JFK", destination:"LAX", departingAt: "2027-02-04T08:30:00", arrivingAt:"2027-02-04T11:30:00", airline, checkedBags:1, carryOnBags:1}]}],
  ...overrides,
});
test("cheapest includes offers beyond the first 12 and filters by price, airline and local time", () => {
  const flights = [...Array.from({length:15},(_,i)=>option(String(i), 400+i)), option("last", 190, "Other Air")];
  assert.equal(filterFlightResults(flights,defaultFlightFilters)[0].id,"last");
  assert.deepEqual(filterFlightResults(flights,{...defaultFlightFilters,airline:"Other Air",arrival:"morning",maxPrice:"200"}).map(f=>f.id),["last"]);
  assert.equal(filterFlightResults(flights,{...defaultFlightFilters,departure:"evening"}).length,0);
});

test("stops apply per journey while baggage and known flexibility apply to the whole fare", () => {
  const flight = option("connecting",300,"Test Air",{
    stops: 2, refundable:true, changeable:false,
    slices: Array.from({length:2},()=>({duration:"PT8H",segments:[
      {origin:"JFK",destination:"ORD",departingAt:"2027-02-04T08:30:00",arrivingAt:"2027-02-04T10:00:00",airline:"Test Air",carryOnBags:1,checkedBags:1},
      {origin:"ORD",destination:"LAX",departingAt:"2027-02-04T12:00:00",arrivingAt:"2027-02-04T15:00:00",airline:"Test Air",carryOnBags:1,checkedBags:0},
    ]})),
  });
  assert.equal(flightMetrics(flight).maxStops,1);
  assert.equal(flightMetrics(flight).layover,120);
  assert.equal(flightMetrics(flight).duration,960);
  assert.equal(filterFlightResults([flight],{...defaultFlightFilters,stops:"1",maxLayover:"120",flexibility:"refundable",baggage:"carry-on"}).length,1);
  assert.equal(filterFlightResults([flight],{...defaultFlightFilters,baggage:"checked"}).length,0);
  assert.equal(filterFlightResults([flight],{...defaultFlightFilters,flexibility:"changeable"}).length,0);
  assert.equal(filterFlightResults([flight],{...defaultFlightFilters,maxLayover:"90"}).length,0);
});

test("duration sort handles overnight journeys and unknown baggage is excluded", () => {
  const fast=option("fast",450,"Test Air",{slices:[{duration:"PT4H",segments:[]} ]});
  const long=option("long",180,"Test Air",{slices:[{duration:"P1DT1H",segments:[]} ]});
  assert.equal(filterFlightResults([long,fast],{...defaultFlightFilters,sort:"fastest"})[0].id,"fast");
  assert.equal(filterFlightResults([long,fast],{...defaultFlightFilters,baggage:"checked"}).length,0);
});
