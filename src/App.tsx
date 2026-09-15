import { Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { InventoryPage } from "./pages/InventoryPage";
import { VehicleDetailPage } from "./pages/VehicleDetailPage";

/**
 * App shell: a persistent header over two routes.
 *
 * Both routes read from the same `BidsProvider` mounted in `main.tsx`, which
 * is what keeps a bid placed on the detail page visible back in the grid.
 */
export default function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<InventoryPage />} />
        <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="*" element={<InventoryPage />} />
      </Routes>
    </>
  );
}
