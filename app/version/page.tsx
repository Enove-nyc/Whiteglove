import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Build version — White Glove Itineraries",
  robots: { index: false, follow: false },
};

// A plain page that says exactly which code the live site is running. When a
// change looks missing, open /version: if the commit here isn't the newest one
// on main, the site is serving an older deployment and the code is fine.
export default function VersionPage() {
  // Vercel and Railway name these differently; whichever platform built the
  // site, this page answers the same question.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || "unknown (not a platform build)";
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || process.env.RAILWAY_GIT_COMMIT_MESSAGE || "—";
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.RAILWAY_GIT_BRANCH || "—";
  const env = process.env.VERCEL_ENV || process.env.RAILWAY_ENVIRONMENT_NAME || "local";
  const builtAt = process.env.BUILD_TIME || "—";

  // Features that should be present in this build — a quick visual checklist.
  const shipped = [
    ["Driving time between stops", "e16be19"],
    ["Hotel / airport transfers counted", "a500d2f"],
    ["Share a trip + add people", "33b5d7f"],
    ["Stop reordering + Plan my route", "f6a7a66"],
    ["Exact DMS coordinates on kevarim", "83c4194"],
    ["Edit a stop after adding it", "322a004"],
    ["Real road driving times", "322a004"],
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 font-mono text-sm text-stone-800">
      <h1 className="font-sans text-2xl font-bold text-[#1e2a44]">Build version</h1>
      <p className="mt-2 font-sans text-stone-600">What code this site is currently serving.</p>

      <dl className="mt-8 space-y-3">
        <div><dt className="text-xs uppercase text-stone-500">Commit</dt><dd className="break-all text-base font-bold">{sha}</dd></div>
        <div><dt className="text-xs uppercase text-stone-500">Short</dt><dd className="text-base font-bold">{sha.slice(0, 7)}</dd></div>
        <div><dt className="text-xs uppercase text-stone-500">Message</dt><dd>{message}</dd></div>
        <div><dt className="text-xs uppercase text-stone-500">Branch</dt><dd>{branch}</dd></div>
        <div><dt className="text-xs uppercase text-stone-500">Environment</dt><dd>{env}</dd></div>
        <div><dt className="text-xs uppercase text-stone-500">Built at</dt><dd>{builtAt}</dd></div>
      </dl>

      <h2 className="mt-10 font-sans text-lg font-bold text-[#1e2a44]">Should be in this build</h2>
      <ul className="mt-3 space-y-1">
        {shipped.map(([label, commit]) => (
          <li key={label}>
            <span className="text-stone-500">{commit}</span> — {label}
          </li>
        ))}
      </ul>
      <p className="mt-6 font-sans text-stone-600">
        If the commit above is older than the newest commit on <strong>main</strong>, the site is serving a previous
        deployment — promote the newest one in Vercel and these features will appear.
      </p>
    </main>
  );
}
