import { AppShell } from "@/components/AppShell";
import { loadMapModel } from "@/lib/map-data";

export default async function Home() {
  return <AppShell model={await loadMapModel()} />;
}
