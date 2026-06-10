import { getSession, fetchDeliveriesForCourier } from "@/app/lib/dashboard-actions";
import { redirect } from "next/navigation";
import KurirDashboardClient from "./kurir-client";

export default async function KurirDashboardPage() {
  const userData = await getSession();
  if (!userData) {
    redirect("/login");
  }
  if (userData.role !== "kurir") {
    redirect("/login?clear=1");
  }

  const list = await fetchDeliveriesForCourier(userData.id);
  const mappedPackages = list.map((p: any) => ({
    id: p.id,
    customer: p.customer,
    address: p.address,
    phone: p.phone,
    status: p.status,
    type: p.ship_service,
    codAmount: p.status === "Selesai" && p.notes.includes("COD") ? p.price : 0,
    notes: p.notes,
    weight: `${p.weight} kg`,
    date: p.created_at ? new Date(p.created_at).toISOString().split("T")[0] : "",
    price: p.price,
    item_name: p.item_name,
    vehicle_name: p.vehicle_name,
    vehicle_plate: p.vehicle_plate
  }));

  return (
    <KurirDashboardClient 
      sessionUser={userData} 
      initialPackages={mappedPackages} 
    />
  );
}
