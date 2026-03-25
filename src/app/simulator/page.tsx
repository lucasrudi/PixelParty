import { SimulatorClient } from "@/components/SimulatorClient";
import { listGames } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const games = await listGames();
  return <SimulatorClient games={games} />;
}
