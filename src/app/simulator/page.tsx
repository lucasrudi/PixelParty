import Link from "next/link";
import { SimulatorClient } from "@/components/SimulatorClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { listGames } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  if (!isSimulatorEnabled()) {
    return (
      <main
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "4rem 1.5rem",
          display: "grid",
          gap: "1rem",
        }}
      >
        <p style={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Local Simulator
        </p>
        <h1 style={{ margin: 0 }}>Simulator unavailable on this deployment.</h1>
        <p style={{ margin: 0 }}>
          The simulator is intended for local rehearsal and is disabled in production.
        </p>
        <div>
          <Link href="/">Return to the main app</Link>
        </div>
      </main>
    );
  }

  const games = await listGames();
  return <SimulatorClient games={games} />;
}
