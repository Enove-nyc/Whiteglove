import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST as search } from "@/app/api/flights/search/route";
import { POST as book } from "@/app/api/flights/book/route";
import { accessToken } from "@/lib/secure-access";

test("search and checkout propagate three distinct travelers and reject a mismatched count", async t => {
  const original = process.env.DUFFEL_ACCESS_TOKEN;
  process.env.DUFFEL_ACCESS_TOKEN = "duffel_test_fixture";
  t.after(() => { if (original === undefined) delete process.env.DUFFEL_ACCESS_TOKEN; else process.env.DUFFEL_ACCESS_TOKEN = original; });
  const origin = "https://www.whitegloveitineraries.com";
  const request = (path: string, data: unknown) => new NextRequest(origin + path, {
    method:"POST", headers: {origin, host:"www.whitegloveitineraries.com", cookie:`white_glove_admin=${accessToken("admin")}`, "content-type":"application/json"},
    body: JSON.stringify(data),
  });
  const passengerIds = ["pas_one","pas_two","pas_three"];
  let requested: unknown[] = [], ordered: unknown[] = [];
  t.mock.method(globalThis,"fetch", async (url: string, init?: RequestInit) => {
    if (url.endsWith("offer_requests")) {
      requested = JSON.parse(String(init?.body)).data.passengers;
      return Response.json({data:{offers:Array.from({length:15},(_,i)=>({id:`offer_${i}`,total_amount:String(400-i),total_currency:"USD",slices:[]}))}});
    }
    if (url.includes("/air/offers/")) return Response.json({data:{id:"off_fixture",passengers:passengerIds.map(id=>({id})),total_amount:"900",total_currency:"USD"}});
    if (url.endsWith("/air/orders")) {
      const data = JSON.parse(String(init?.body)).data;
      ordered = data.passengers;
      assert.equal(data.payments[0].amount,"900");
      return Response.json({data:{id:"ord_fixture"}});
    }
    throw Error("Unexpected test request");
  });
  const date = new Date(Date.now()+86400000*45).toISOString().slice(0,10);
  const flight = await search(request("/api/flights/search",{origin:"JFK",destination:"LAX",departureDate:date,passengerCount:3}));
  assert.equal(flight.status,200);
  assert.equal(requested.length,3);
  const {flights} = await flight.json();
  assert.equal(flights.length,15);
  assert.equal(flights[0].id,"offer_14");
  assert.equal(flights[0].passengerCount,3);
  const travelers = passengerIds.map((_,i)=>({firstName:`Traveler${i}`,lastName:"Fixture",email:"test@example.com",bornOn:"1980-01-01",title:"mr",gender:"m",phone:"+15555550100"}));
  const invalid = await book(request("/api/flights/book",{offerId:"off_fixture",threeDSecureSessionId:"test",travelers:travelers.slice(0,2)}));
  assert.equal(invalid.status,400);
  assert.equal(ordered.length,0);
  const valid = await book(request("/api/flights/book",{offerId:"off_fixture",threeDSecureSessionId:"test",travelers}));
  assert.equal(valid.status,200);
  assert.deepEqual(ordered.map(p=>(p as {id:string}).id),passengerIds);
});
