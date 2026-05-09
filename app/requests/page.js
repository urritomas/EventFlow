import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequestsPanel } from "@/components/operations/panels/RequestsPanel";

export const metadata = {
  title: "Requests",
};

export default function RequestsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="app" />
      <main className="flex-1">
        <RequestsPanel />
      </main>
      <Footer />
    </div>
  );
}

