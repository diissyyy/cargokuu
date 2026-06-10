"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { logout } from "@/app/auth/actions";
import { 
  fetchDeliveriesForCourier, 
  updateDeliveryStatus, 
  updateDelivery, 
  deleteDelivery, 
  searchDeliveries
} from "@/app/lib/dashboard-actions";

export default function KurirDashboardClient({
  sessionUser,
  initialPackages
}: {
  sessionUser: any;
  initialPackages: any[];
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "paket-saya" | "riwayat" | "profil">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [packages, setPackages] = useState<any[]>(initialPackages);
  const [courierStatus, setCourierStatus] = useState<"Ready" | "Sibuk" | "Offline">("Ready");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [courierName, setCourierName] = useState(sessionUser.name || "Kurir Satu");
  const [courierNickName, setCourierNickName] = useState((sessionUser.name || "Kurir Satu").split(" ")[0]);
  const [courierEmail, setCourierEmail] = useState(sessionUser.email || "kurir@kurir.com");
  const [courierPhone, setCourierPhone] = useState("081234567890");
  const [courierAddress, setCourierAddress] = useState("Babarsari, Yogyakarta");

  const [tempNickName, setTempNickName] = useState(courierNickName);
  const [tempEmail, setTempEmail] = useState(courierEmail);
  const [tempPhone, setTempPhone] = useState(courierPhone);
  const [tempAddress, setTempAddress] = useState(courierAddress);

  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"success" | "fail" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [failReason, setFailReason] = useState("Penerima tidak di rumah");
  
  const [historySearch, setHistorySearch] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"Semua" | "Selesai" | "Gagal">("Semua");
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);

  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editCustAddress, setEditCustAddress] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editShipService, setEditShipService] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editVehName, setEditVehName] = useState("");
  const [editVehPlate, setEditVehPlate] = useState("");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const runSearch = async () => {
      if (sessionUser) {
        const list = await searchDeliveries(historySearch, sessionUser.id);
        setPackages(list.map((p: any) => ({
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
        })));
      }
    };
    runSearch();
  }, [historySearch, sessionUser]);

  const triggerToast = (msg: string, type: "success" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleJemput = async (id: string) => {
    if (!sessionUser) return;
    const res = await updateDeliveryStatus(id, "Sedang Dikirim", "Kurir telah menjemput paket", sessionUser.id);
    if (res.success) {
      const list = await fetchDeliveriesForCourier(sessionUser.id);
      setPackages(list.map((p: any) => ({
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
      })));
      triggerToast(`Paket ${id} berhasil dijemput! Silakan cek di menu "Paket Saya".`, "success");
    } else {
      triggerToast(res.error || "Gagal menjemput paket", "info");
    }
  };

  const handleOpenAction = (id: string, type: "success" | "fail") => {
    setDeliveringId(id);
    setActionType(type);
    setActionNote("");
  };

  const handleCloseAction = () => {
    setDeliveringId(null);
    setActionType(null);
    setDeliveryPhoto(null);
  };

  const handleSubmitAction = async () => {
    if (!deliveringId || !actionType || !sessionUser) return;

    if (actionType === "success" && !deliveryPhoto) {
      triggerToast("Foto bukti pengiriman wajib dilampirkan!", "info");
      return;
    }

    const finalNote = actionType === "success" 
      ? `${actionNote || "Diterima dengan baik oleh penerima"} (Foto bukti terlampir)`
      : `${failReason}${actionNote ? ` - ${actionNote}` : ""}`;

    const finalStatus = actionType === "success" ? "Selesai" : "Gagal";

    const res = await updateDeliveryStatus(deliveringId, finalStatus, finalNote, sessionUser.id);
    if (res.success) {
      const list = await fetchDeliveriesForCourier(sessionUser.id);
      setPackages(list.map((p: any) => ({
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
      })));
      triggerToast(
        actionType === "success" 
          ? `Paket ${deliveringId} sukses dikirimkan!` 
          : `Paket ${deliveringId} ditandai Gagal dikirim.`,
        actionType === "success" ? "success" : "info"
      );
    } else {
      triggerToast(res.error || "Gagal memperbarui paket", "info");
    }

    handleCloseAction();
  };

  const openEditPackageModal = (pkg: any) => {
    setEditingPackage(pkg);
    setEditCustName(pkg.customer);
    setEditCustPhone(pkg.phone);
    setEditCustAddress(pkg.address);
    setEditItemName(pkg.item_name || "Pakaian");
    setEditWeight(pkg.weight ? pkg.weight.replace(" kg", "") : "1.0");
    setEditShipService(pkg.type || "Cargo Reguler");
    setEditPrice(pkg.price ? pkg.price.toString() : "10000");
    setEditStatus(pkg.status);
    setEditNotes(pkg.notes || "");
    setEditVehName(pkg.vehicle_name || "Mobil L300");
    setEditVehPlate(pkg.vehicle_plate || "AB 9876 CD");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCourierNickName(tempNickName);
    setCourierEmail(tempEmail);
    setCourierPhone(tempPhone);
    setCourierAddress(tempAddress);
    setIsEditing(false);
    triggerToast("Profil Anda berhasil diperbarui!", "success");
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const totalTasksToday = packages.filter(p => p.status === "Tersedia" || p.status === "Sedang Dikirim").length;
  const totalFailedToday = packages.filter(p => p.status === "Gagal").length;
  const codCompletedSum = packages
    .filter(p => p.status === "Selesai" && p.codAmount > 0)
    .reduce((sum, p) => sum + p.codAmount, 0);

  const historyPackages = packages.filter(p => {
    const isHistory = p.status === "Selesai" || p.status === "Gagal";
    const matchesSearch = p.id.toLowerCase().includes(historySearch.toLowerCase()) ||
                          p.customer.toLowerCase().includes(historySearch.toLowerCase()) ||
                          p.address.toLowerCase().includes(historySearch.toLowerCase());
    const matchesDate = !historyDate || p.date === historyDate;
    const matchesStatus = historyStatus === "Semua" || p.status === historyStatus;
    
    return isHistory && matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="flex h-screen bg-[#F4F7F5] font-sans text-gray-800 overflow-hidden relative">
      
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 animate-slide-in ${
          toastType === "success" 
            ? "bg-white text-green-800 border-green-100" 
            : "bg-white text-orange-800 border-orange-100"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
            toastType === "success" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          }`}>
            {toastType === "success" ? "✓" : "ℹ"}
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight">Notification</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[90] transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[100] shadow-2xl transition-transform duration-300 ease-out transform ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } flex flex-col justify-between p-6 lg:hidden`}>
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#EBF5EA] rounded-xl flex items-center justify-center text-green-700 shadow-inner flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-lg text-gray-900 tracking-tight block">CargoKu</span>
                <span className="text-[10px] font-extrabold text-green-600 tracking-wider uppercase block mt-[-4px]">LITE</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-400 hover:text-gray-650 p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Courier Profile Info inside Drawer */}
          <div className="bg-[#FAF7ED] border border-orange-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                {courierNickName.charAt(0)}
              </div>
              <div className="text-left">
                <span className="text-[13px] font-extrabold text-gray-800 block leading-tight">{courierNickName}</span>
                <span className="text-[10px] font-bold text-gray-400 block mt-0.5">Freelance Courier</span>
              </div>
            </div>

            {/* Courier Status Toggle inside Drawer */}
            <div className="flex justify-between items-center bg-white border border-gray-150 p-2 rounded-xl mt-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Status: {courierStatus}</span>
              <button
                onClick={() => {
                  if (courierStatus === "Ready") setCourierStatus("Sibuk");
                  else if (courierStatus === "Sibuk") setCourierStatus("Offline");
                  else setCourierStatus("Ready");
                }}
                className="text-[10px] font-extrabold text-green-700 hover:underline px-2 py-1"
              >
                Ubah
              </button>
            </div>
          </div>

          {/* Navigation Links inside Drawer */}
          <nav className="space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "paket-saya", label: "Paket Saya", icon: "🚚", count: packages.filter(p => p.status === "Sedang Dikirim").length },
              { id: "riwayat", label: "Riwayat Pengantaran", icon: "🕒" },
              { id: "profil", label: "Profil Saya", icon: "👤" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === item.id
                    ? "bg-[#F0F7F1] text-[#488746] shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Logout at bottom of Drawer */}
        <button
          onClick={() => {
            setIsMobileMenuOpen(false);
            handleLogout();
          }}
          disabled={isPending}
          className="w-full bg-red-50 hover:bg-red-100 text-red-650 font-bold py-3.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-red-100"
        >
          <span>🚪</span>
          <span>{isPending ? "Keluar..." : "Keluar"}</span>
        </button>
      </div>

      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-150 flex-shrink-0 justify-between p-6 transition-all duration-300 relative z-40 ${
        isSidebarCollapsed ? "w-[90px]" : "w-[210px]"
      }`}>
        <div>
          
          <div className="flex items-center justify-between py-3 px-1 border-b border-gray-100 mb-8 gap-2">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="w-10 h-10 bg-[#EBF5EA] rounded-xl flex items-center justify-center text-green-700 shadow-inner flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-extrabold text-lg text-gray-900 tracking-tight block">CargoKu</span>
                  <span className="text-[10px] font-extrabold text-green-600 tracking-wider uppercase block mt-[-4px]">LITE</span>
                </div>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="w-10 h-10 bg-[#EBF5EA] rounded-xl flex items-center justify-center text-green-700 shadow-inner flex-shrink-0 mx-auto animate-fade-in">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            )}
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 transition-all font-bold absolute top-[42px] -right-3.5 shadow-md z-50 cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? (
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          <nav className="space-y-2">
            {[
              { 
                id: "dashboard", 
                label: "Dashboard",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                )
              },
              { 
                id: "paket-saya", 
                label: "Paket Saya", 
                count: packages.filter(p => p.status === "Sedang Dikirim").length,
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18L18 4H6L3 8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 13h4" />
                  </svg>
                )
              },
              { 
                id: "riwayat", 
                label: "Riwayat",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8 8 0 016.3 3.1M18.5 4v3.5h-3.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 01-8 8 8 8 0 01-6.3-3.1M5.5 20v-3.5h3.5" />
                  </svg>
                )
              },
              { 
                id: "profil", 
                label: "Profil",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20a6.5 6.5 0 0113 0" />
                  </svg>
                )
              },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center rounded-2xl text-[14px] font-bold transition-all relative ${
                  isSidebarCollapsed ? "justify-center px-2 py-3.5" : "justify-between px-4 py-3.5"
                } ${
                  activeTab === item.id
                    ? "bg-[#F0F7F1] text-[#488746] shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {isSidebarCollapsed ? (
                  <div className="flex-shrink-0 animate-fade-in">{item.icon}</div>
                ) : (
                  <span className="animate-fade-in">{item.label}</span>
                )}
                
                {!isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
                {isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <div className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className={`flex items-center text-red-650 hover:bg-red-50 rounded-2xl text-[14px] font-bold transition-all border border-transparent active:scale-[0.98] ${
            isSidebarCollapsed ? "justify-center px-2 py-3.5" : "px-4 py-3.5 w-full"
          }`}
        >
          {isSidebarCollapsed ? (
            <svg className="w-6 h-6 text-red-655" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          ) : (
            <span className="animate-fade-in">{isPending ? "Logging out..." : "Log Out"}</span>
          )}
        </button>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden relative pb-16 lg:pb-0">
        
        <header className="flex items-center justify-between px-6 lg:px-10 py-4 bg-white border-b border-gray-150 flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden flex-col gap-1 py-2 px-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 focus:outline-none transition-all duration-200"
              aria-label="Toggle Menu"
            >
              <span className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-[6px]" : ""}`}></span>
              <span className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`}></span>
              <span className={`w-5 h-0.5 bg-gray-600 rounded transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`}></span>
            </button>

            <div>
              <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight leading-tight">
                Halo, {courierNickName}!
              </h1>
              <p className="text-[12px] font-bold text-gray-400 mt-0.5">Semoga harimu menyenangkan di jalan.</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                {courierNickName.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[13px] font-extrabold text-gray-800 block leading-tight">{courierNickName}</span>
                <span className={`text-[10px] font-bold block mt-0.5 ${
                  courierStatus === "Ready" ? "text-green-600" : courierStatus === "Sibuk" ? "text-amber-600" : "text-gray-500"
                }`}>
                  ● {courierStatus}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h2>
                  <p className="text-[13px] text-gray-500 font-medium">Status operasional dan tugas pengiriman hari ini.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-[#EBF5EA] border border-green-100 p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[120px] transition-all hover:shadow-md">
                    <span className="text-gray-500 font-bold text-[12px] uppercase tracking-wider block">Tugas Hari Ini</span>
                    <span className="text-[28px] font-extrabold text-green-800 leading-tight block mt-2">
                      {totalTasksToday} Paket
                    </span>
                  </div>

                  <div className="bg-white border border-gray-150 p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[120px] transition-all hover:shadow-md">
                    <span className="text-gray-400 font-bold text-[12px] uppercase tracking-wider block">Gagal Dikirim</span>
                    <span className="text-[28px] font-extrabold text-orange-600 leading-tight block mt-2">
                      {totalFailedToday} Paket
                    </span>
                  </div>

                  <div className="bg-white border border-gray-150 p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[120px] transition-all hover:shadow-md">
                    <span className="text-gray-400 font-bold text-[12px] uppercase tracking-wider block">Selesai COD</span>
                    <span className="text-[20px] font-extrabold text-gray-800 leading-tight block mt-2 truncate">
                      Rp {codCompletedSum.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="bg-green-700 text-white p-6 rounded-[1.5rem] shadow-lg flex flex-col justify-between h-[120px] xl:h-auto relative overflow-hidden">
                  <div className="z-10">
                    <span className="text-green-200 font-bold text-[11px] uppercase tracking-wider block">Estimasi Payout:</span>
                    <span className="text-[24px] font-extrabold block mt-1 tracking-tight text-white">Rp 1.200.000</span>
                  </div>
                  <div className="z-10 border-t border-green-600 pt-2 mt-2">
                    <span className="text-green-200 text-[11px] font-bold block">Tambahan Hari Ini: Rp 300.000</span>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] text-green-600 text-8xl font-bold opacity-30 pointer-events-none select-none">
                    💵
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-gray-900 text-lg">Daftar Jemput Tugas</h3>
                    <span className="text-xs bg-gray-150 text-gray-600 px-3 py-1 rounded-full font-bold">
                      {packages.filter(p => p.status === "Tersedia").length} Paket Tersedia
                    </span>
                  </div>

                  {packages.filter(p => p.status === "Tersedia").length === 0 ? (
                    <div className="bg-white border border-gray-150 rounded-[1.5rem] p-10 text-center text-gray-400">
                      <span className="text-3xl block mb-2">🎉</span>
                      <p className="font-bold text-sm">Semua tugas berhasil dijemput / diproses!</p>
                      <p className="text-xs text-gray-300 mt-1">Cek tab "Paket Saya" untuk mengantarkannya.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {packages
                        .filter(p => p.status === "Tersedia")
                        .map((pkg, idx) => (
                          <div 
                            key={pkg.id} 
                            className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md hover:border-green-200 group"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-green-50 text-[#65A657] flex items-center justify-center font-bold text-lg mt-0.5">
                                📍
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-gray-900 leading-tight">
                                  Tugas {idx + 1}: {pkg.type}
                                </h4>
                                <p className="text-xs font-bold text-gray-500 mt-1">{pkg.customer}</p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{pkg.address}</p>
                                {pkg.codAmount > 0 && (
                                  <span className="inline-block bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-2">
                                    COD: Rp {pkg.codAmount.toLocaleString("id-ID")}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditPackageModal(pkg)}
                                className="bg-gray-150 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 active:scale-95"
                                title="Edit Paket"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleJemput(pkg.id)}
                                className="bg-[#65A657] hover:bg-[#58964b] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 flex-shrink-0"
                              >
                                Jemput
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 flex flex-col gap-4">
                  <h3 className="font-extrabold text-gray-900 text-lg">Peta Navigasi</h3>
                  
                  <div className="bg-white border border-gray-150 rounded-[2rem] p-4 shadow-sm flex flex-col justify-between h-[360px] relative overflow-hidden">
                    <div className="absolute inset-0 z-0 bg-[#E3EFE0] opacity-80">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="50" x2="400" y2="120" stroke="#FFFFFF" strokeWidth="16" />
                        <line x1="120" y1="0" x2="160" y2="400" stroke="#FFFFFF" strokeWidth="18" />
                        <line x1="300" y1="0" x2="200" y2="400" stroke="#FFFFFF" strokeWidth="20" strokeDasharray="10, 5" />
                        <line x1="0" y1="280" x2="400" y2="280" stroke="#FFFFFF" strokeWidth="22" />
                        <path 
                          d="M 140,320 Q 150,220 250,280 T 320,180" 
                          fill="none" 
                          stroke="#488746" 
                          strokeWidth="6" 
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M 140,320 Q 150,220 250,280 T 320,180" 
                          fill="none" 
                          stroke="#65A657" 
                          strokeWidth="12" 
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="opacity-30"
                        />
                        <circle cx="140" cy="320" r="10" fill="#2563EB" />
                        <circle cx="140" cy="320" r="18" fill="#2563EB" className="animate-ping opacity-25" />
                        <g transform="translate(160, 220)">
                          <circle cx="0" cy="0" r="8" fill="#EAB308" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                        <g transform="translate(250, 280)">
                          <circle cx="0" cy="0" r="8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                        <g transform="translate(320, 180)">
                          <circle cx="0" cy="0" r="8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                      </svg>
                    </div>

                    <div className="z-10 flex items-start justify-between pointer-events-none select-none">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm">
                        📍 KM 4.2 Sleman, YK
                      </span>
                      <span className="bg-green-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm">
                        GPS Active
                      </span>
                    </div>

                    <div className="z-10 flex justify-end">
                      <button
                        onClick={() => {
                          if (courierStatus === "Ready") setCourierStatus("Sibuk");
                          else if (courierStatus === "Sibuk") setCourierStatus("Offline");
                          else setCourierStatus("Ready");
                        }}
                        className={`px-5 py-3 rounded-2xl text-xs font-extrabold shadow-md border active:scale-95 transition-all flex items-center gap-2 ${
                          courierStatus === "Ready"
                            ? "bg-[#EBF5EA] text-[#488746] border-green-200 hover:bg-[#dbeed8]"
                            : courierStatus === "Sibuk"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        <span className="text-xs">
                          {courierStatus === "Ready" ? "🟢" : courierStatus === "Sibuk" ? "🟡" : "⚫"}
                        </span>
                        <span>Status: {courierStatus}</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "paket-saya" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Paket Saya</h2>
                <p className="text-[13px] text-gray-500 font-medium">
                  Daftar paket aktif yang sedang Anda antar sekarang.
                </p>
              </div>

              {packages.filter(p => p.status === "Sedang Dikirim").length === 0 ? (
                <div className="bg-white border border-gray-150 rounded-[2rem] p-16 text-center text-gray-400 shadow-sm max-w-[600px] mx-auto mt-8">
                  <span className="text-5xl block mb-4">🚚</span>
                  <p className="font-extrabold text-base text-gray-700">Tidak ada paket aktif</p>
                  <p className="text-xs text-gray-400 mt-2 max-w-[340px] mx-auto leading-relaxed">
                    Kembali ke dashboard lalu pilih dan klik <strong>Jemput</strong> pada tugas hari ini untuk mulai mengantar.
                  </p>
                  <button 
                    onClick={() => setActiveTab("dashboard")} 
                    className="mt-6 bg-[#65A657] hover:bg-[#58964b] text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Buka Dashboard
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {packages
                    .filter(p => p.status === "Sedang Dikirim")
                    .map(pkg => (
                      <div 
                        key={pkg.id} 
                        className="bg-white border border-gray-150 hover:border-green-300 rounded-[1.75rem] p-6 shadow-sm flex flex-col justify-between relative transition-all group hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
                            <div>
                              <span className="text-[11px] font-bold text-gray-400 block font-bold">NOMOR RESI</span>
                              <span className="font-extrabold text-sm text-gray-800 tracking-tight">{pkg.id}</span>
                            </div>
                            <span className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-[11px] font-extrabold">
                              🚚 Sedang Jalan
                            </span>
                          </div>

                          <div className="space-y-3.5 mb-6 text-[13px] text-gray-600 font-medium">
                            <div className="flex items-start gap-3">
                              <span className="text-base flex-shrink-0">👤</span>
                              <div>
                                <p className="font-extrabold text-gray-900 leading-tight">{pkg.customer}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{pkg.phone}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <span className="text-base flex-shrink-0">📍</span>
                              <p className="text-gray-700 leading-relaxed">{pkg.address}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-base flex-shrink-0">⚖️</span>
                              <p className="font-bold">Berat: <span className="text-gray-900">{pkg.weight}</span></p>
                            </div>

                            {pkg.codAmount > 0 ? (
                              <div className="flex items-center gap-3">
                                <span className="text-base flex-shrink-0">💵</span>
                                <div className="bg-orange-50 text-orange-800 border border-orange-100 rounded-xl px-3 py-1.5 font-bold flex items-center justify-between w-full">
                                  <span>Tagihan COD:</span>
                                  <span className="font-extrabold">Rp {pkg.codAmount.toLocaleString("id-ID")}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-base flex-shrink-0">💳</span>
                                <span className="text-green-700 font-bold bg-green-50/50 border border-green-100 rounded-lg px-2.5 py-1 text-[11px]">
                                  Lunas (Non-COD)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {deliveringId === pkg.id ? (
                          <div className="bg-[#FAF7ED] border border-orange-155 rounded-2xl p-4 space-y-4 animate-fade-in">
                            <h4 className="font-extrabold text-xs text-gray-900">
                              Konfirmasi {actionType === "success" ? "Pengantaran Sukses" : "Pengantaran Gagal"}
                            </h4>

                            {actionType === "fail" ? (
                              <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Alasan Kegagalan</label>
                                <select 
                                  value={failReason}
                                  onChange={e => setFailReason(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none bg-white font-bold"
                                >
                                  <option value="Penerima tidak di rumah">Penerima tidak di rumah</option>
                                  <option value="Alamat salah/tidak ditemukan">Alamat salah/tidak ditemukan</option>
                                  <option value="Penerima menolak COD">Penerima menolak COD</option>
                                  <option value="Nomor HP tidak dapat dihubungi">Nomor HP tidak dapat dihubungi</option>
                                </select>
                              </div>
                            ) : null}

                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">
                                Catatan {actionType === "success" ? "Tambahan (Opsional)" : "Detail Kegagalan"}
                              </label>
                              <input 
                                type="text"
                                placeholder={actionType === "success" ? "Contoh: Diterima oleh satpam" : "Detail keterangan situasi..."}
                                value={actionNote}
                                onChange={e => setActionNote(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-medium"
                              />
                            </div>

                            {actionType === "success" && (
                              <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Foto Bukti Pengiriman *</label>
                                {deliveryPhoto ? (
                                  <div className="relative rounded-xl overflow-hidden border border-gray-200 mt-1">
                                    <img 
                                      src={deliveryPhoto} 
                                      alt="Delivery proof preview" 
                                      className="w-full h-[120px] object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setDeliveryPhoto(null)}
                                      className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-650 text-white rounded-full p-1 text-[9px] font-bold shadow-md w-5 h-5 flex items-center justify-center cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeliveryPhoto("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80");
                                      triggerToast("Foto bukti berhasil diambil!", "success");
                                    }}
                                    className="w-full py-4 border border-dashed border-gray-300 hover:border-[#65A657] rounded-xl text-center text-gray-500 font-bold hover:bg-green-50/20 transition-all text-[11px] flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    📷 Ambil Foto Bukti Pengantaran
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2.5">
                              <button
                                onClick={handleSubmitAction}
                                className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={handleCloseAction}
                                className="flex-1 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold py-2.5 rounded-xl border border-gray-200 transition-all"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => openEditPackageModal(pkg)}
                              className="bg-gray-150 hover:bg-gray-200 text-gray-700 px-3.5 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                              title="Edit/Hapus Paket"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                setChatMessages([
                                  { sender: "customer", text: `Halo pak, apakah paket saya dengan nomor resi ${pkg.id} sedang dalam perjalanan?`, time: "Baru saja" }
                                ]);
                                setIsChatOpen(true);
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                              title="Chat Pelanggan"
                            >
                              💬
                            </button>
                            <button
                              onClick={() => handleOpenAction(pkg.id, "success")}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold py-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                            >
                              ✓ Antar Sukses
                            </button>
                            <button
                              onClick={() => handleOpenAction(pkg.id, "fail")}
                              className="flex-1 bg-white border border-red-200 text-red-655 hover:bg-red-50 text-xs font-bold py-3.5 rounded-xl transition-all active:scale-95"
                            >
                              ✗ Gagal
                            </button>
                          </div>
                        )}

                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "riwayat" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Riwayat Pengantaran</h2>
                  <p className="text-[13px] text-gray-500 font-medium">Catatan lengkap pengiriman yang telah selesai.</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Cari nomor resi, nama..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#65A657] placeholder:text-gray-400 font-medium bg-white"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm items-end">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Status</label>
                  <select
                    value={historyStatus}
                    onChange={e => setHistoryStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 bg-white font-bold outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Selesai">Sukses</option>
                    <option value="Gagal">Gagal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Tanggal</label>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={e => setHistoryDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 bg-white font-bold outline-none cursor-pointer"
                  />
                </div>

                <div>
                  {(historyDate || historyStatus !== "Semua") ? (
                    <button
                      onClick={() => {
                        setHistoryDate("");
                        setHistoryStatus("Semua");
                        triggerToast("Filter riwayat di-reset.", "info");
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl border border-gray-200 transition-all"
                    >
                      Reset Filter
                    </button>
                  ) : (
                    <div className="text-[11px] text-gray-400 font-medium italic pb-3">Menampilkan semua riwayat...</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sukses Antar</span>
                    <span className="text-xl font-extrabold text-gray-800">
                      {packages.filter(p => p.status === "Selesai").length} Paket
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold text-lg">
                    ✗
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Gagal</span>
                    <span className="text-xl font-extrabold text-gray-800">
                      {packages.filter(p => p.status === "Gagal").length} Paket
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold text-lg">
                    Rp
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">COD Terkumpul</span>
                    <span className="text-xl font-extrabold text-gray-800">
                      Rp {codCompletedSum.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {historyPackages.length === 0 ? (
                <div className="bg-white border border-gray-150 rounded-[1.5rem] p-12 text-center text-gray-400">
                  <span className="text-3xl block mb-2">📁</span>
                  <p className="font-bold text-sm">Tidak ada riwayat pengiriman ditemukan.</p>
                  <p className="text-xs text-gray-300 mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyPackages.map(pkg => (
                    <div 
                      key={pkg.id} 
                      className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base flex-shrink-0 mt-0.5 ${
                          pkg.status === "Selesai" 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {pkg.status === "Selesai" ? "✓" : "✗"}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-sm text-gray-900">{pkg.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              pkg.status === "Selesai" 
                                ? "bg-green-50 text-green-700 border border-green-100" 
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {pkg.status === "Selesai" ? "Sukses" : "Gagal"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-bold mt-1.5">{pkg.customer} • {pkg.phone}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{pkg.address}</p>
                          {pkg.notes && (
                            <p className="text-xs italic bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-500 mt-2 font-medium">
                              <strong>Catatan:</strong> "{pkg.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-bold text-gray-400 block font-bold">TANGGAL</span>
                        <span className="text-xs font-extrabold text-gray-800 block mt-0.5">{pkg.date || "2026-06-02"}</span>
                        <div className="flex flex-row sm:flex-col items-center gap-2 mt-2">
                          {pkg.codAmount > 0 && (
                            <span className="inline-block bg-orange-50 text-orange-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              COD: Rp {pkg.codAmount.toLocaleString("id-ID")}
                            </span>
                          )}
                          <button
                            onClick={() => openEditPackageModal(pkg)}
                            className="text-[11px] text-blue-600 hover:underline font-bold"
                          >
                            ✏️ Edit/Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "profil" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Profil Kurir</h2>
                <p className="text-[13px] text-gray-500 font-medium">Kelola informasi pribadi dan data akun Anda.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div className="lg:col-span-5 bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm space-y-6">
                  <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3">Informasi Utama</h3>
                  
                  <div className="bg-gradient-to-br from-green-200 via-green-50 to-[#F0F7F1] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-green-700 flex items-center justify-center text-white text-3xl font-extrabold select-none">
                      {courierName.charAt(0)}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => triggerToast("Pilih foto dari berkas (fitur simulasi)", "info")}
                      className="text-[12px] text-green-700 font-extrabold hover:underline mt-3 block"
                    >
                      Ganti Foto
                    </button>
                  </div>

                  <div className="space-y-4 text-xs text-gray-700 font-medium leading-relaxed">
                    <p>
                      <strong className="text-gray-400 block text-[10px] uppercase tracking-wider mb-0.5">Nama Lengkap</strong>
                      <span className="font-extrabold text-gray-900 text-sm">{courierName}</span>
                    </p>
                    <p>
                      <strong className="text-gray-400 block text-[10px] uppercase tracking-wider mb-0.5">ID Kurir</strong>
                      <span className="font-extrabold text-gray-900 text-sm">C-ANT-123</span>
                    </p>
                    <p>
                      <strong className="text-gray-400 block text-[10px] uppercase tracking-wider mb-0.5">Tanggal Bergabung</strong>
                      <span className="font-extrabold text-gray-900 text-sm">01 Jan 2023</span>
                    </p>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setTempNickName(courierNickName);
                        setTempEmail(courierEmail);
                        setTempPhone(courierPhone);
                        setTempAddress(courierAddress);
                        triggerToast("Mode Edit Aktif! Form sebelah kanan sekarang bisa diedit.", "info");
                      }}
                      className="w-full bg-[#65A657] hover:bg-[#58964b] text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      ✏️ Edit Profil
                    </button>
                  )}
                </div>

                <div className={`lg:col-span-7 bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm transition-all duration-300 ${
                  isEditing 
                    ? "border-2 border-blue-500 shadow-[0_10px_35px_rgba(59,130,246,0.15)] bg-white" 
                    : "border border-gray-150 opacity-90"
                }`}>
                  <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-6">Edit Profil</h3>
                  
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-2">Nama Panggilan</label>
                      <input 
                        type="text" 
                        value={isEditing ? tempNickName : courierNickName}
                        onChange={e => setTempNickName(e.target.value)}
                        placeholder="Nama Panggilan (Form Field)"
                        disabled={!isEditing}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                          isEditing 
                            ? "bg-white border-gray-300 text-gray-900 focus:border-transparent" 
                            : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-2">Email</label>
                      <input 
                        type="email" 
                        value={isEditing ? tempEmail : courierEmail}
                        onChange={e => setTempEmail(e.target.value)}
                        placeholder="Email (Form Field)"
                        disabled={!isEditing}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                          isEditing 
                            ? "bg-white border-gray-300 text-gray-900 focus:border-transparent" 
                            : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-655 mb-2">No. Handphone</label>
                      <input 
                        type="text" 
                        value={isEditing ? tempPhone : courierPhone}
                        onChange={e => setTempPhone(e.target.value)}
                        placeholder="No. Handphone (Form Field)"
                        disabled={!isEditing}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                          isEditing 
                            ? "bg-white border-gray-300 text-gray-900 focus:border-transparent" 
                            : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-655 mb-2">Alamat Rumah</label>
                      <textarea 
                        rows={3}
                        value={isEditing ? tempAddress : courierAddress}
                        onChange={e => setTempAddress(e.target.value)}
                        placeholder="Alamat Rumah (Text Area)"
                        disabled={!isEditing}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                          isEditing 
                            ? "bg-white border-gray-300 text-gray-900 focus:border-transparent" 
                            : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>

                    {isEditing && (
                      <div className="pt-4 border-t border-gray-100 flex gap-3.5 justify-start animate-fade-in">
                        <button
                          type="submit"
                          className="bg-[#65A657] hover:bg-[#58964b] text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-sm transition-all active:scale-95"
                        >
                          Simpan Perubahan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            triggerToast("Edit dibatalkan.", "info");
                          }}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-extrabold px-6 py-3 rounded-xl text-xs transition-all active:scale-95"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                    
                    {!isEditing && (
                      <p className="text-[11px] text-gray-400 italic font-bold tracking-tight">
                        *Klik tombol "Edit Profil" di sebelah kiri untuk mulai mengubah informasi profil Anda.
                      </p>
                    )}
                  </form>
                </div>

              </div>
            </div>
          )}

        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-150 flex items-center justify-around px-4 z-45 shadow-lg">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "paket-saya", label: "Tugas" },
            { id: "riwayat", label: "Riwayat" },
            { id: "profil", label: "Profil" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${
                activeTab === item.id 
                  ? "text-[#488746] font-bold" 
                  : "text-gray-400 font-medium"
              }`}
            >
              <span className="text-[13px] tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {editingPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] border border-gray-150 p-6 sm:p-8 w-full max-w-[650px] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingPackage(null)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-50 border border-gray-150 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-150 transition-colors"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Edit / Hapus Paket</h3>
            <p className="text-xs text-gray-400 font-bold mb-6">Nomor Resi: <span className="text-[#488746] font-mono font-black">{editingPackage.id}</span></p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                
                if (isNaN(parseFloat(editWeight)) || parseFloat(editWeight) <= 0) {
                  triggerToast("Berat paket harus berupa angka positif!", "info");
                  return;
                }
                if (isNaN(parseInt(editPrice)) || parseInt(editPrice) < 0) {
                  triggerToast("Tarif paket harus berupa angka non-negatif!", "info");
                  return;
                }

                const phoneRegex = /^[0-9+-\s]{8,20}$/;
                if (!phoneRegex.test(editCustPhone)) {
                  triggerToast("Format nomor HP penerima tidak valid!", "info");
                  return;
                }

                const res = await updateDelivery(editingPackage.id, {
                  customer: editCustName,
                  phone: editCustPhone,
                  address: editCustAddress,
                  item_name: editItemName,
                  weight: parseFloat(editWeight),
                  ship_service: editShipService,
                  price: parseInt(editPrice),
                  status: editStatus,
                  notes: editNotes,
                  vehicle_name: editVehName,
                  vehicle_plate: editVehPlate
                });

                if (res.success) {
                  if (sessionUser) {
                    const list = await fetchDeliveriesForCourier(sessionUser.id);
                    setPackages(list.map((p: any) => ({
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
                    })));
                  }
                  triggerToast("Rincian paket berhasil diperbarui!", "success");
                  setEditingPackage(null);
                } else {
                  triggerToast(res.error || "Gagal memperbarui rincian paket", "info");
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Penerima *</label>
                  <input 
                    type="text" 
                    value={editCustName} 
                    onChange={e => setEditCustName(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">No. HP Penerima *</label>
                  <input 
                    type="text" 
                    value={editCustPhone} 
                    onChange={e => setEditCustPhone(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Penerima *</label>
                <input 
                  type="text" 
                  value={editCustAddress} 
                  onChange={e => setEditCustAddress(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deskripsi Barang *</label>
                  <input 
                    type="text" 
                    value={editItemName} 
                    onChange={e => setEditItemName(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Berat (kg) *</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    value={editWeight} 
                    onChange={e => setEditWeight(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Layanan *</label>
                  <select 
                    value={editShipService} 
                    onChange={e => setEditShipService(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold bg-white cursor-pointer"
                  >
                    <option value="Cargo Reguler">Cargo Reguler</option>
                    <option value="Cargo Express">Cargo Express</option>
                    <option value="Cargo Same Day">Cargo Same Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tarif Kirim (Rp) *</label>
                  <input 
                    type="number" 
                    value={editPrice} 
                    onChange={e => setEditPrice(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status Pengiriman *</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-bold bg-white cursor-pointer"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Sedang Dikirim">Sedang Dikirim</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Gagal">Gagal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 border border-gray-155 p-4 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 mb-1">Nama Kendaraan</label>
                  <input 
                    type="text" 
                    value={editVehName} 
                    onChange={e => setEditVehName(e.target.value)} 
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-550 mb-1">Plat Nomor</label>
                  <input 
                    type="text" 
                    value={editVehPlate} 
                    onChange={e => setEditVehPlate(e.target.value)} 
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Catatan</label>
                <input 
                  type="text" 
                  value={editNotes} 
                  onChange={e => setEditNotes(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Apakah Anda yakin ingin menghapus paket ini?")) {
                      const res = await deleteDelivery(editingPackage.id);
                      if (res.success) {
                        if (sessionUser) {
                          const list = await fetchDeliveriesForCourier(sessionUser.id);
                          setPackages(list.map((p: any) => ({
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
                          })));
                        }
                        triggerToast("Paket berhasil dihapus dari database!", "success");
                        setEditingPackage(null);
                      } else {
                        triggerToast(res.error || "Gagal menghapus paket", "info");
                      }
                    }
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-xs font-bold px-4 py-3 rounded-xl transition-all active:scale-95"
                >
                  🗑️ Hapus Paket
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPackage(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-750 border border-gray-200 text-xs font-bold px-4 py-3 rounded-xl transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Mock Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-5 right-5 w-[320px] h-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[90] flex flex-col justify-between overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="bg-[#65A657] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-xs font-extrabold leading-tight">Pelanggan</p>
                <p className="text-[10px] text-green-100 font-bold mt-0.5">Online</p>
              </div>
            </div>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="text-white hover:text-green-100 text-sm font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-gray-50 flex flex-col">
            {chatMessages.map((msg, index) => (
              <div 
                key={index}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.sender === "me" 
                    ? "bg-[#65A657] text-white self-end rounded-tr-none" 
                    : "bg-white border border-gray-150 text-gray-800 self-start rounded-tl-none font-bold"
                }`}
              >
                <p>{msg.text}</p>
                <span className={`text-[8px] block text-right mt-1 opacity-70 ${msg.sender === "me" ? "text-green-100" : "text-gray-400"}`}>
                  {msg.time}
                </span>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              const newMsg = { sender: "me", text: chatInput, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
              setChatMessages(prev => [...prev, newMsg]);
              setChatInput("");
              
              // Simple mock replies from customer
              setTimeout(() => {
                const replies = [
                  "Baik pak, saya tunggu di rumah ya.",
                  "Oke pak, terima kasih infonya.",
                  "Tolong titipkan di pos satpam saja ya pak.",
                  "Siap pak, hati-hati di jalan.",
                ];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                setChatMessages(prev => [...prev, {
                  sender: "customer",
                  text: randomReply,
                  time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                }]);
              }, 1500);
            }}
            className="p-3 border-t border-gray-100 bg-white flex gap-2"
          >
            <input 
              type="text" 
              placeholder="Tulis pesan..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#65A657] outline-none font-medium"
            />
            <button 
              type="submit"
              className="bg-[#65A657] hover:bg-[#58964b] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Kirim
            </button>
          </form>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
