import { HomeClient } from "@/components/HomeClient";
import { isSimulatorEnabled } from "@/lib/storage-config";

export default function Home() {
  return <HomeClient showSimulatorLink={isSimulatorEnabled()} />;
}
