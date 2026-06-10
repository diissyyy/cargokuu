import { redirect } from "next/navigation";
import { 
  getSession, 
  fetchUserData, 
  fetchUserAddresses, 
  fetchDeliveriesForCustomer 
} from "@/app/lib/dashboard-actions";
import PelangganDashboardClient from "./dashboard-client";

export default async function PelangganDashboardPage() {
  const userData = await getSession();
  if (!userData) {
    redirect("/login");
  }
  if (userData.role !== "pelanggan") {
    redirect("/login?clear=1");
  }

  const profile = await fetchUserData(userData.id);
  if (!profile) {
    redirect("/login?clear=1");
  }

  const addrList = await fetchUserAddresses(userData.id);
  const initialAddresses = addrList.map((a: any) => ({
    id: a.id,
    label: a.label,
    contact: a.contact,
    phone: a.phone,
    details: a.details
  }));

  const defaultAddr = initialAddresses.find((a: any) => a.label.includes("Utama"))?.details || profile.phone || "";

  const list = await fetchDeliveriesForCustomer(profile.name) || [];
  const initialPackages = list.map((p: any) => ({
    id: p.id,
    customer: p.customer,
    address: p.address,
    phone: p.phone,
    status: p.status,
    type: p.ship_service,
    codAmount: 0,
    notes: p.notes,
    weight: `${p.weight} kg`,
    sender: p.sender,
    senderAddress: p.sender_address,
    senderPhone: p.sender_phone,
    price: p.price,
    itemName: p.item_name
  }));

  return (
    <PelangganDashboardClient 
      sessionUser={userData}
      profile={{
        name: profile.name,
        email: profile.email,
        phone: profile.phone || ""
      }}
      initialAddresses={initialAddresses}
      defaultAddr={defaultAddr}
      initialPackages={initialPackages}
    />
  );
}