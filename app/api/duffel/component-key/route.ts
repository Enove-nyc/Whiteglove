import { NextResponse, type NextRequest } from "next/server";
import { duffelRefusal } from "@/lib/duffel-guard";

export async function POST(request: NextRequest) {
  // ADMIN ONLY. Taking the buttons off the public page is not the same as
  // closing the door: anybody who saw the site last month can still post here,
  // and this endpoint reaches the White Glove Duffel account. See
  // lib/duffel-guard.ts.
  const refused = duffelRefusal(request);
  if (refused) return NextResponse.json({ message: refused.error }, { status: refused.status });


  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ message: "The White Glove Duffel account is not connected yet." }, { status: 503 });
  }

  const response = await fetch("https://api.duffel.com/identity/component_client_keys", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Duffel-Version": "v2",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Duffel did not allow secure card entry for this account yet. Please confirm that Duffel Cards / customer card payments is enabled." },
      { status: 502 },
    );
  }

  const result = await response.json();
  const clientKey = result.data?.component_client_key;
  if (!clientKey) {
    return NextResponse.json({ message: "Duffel did not return a secure card-form key." }, { status: 502 });
  }

  return NextResponse.json({ clientKey });
}
