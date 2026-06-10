"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { logout } from "@/app/auth/actions";
import { 
  createDelivery, 
  fetchDeliveriesForCustomer, 
  fetchUserAddresses, 
  addUserAddress, 
  updateUserProfile, 
  fetchTrackingDetails
} from "@/app/lib/dashboard-actions";

interface Package {
  id: string;
  customer: string;
  address: string;
  phone: string;
  status: "Tersedia" | "Sedang Dikirim" | "Selesai" | "Gagal";
  type: string;
  codAmount: number;
  notes: string;
  weight: string;
  date?: string;
  sender?: string;
  senderAddress?: string;
  senderPhone?: string;
  price?: number;
  itemName?: string;
}

const SERVICE_RATES: Record<string, number> = {
  "Cargo Reguler": 10000,
  "Cargo Express": 25000,
  "Cargo Same Day": 50000,
};

interface PelangganDashboardClientProps {
  sessionUser: { id: string; name: string; email: string; role: string };
  profile: { name: string; email: string; phone?: string };
  initialAddresses: any[];
  defaultAddr: string;
  initialPackages: Package[];
}

export default function PelangganDashboardClient({
  sessionUser,
  profile,
  initialAddresses,
  defaultAddr,
  initialPackages
}: PelangganDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"tracking" | "buat-pengiriman" | "history-paket" | "cek-biaya" | "profil">("tracking");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [courierRating, setCourierRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  
  const [trackingState, setTrackingState] = useState<"search" | "searching" | "found" | "not-found">("search");
  const [searchResi, setSearchResi] = useState("");
  const [trackedResi, setTrackedResi] = useState("");

  const [senderName, setSenderName] = useState(profile.name);
  const [senderPhone, setSenderPhone] = useState(profile.phone || "");
  const [senderAddr, setSenderAddr] = useState(defaultAddr);
  
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddr, setRecipientAddr] = useState("");
  
  const [itemName, setItemName] = useState("");
  const [itemWeight, setItemWeight] = useState("1");
  const [shipService, setShipService] = useState("Cargo Reguler");
  const [createdResi, setCreatedResi] = useState<string | null>(null);
  const [createdPrice, setCreatedPrice] = useState<number>(0);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [customerName, setCustomerName] = useState(profile.name);
  const [customerEmail, setCustomerEmail] = useState(profile.email);
  const [customerPhone, setCustomerPhone] = useState(profile.phone || "");
  const [customerAddress, setCustomerAddress] = useState(defaultAddr);

  const [tempCustName, setTempCustName] = useState(customerName);
  const [tempCustEmail, setTempCustEmail] = useState(customerEmail);
  const [tempCustPhone, setTempCustPhone] = useState(customerPhone);
  const [tempCustAddr, setTempCustAddr] = useState(customerAddress);

  const [addresses, setAddresses] = useState<any[]>(initialAddresses);
  const [trackedDetails, setTrackedDetails] = useState<any>(null);
  const [isResiModalOpen, setIsResiModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [kirimSubTab, setKirimSubTab] = useState<"form" | "history" | "cek-biaya">("form");
  const [calcWeight, setCalcWeight] = useState("1");
  const [calcOrigin, setCalcOrigin] = useState("Yogyakarta");
  const [calcDest, setCalcDest] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");

  const [isPending, startTransition] = useTransition();

  const weightVal = parseFloat(itemWeight) || 0;
  const rate = SERVICE_RATES[shipService] || 10000;
  const estimatedCost = weightVal * rate;

  const triggerToast = (msg: string, type: "success" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const handleTrackSearch = async (resiCode: string) => {
    if (!resiCode.trim()) {
      triggerToast("Masukkan nomor resi terlebih dahulu", "info");
      return;
    }
    
    setSearchResi(resiCode);
    setTrackingState("searching");

    try {
      const res = await fetchTrackingDetails(resiCode);
      if (res) {
        setTrackedResi(res.delivery.id);
        setTrackedDetails(res);
        setTrackingState("found");
      } else {
        setTrackingState("not-found");
      }
    } catch (e) {
      console.error(e);
      setTrackingState("not-found");
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    if (!senderAddr || !senderAddr.trim()) {
      errors.senderAddr = "Alamat asal wajib diisi!";
    }
    if (!recipientName || !recipientName.trim()) {
      errors.recipientName = "Nama penerima wajib diisi!";
    }
    if (!recipientPhone || !recipientPhone.trim()) {
      errors.recipientPhone = "Nomor HP penerima wajib diisi!";
    } else {
      const phoneRegex = /^[0-9+-\s]{8,20}$/;
      if (!phoneRegex.test(recipientPhone)) {
        errors.recipientPhone = "Format nomor HP penerima tidak valid!";
      }
    }
    if (!recipientAddr || !recipientAddr.trim()) {
      errors.recipientAddr = "Alamat tujuan wajib diisi!";
    }
    if (!itemName || !itemName.trim()) {
      errors.itemName = "Deskripsi barang wajib diisi!";
    }
    if (!itemWeight) {
      errors.itemWeight = "Berat paket wajib diisi!";
    } else if (isNaN(parseFloat(itemWeight)) || parseFloat(itemWeight) <= 0) {
      errors.itemWeight = "Berat paket harus berupa angka positif!";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      triggerToast("Mohon periksa kembali form pengisian paket!", "info");
      return;
    }

    setFormErrors({});

    const payload = {
      customer: recipientName,
      address: recipientAddr,
      phone: recipientPhone,
      sender: senderName,
      sender_address: senderAddr,
      sender_phone: senderPhone,
      item_name: itemName,
      weight: parseFloat(itemWeight),
      ship_service: shipService,
      price: estimatedCost,
      notes: ""
    };

    const res = await createDelivery(payload);
    if (res.success && res.resiCode) {
      setCreatedResi(res.resiCode);
      setCreatedPrice(res.price);
      
      const list = await fetchDeliveriesForCustomer(senderName);
      setPackages(list.map((p: any) => ({
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
      })));

      triggerToast("Pengiriman baru sukses dibuat!", "success");

      setRecipientName("");
      setRecipientPhone("");
      setRecipientAddr("");
      setItemName("");
      setItemWeight("1");
    } else {
      triggerToast(res.error || "Gagal membuat pengiriman", "info");
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newContact || !newPhone || !newDetails) {
      triggerToast("Isi semua bidang alamat!", "info");
      return;
    }

    const phoneRegex = /^[0-9+-\s]{8,20}$/;
    if (!phoneRegex.test(newPhone)) {
      triggerToast("Format nomor HP tidak valid!", "info");
      return;
    }

    if (sessionUser) {
      const res = await addUserAddress(sessionUser.id, {
        label: newLabel,
        contact: newContact,
        phone: newPhone,
        details: newDetails
      });

      if (res.success) {
        const addrList = await fetchUserAddresses(sessionUser.id);
        setAddresses(addrList.map((a: any) => ({
          id: a.id,
          label: a.label,
          contact: a.contact,
          phone: a.phone,
          details: a.details
        })));

        triggerToast("Alamat baru berhasil ditambahkan!", "success");
        setNewLabel("");
        setNewContact("");
        setNewPhone("");
        setNewDetails("");
        setShowAddAddress(false);
      } else {
        triggerToast(res.error || "Gagal menambahkan alamat", "info");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFDFD] flex flex-col font-sans overflow-x-hidden text-gray-800 relative">
      
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 ${
          toastType === "success" 
            ? "bg-white text-green-800 border-green-100" 
            : "bg-white text-orange-800 border-orange-100"
        }`}>
          <div className="text-lg">✓</div>
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
              <div className="w-9 h-9 bg-[#EBF5EA] rounded-xl flex items-center justify-center text-green-700 shadow-inner flex-shrink-0">
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-base text-gray-900 tracking-tight block">CargoKu</span>
                <span className="text-[9px] font-extrabold text-green-600 tracking-wider uppercase block mt-[-4px]">LITE</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* User Profile Card inside Drawer */}
          <div className="bg-[#F0F7F1]/50 border border-green-100/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                {customerName.charAt(0)}
              </div>
              <div className="text-left">
                <span className="text-[13px] font-extrabold text-gray-800 block leading-tight">{customerName}</span>
                <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider block mt-1 w-max">
                  👑 Gold
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links inside Drawer */}
          <nav className="space-y-2">
            <button
              onClick={() => {
                setActiveTab("tracking");
                setTrackingState("search");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "tracking"
                  ? "bg-[#F0F7F1] text-[#488746] shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>🔍</span>
              <span>Lacak Paket</span>
            </button>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab("buat-pengiriman");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  (activeTab === "buat-pengiriman" || activeTab === "history-paket" || activeTab === "cek-biaya")
                    ? "bg-[#F0F7F1]/80 text-[#488746]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>📦</span>
                  <span>Kirim Paket</span>
                </div>
              </button>
              
              <div className="pl-6 space-y-1 mt-1 border-l-2 border-green-150 ml-5">
                <button
                  onClick={() => {
                    setActiveTab("buat-pengiriman");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "buat-pengiriman"
                      ? "bg-[#EBF5EA] text-[#488746] font-extrabold"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span>📝</span>
                  <span>Buat Pengiriman</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history-paket");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "history-paket"
                      ? "bg-[#EBF5EA] text-[#488746] font-extrabold"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span>🕒</span>
                  <span>History Paket</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("cek-biaya");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "cek-biaya"
                      ? "bg-[#EBF5EA] text-[#488746] font-extrabold"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span>💰</span>
                  <span>Cek Biaya</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab("profil");
                setTempCustName(customerName);
                setTempCustEmail(customerEmail);
                setTempCustPhone(customerPhone);
                setTempCustAddr(customerAddress);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === "profil"
                  ? "bg-[#F0F7F1] text-[#488746] shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>👤</span>
              <span>Profil Saya</span>
            </button>
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

      <nav className="w-full px-6 lg:px-16 py-6 flex items-center justify-between border-b border-gray-50 bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
        <Link href="#" onClick={() => { setActiveTab("tracking"); setTrackingState("search"); }}>
          <Image 
            src="/asset/logo.png" 
            alt="CargoKu Lite" 
            width={180} 
            height={50} 
            className="h-[42px] w-auto object-contain cursor-pointer"
            priority
          />
        </Link>
        
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
        
        <div className="hidden lg:flex items-center gap-10 text-[15px] font-bold text-gray-600">
          <button 
            onClick={() => { setActiveTab("tracking"); setTrackingState("search"); }} 
            className={`hover:text-[#65A657] transition-colors py-2 ${activeTab === "tracking" ? "text-[#65A657] border-b-2 border-[#65A657]" : ""}`}
          >
            Tracking
          </button>
          
          <div className="relative group py-2">
            <button 
              onClick={() => { setActiveTab("buat-pengiriman"); }} 
              className={`hover:text-[#65A657] transition-colors flex items-center gap-1 font-bold ${
                (activeTab === "buat-pengiriman" || activeTab === "history-paket" || activeTab === "cek-biaya") ? "text-[#65A657]" : ""
              }`}
            >
              <span>Kirim Paket</span>
              <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Card */}
            <div className="absolute top-full left-0 mt-1 w-[200px] bg-white border border-gray-150 rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={() => { setActiveTab("buat-pengiriman"); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-green-50/50 hover:text-green-700 flex items-center gap-2 ${
                  activeTab === "buat-pengiriman" ? "text-green-750 bg-green-50/20" : "text-gray-750"
                }`}
              >
                Buat Pengiriman
              </button>
              <button
                onClick={() => { setActiveTab("history-paket"); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-green-50/50 hover:text-green-700 flex items-center gap-2 ${
                  activeTab === "history-paket" ? "text-green-750 bg-green-50/20" : "text-gray-755"
                }`}
              >
                History Paket
              </button>
              <button
                onClick={() => { setActiveTab("cek-biaya"); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-green-50/50 hover:text-green-700 flex items-center gap-2 ${
                  activeTab === "cek-biaya" ? "text-green-750 bg-green-50/20" : "text-gray-755"
                }`}
              >
                Cek Biaya
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              setActiveTab("profil");
              setTempCustName(customerName);
              setTempCustEmail(customerEmail);
              setTempCustPhone(customerPhone);
              setTempCustAddr(customerAddress);
            }} 
            className={`hover:text-[#65A657] transition-colors py-2 ${activeTab === "profil" ? "text-[#65A657] border-b-2 border-[#65A657]" : ""}`}
          >
            Profil
          </button>

          <div className="h-[16px] w-[2px] bg-gray-300"></div>

          <button 
            onClick={handleLogout}
            disabled={isPending}
            className="bg-[#65A657] hover:bg-[#58964b] text-white px-7 py-3 rounded-[14px] transition-all shadow-sm font-bold text-[14px] active:scale-95 disabled:opacity-50"
          >
            {isPending ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </nav>
      
      <div className="h-[92px] w-full flex-shrink-0" />

      <main className="flex-grow max-w-[1440px] mx-auto w-full flex flex-col">
        
        {activeTab === "tracking" && (
          <div className="w-full flex flex-col flex-grow">
            
            {trackingState === "search" && (
              <div className="w-full flex flex-col flex-grow justify-between">
                
                <div className="flex flex-col lg:flex-row px-6 lg:px-16 pt-6 pb-20 w-full relative">
                  
                  <div className="w-full lg:w-[55%] flex flex-col justify-center z-10 pt-4 lg:pt-0">
                    <h1 className="text-[40px] md:text-[52px] lg:text-[58px] leading-[1.15] font-extrabold text-[#1E293B] tracking-tight mb-5 animate-fade-in">
                      Lacak Paket Anda <br className="hidden lg:block" />
                      dengan <span className="text-[#65A657]">Mudah & Cepat</span>
                    </h1>
                    
                    <p className="text-[#64748B] text-[15px] sm:text-[16px] leading-[1.7] mb-8 max-w-[500px] font-medium">
                      Aplikasi tracking resi sederhana untuk UMKM & kurir. Ringan, ramah, dan dibuat untuk mobile.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-10">
                      <span className="bg-[#F0F7F1] text-[#488746] px-4 py-1.5 rounded-full text-[13px] font-bold tracking-wide">Mobile-first</span>
                      <span className="bg-[#F0F7F1] text-[#488746] px-4 py-1.5 rounded-full text-[13px] font-bold tracking-wide">Simple</span>
                      <span className="bg-[#F0F7F1] text-[#488746] px-4 py-1.5 rounded-full text-[13px] font-bold tracking-wide">Friendly Green</span>
                    </div>

                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-gray-100 w-full max-w-[620px]">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleTrackSearch(searchResi); }}
                        className="flex flex-col sm:flex-row border border-gray-300 rounded-[14px] mb-8 focus-within:ring-2 focus-within:ring-[#65A657] transition-all overflow-hidden bg-white"
                      >
                        <div className="flex-grow flex items-center pl-4 bg-white">
                          <span className="text-xl mr-3 opacity-70">🔍</span>
                          <input 
                            type="text" 
                            placeholder="Masukkan nomor resi" 
                            value={searchResi}
                            onChange={(e) => setSearchResi(e.target.value)}
                            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] text-gray-800 placeholder:text-gray-400 font-bold py-4 shadow-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="bg-[#65A657] hover:bg-[#58964b] transition-colors text-white px-7 py-4 font-bold text-[15px] flex justify-center items-center gap-2 whitespace-nowrap shadow-sm w-full sm:w-auto"
                        >
                          Lacak Paket
                        </button>
                      </form>

                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="font-bold text-[#1E293B] text-[15px] tracking-tight">Resi Terakhir</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {packages.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => { setSearchResi(p.id); handleTrackSearch(p.id); }}
                            className="border border-gray-100 p-4 rounded-[1.25rem] flex items-center justify-between cursor-pointer hover:border-[#65A657] transition-all group hover:shadow-md hover:shadow-[#F0F7F1] bg-white"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 bg-[#FAF7ED] rounded-xl flex items-center justify-center text-lg select-none">
                                📦
                              </div>
                              <div>
                                <p className="font-bold text-[#1E293B] text-[14px] tracking-tight mb-0.5">{p.id}</p>
                                <p className="text-[12px] text-gray-500 font-medium">{p.status}</p>
                              </div>
                            </div>
                            <span className="text-gray-400 group-hover:text-[#65A657] transition-colors">→</span>
                          </div>
                        ))}

                        <div 
                          onClick={() => { setSearchResi("JNE4S6XXX"); handleTrackSearch("JNE4S6XXX"); }}
                          className="border border-gray-100 p-4 rounded-[1.25rem] flex items-center justify-between cursor-pointer hover:border-red-400 transition-all group hover:shadow-md hover:shadow-red-50 bg-white"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-lg select-none">
                              📦
                            </div>
                            <div>
                              <p className="font-bold text-[#1E293B] text-[14px] tracking-tight mb-0.5">JNE4S6XXX</p>
                              <p className="text-[12px] text-red-500 font-medium">Gagal/Dummy</p>
                            </div>
                          </div>
                          <span className="text-gray-400 group-hover:text-red-500 transition-colors">→</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="w-full lg:w-[45%] relative mt-32 lg:mt-0 flex flex-col justify-end select-none">
                    <div className="absolute bottom-[20px] lg:bottom-[-20px] right-[-10px] lg:right-[-140px] w-[125%] lg:w-[165%] max-w-[1100px] z-0 pointer-events-none">
                      <Image 
                        src="/asset/gambar_mobil.png" 
                        alt="Delivery Truck Illustration"
                        width={1200}
                        height={900}
                        className="object-contain object-bottom w-full h-auto"
                        priority
                      />
                    </div>
                  </div>

                </div>

                <div className="w-full px-6 lg:px-16 pb-8 mt-auto">
                  <div className="bg-[#F0F7F1] rounded-[2rem] p-8 lg:p-10 w-full shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
                      
                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <div className="text-[#65A657]">
                            <svg className="w-[26px] h-[26px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#111827] text-[15px] mb-1.5 tracking-tight">Tracking Cepat</h4>
                          <p className="text-[12px] text-gray-500 leading-relaxed font-bold">Cek status paketmu sekali klik.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <div className="text-[#65A657]">
                            <svg className="w-[26px] h-[26px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#111827] text-[15px] mb-1.5 tracking-tight">Bahasa Ramah</h4>
                          <p className="text-[12px] text-gray-500 leading-relaxed font-bold">Pesan jelas dan mudah dipahami.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <div className="text-[#65A657]">
                            <svg className="w-[26px] h-[26px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.95 11.95 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#111827] text-[15px] mb-1.5 tracking-tight">Aman & Terpercaya</h4>
                          <p className="text-[12px] text-gray-500 leading-relaxed font-bold">Data paket Anda selalu kami jaga.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <div className="text-[#65A657]">
                            <svg className="w-[26px] h-[26px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#111827] text-[15px] mb-1.5 tracking-tight">Tepat Waktu</h4>
                          <p className="text-[12px] text-gray-500 leading-relaxed font-bold">Informasi ter-update secara real-time.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}

            {trackingState === "searching" && (
              <div className="px-6 lg:px-16 py-10 w-full">
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 max-w-[500px] mx-auto">
                  <div className="w-36 h-36 rounded-full bg-[#EBF5EA] flex items-center justify-center relative mb-8 shadow-inner">
                    <div className="w-16 h-16 bg-[#65A657] rounded-xl flex items-center justify-center text-white text-3xl font-extrabold relative shadow-md">
                      📦
                      <div className="absolute -top-1 w-12 h-2 bg-[#488746] rounded-full"></div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-white border border-gray-150 rounded-full p-2.5 shadow-md">
                      <svg className="w-6 h-6 text-green-700 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1.5 tracking-tight">Sedang mencari paketmu...</h3>
                  <p className="text-xs text-gray-500 font-medium mb-6">Mohon tunggu sebentar ya</p>
                  
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 bg-green-700 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2.5 h-2.5 bg-green-700 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2.5 h-2.5 bg-green-700 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}

            {trackingState === "not-found" && (
              <div className="px-6 lg:px-16 py-10 w-full">
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 max-w-[500px] mx-auto">
                  <div className="w-36 h-36 rounded-full bg-red-50 flex items-center justify-center relative mb-8 shadow-inner">
                    <div className="w-16 h-16 bg-[#65A657]/80 rounded-xl flex flex-col items-center justify-center text-white relative shadow-md">
                      <span className="text-2xl">📦</span>
                      <span className="text-[10px] font-bold mt-[-2px]">☹</span>
                      <div className="absolute -top-1 w-12 h-2 bg-[#488746]/85 rounded-full"></div>
                    </div>
                    <div className="absolute -top-1 -right-1 text-4xl select-none animate-pulse">❓</div>
                  </div>
                  
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Ups...</h3>
                  <h4 className="text-sm font-extrabold text-gray-600 mb-1">Nomor resi tidak ditemukan</h4>
                  <p className="text-xs text-gray-400 font-bold mb-8 max-w-[300px]">Coba cek lagi ya, pastikan nomor sudah benar</p>
                  
                  <button
                    onClick={() => setTrackingState("search")}
                    className="bg-[#65A657] hover:bg-[#58964b] text-white px-8 py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    Kembali ke Beranda
                  </button>
                </div>
              </div>
            )}

            {trackingState === "found" && (
              <div className="px-6 lg:px-16 py-10 w-full">
                <div className="space-y-6 animate-fade-in">
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setTrackingState("search")}
                      className="bg-white border border-gray-250 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      ← Kembali
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    <div className="lg:col-span-5 space-y-6">
                      <div className={`border rounded-[1.75rem] p-6 shadow-sm ${
                        trackedDetails?.delivery?.status === 'Selesai'
                          ? 'bg-[#EBF5EA] border-[#c0e4bc]'
                          : trackedDetails?.delivery?.status === 'Gagal'
                          ? 'bg-red-50 border-red-200'
                          : trackedDetails?.delivery?.status === 'Tersedia'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-[#B9D7B5] border-[#a2cb9c]'
                      }`}>
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">
                            {trackedDetails?.delivery?.status === 'Selesai' 
                              ? '✅' 
                              : trackedDetails?.delivery?.status === 'Gagal' 
                              ? '❌' 
                              : trackedDetails?.delivery?.status === 'Tersedia'
                              ? '📥'
                              : '🚚'}
                          </span>
                          <div>
                            <span className={`text-[10px] font-extrabold block uppercase tracking-wider ${
                              trackedDetails?.delivery?.status === 'Selesai'
                                ? 'text-green-800'
                                : trackedDetails?.delivery?.status === 'Gagal'
                                ? 'text-red-800'
                                : trackedDetails?.delivery?.status === 'Tersedia'
                                ? 'text-blue-800'
                                : 'text-green-800'
                            }`}>Status Pengiriman</span>
                            <span className={`font-extrabold text-base ${
                              trackedDetails?.delivery?.status === 'Selesai'
                                ? 'text-green-950'
                                : trackedDetails?.delivery?.status === 'Gagal'
                                ? 'text-red-950'
                                : trackedDetails?.delivery?.status === 'Tersedia'
                                ? 'text-blue-950'
                                : 'text-green-900'
                            }`}>
                              {trackedDetails?.delivery?.status || "Sedang dikirim"}
                            </span>
                          </div>
                        </div>

                        {trackedDetails?.delivery?.notes && (
                          <div className={`mt-4 pt-3 border-t text-xs ${
                            trackedDetails?.delivery?.status === 'Selesai'
                              ? 'border-green-200 text-green-850 font-bold'
                              : trackedDetails?.delivery?.status === 'Gagal'
                              ? 'border-red-200 text-red-850 font-bold'
                              : 'border-green-300 text-green-900 font-bold'
                          }`}>
                            <span className="font-bold block text-[10px] uppercase opacity-75 tracking-wider mb-1">Catatan Kurir:</span>
                            <p className="italic">"{trackedDetails.delivery.notes}"</p>
                          </div>
                        )}

                        {trackedDetails?.delivery?.vehicle_name && (
                          <div className={`mt-3 pt-3 border-t text-[11px] ${
                            trackedDetails?.delivery?.status === 'Selesai'
                              ? 'border-green-200 text-green-800'
                              : trackedDetails?.delivery?.status === 'Gagal'
                              ? 'border-red-200 text-red-800'
                              : 'border-green-300 text-green-900'
                          }`}>
                            <span className="font-bold text-[10px] uppercase opacity-75 tracking-wider block mb-0.5">Kendaraan Pengantar:</span>
                            <p className="font-extrabold">{trackedDetails.delivery.vehicle_name} ({trackedDetails.delivery.vehicle_plate})</p>
                          </div>
                        )}

                        <div className="bg-white border border-gray-150 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-4">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">NO. RESI</span>
                            <span className="font-extrabold text-sm text-gray-800 tracking-tight">{trackedResi}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(trackedResi);
                              triggerToast("Nomor Resi berhasil disalin!", "success");
                            }}
                            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-2"
                          >
                            📋 Salin
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-150 rounded-[1.75rem] p-6 shadow-sm space-y-4">
                        <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-3">Detail Paket</h3>
                        
                        <div className="space-y-4 text-xs text-gray-600 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold">Layanan</span>
                            <span className="font-extrabold text-gray-900">{trackedDetails?.delivery?.ship_service || "Cargo Reguler"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold">Pengirim</span>
                            <span className="font-extrabold text-gray-900">
                              {trackedDetails?.delivery?.sender || "Gudang Jakarta"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold">Penerima</span>
                            <span className="font-extrabold text-gray-900">
                              {trackedDetails?.delivery?.customer || "Toko Maju Jaya"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-bold">Estimasi sampai</span>
                            <span className="font-extrabold text-gray-900">Tepat Waktu</span>
                          </div>
                          {trackedDetails?.delivery?.price && (
                            <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                              <span className="text-gray-400 font-bold">Total Biaya Kirim</span>
                              <span className="font-extrabold text-green-700">
                                Rp {trackedDetails.delivery.price.toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setIsResiModalOpen(true)}
                          className="w-full mt-2 bg-[#65A657] hover:bg-[#58964b] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Lihat detail resi
                        </button>
                      </div>

                      {/* Courier Rating Widget */}
                      {trackedDetails?.delivery?.status === 'Selesai' && (
                        <div className="bg-white border border-gray-150 rounded-[1.75rem] p-6 shadow-sm space-y-4">
                          <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-3">Penilaian Kurir</h3>
                          {hasRated ? (
                            <div className="text-center py-4 bg-green-50/50 rounded-2xl border border-green-100 p-4">
                              <span className="text-2xl block mb-2">🎉</span>
                              <p className="text-xs font-extrabold text-green-800">Terima kasih atas penilaian Anda!</p>
                              <p className="text-[10px] text-gray-400 mt-1 font-bold">Feedback Anda membantu meningkatkan kualitas pengantaran kami.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                Bagaimana pelayanan kurir yang mengantar paket Anda hari ini? Berikan penilaian bintang:
                              </p>
                              <div className="flex justify-center gap-2 py-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setCourierRating(star)}
                                    className="text-2xl hover:scale-110 transition-transform focus:outline-none"
                                  >
                                    {star <= courierRating ? "⭐" : "☆"}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => {
                                  if (courierRating === 0) {
                                    triggerToast("Silakan pilih bintang penilaian terlebih dahulu", "info");
                                    return;
                                  }
                                  setHasRated(true);
                                  triggerToast("Penilaian kurir berhasil dikirim!", "success");
                                }}
                                className="w-full bg-[#65A657] hover:bg-[#58964b] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                              >
                                Kirim Penilaian
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    <div className="lg:col-span-4 bg-white border border-gray-150 rounded-[1.75rem] p-6 shadow-sm space-y-6">
                      <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-3">Riwayat Pengirim</h3>
                      <div className="relative pl-6 space-y-8 border-l border-green-700/30 ml-2 pt-2">
                        {trackedDetails?.logs && trackedDetails.logs.length > 0 ? (
                          trackedDetails.logs.map((log: any, index: number) => (
                            <div key={log.id} className="relative">
                              <span className={`absolute -left-[31px] top-0.5 w-[11px] h-[11px] rounded-full ${
                                index === 0 ? "bg-green-700 ring-4 ring-green-100" : "bg-green-700/70"
                              }`}></span>
                              <div>
                                <p className="text-[13px] font-extrabold text-gray-900 leading-tight">{log.status}</p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{log.notes}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(log.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })} WIB
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 font-medium">Belum ada riwayat logs untuk paket ini.</p>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                      <button
                        onClick={() => {
                          triggerToast("Tautan bagikan disalin ke clipboard!", "success");
                          navigator.clipboard.writeText(`Lacak Paket CargoKu: ${trackedResi}`);
                        }}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-250 py-3.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.828-2.414m0 0a3 3 0 10-3.62-1.09l-4.829 2.414m4.829 2.414a3 3 0 11-3.62 1.09l-4.829-2.414m4.829 2.414a3 3 0 113.62 1.09h4.828" />
                        </svg>
                        <span>Bagikan</span>
                      </button>

                      <button
                        onClick={() => {
                          setChatMessages([
                            { sender: "courier", text: "Halo kak, saya kurir CargoKu yang membawa paket Anda. Ada yang bisa dibantu?", time: "Baru saja" }
                          ]);
                          setIsChatOpen(true);
                        }}
                        className="w-full bg-[#EBF5EA] hover:bg-[#dbeed8] text-[#488746] border border-green-200/50 py-3.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        💬 Chat Kurir
                      </button>

                      <div className="bg-[#D3E8D0] rounded-[2rem] p-5 shadow-sm text-center relative overflow-hidden h-[260px] flex flex-col justify-between">
                        <div className="absolute inset-0 z-0">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <line x1="10" y1="40" x2="300" y2="80" stroke="#FFFFFF" strokeWidth="8" />
                            <line x1="60" y1="0" x2="90" y2="240" stroke="#FFFFFF" strokeWidth="10" />
                            <line x1="190" y1="0" x2="160" y2="240" stroke="#FFFFFF" strokeWidth="12" />
                            <path d="M 50,160 Q 90,90 160,130 T 210,60" fill="none" stroke="#488746" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="50" cy="160" r="6" fill="#488746" />
                            <g transform="translate(210, 60)">
                              <circle cx="0" cy="0" r="12" fill="#65A657" className="animate-ping opacity-35" />
                              <circle cx="0" cy="0" r="6" fill="#65A657" />
                            </g>
                          </svg>
                        </div>
                        <div></div>
                        <div className="z-10 bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl shadow-sm text-[12px] font-extrabold text-[#488746] select-none">
                          Paketmu sampai hari ini!
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

            {activeTab === "buat-pengiriman" && (
          <div className="px-6 lg:px-16 py-10 w-full">
            <div className="max-w-[1100px] mx-auto space-y-8 animate-fade-in">
              <div>
                <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Kirim Paket</h2>
                <p className="text-[13px] text-gray-500 font-bold">Layanan pengiriman barang baru dan pencatatan resi CargoKu.</p>
              </div>

              <div className="space-y-6">
                  {createdResi && (
                    <div className="bg-white border-2 border-green-500 rounded-[2rem] p-6 sm:p-8 shadow-md relative overflow-hidden animate-fade-in">
                      <div className="absolute right-0 bottom-0 text-[120px] opacity-10 pointer-events-none select-none">🎉</div>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-extrabold text-xl flex-shrink-0">✓</div>
                        <div>
                          <h3 className="text-lg font-extrabold text-gray-900">Resi Berhasil Dibuat!</h3>
                          <p className="text-xs text-gray-500 mt-1">Paket baru telah sukses terdaftar dalam database pelacakan CargoKu.</p>
                          
                          <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 block uppercase">Nomor Resi Baru</span>
                              <span className="font-extrabold text-base text-[#488746] tracking-tight">{createdResi}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 block uppercase">Biaya Terbayar</span>
                              <span className="font-extrabold text-sm text-gray-800">Rp {createdPrice.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  handleTrackSearch(createdResi);
                                  setCreatedResi(null);
                                  setActiveTab("tracking");
                                }}
                                className="bg-[#65A657] hover:bg-[#58964b] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                Lacak Sekarang
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => setCreatedResi(null)}
                            className="text-[12px] text-green-700 font-extrabold hover:underline mt-4 block"
                          >
                            + Buat Pengiriman Baru Lagi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!createdResi && (
                    <form onSubmit={handleCreateShipment} noValidate className="bg-white border border-gray-150 rounded-[2.5rem] p-6 sm:p-10 shadow-sm space-y-8 animate-fade-in">
                      
                      <div className="space-y-4">
                        <h3 className="text-[15px] font-extrabold text-gray-900 border-b border-gray-100 pb-2">1. Data Pengirim (Asal)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Nama Pengirim</label>
                            <input 
                              type="text" 
                              value={senderName} 
                              onChange={e => setSenderName(e.target.value)} 
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">No. HP Pengirim</label>
                            <input 
                              type="text" 
                              value={senderPhone} 
                              onChange={e => setSenderPhone(e.target.value)} 
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Asal Lengkap *</label>
                          <input 
                            type="text" 
                            value={senderAddr} 
                            onChange={e => {
                              setSenderAddr(e.target.value);
                              if (formErrors.senderAddr) {
                                setFormErrors(prev => {
                                  const copy = { ...prev };
                                  delete copy.senderAddr;
                                  return copy;
                                });
                              }
                            }} 
                            className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                              formErrors.senderAddr 
                                ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300" 
                                : "border-gray-200 focus:ring-2 focus:ring-green-500"
                            }`}
                          />
                          {formErrors.senderAddr && (
                            <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                              ⚠️ {formErrors.senderAddr}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[15px] font-extrabold text-gray-900 border-b border-gray-100 pb-2">2. Data Penerima (Tujuan)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Nama Penerima *</label>
                            <input 
                              type="text" 
                              value={recipientName} 
                              onChange={e => {
                                  setRecipientName(e.target.value);
                                  if (formErrors.recipientName) {
                                    setFormErrors(prev => {
                                      const copy = { ...prev };
                                      delete copy.recipientName;
                                      return copy;
                                    });
                                  }
                              }} 
                              placeholder="Contoh: Toko Maju Jaya"
                              className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                                formErrors.recipientName 
                                  ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300" 
                                  : "border-gray-200 focus:ring-2 focus:ring-green-500"
                              }`}
                            />
                            {formErrors.recipientName && (
                              <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                                ⚠️ {formErrors.recipientName}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">No. HP Penerima *</label>
                            <input 
                              type="text" 
                              value={recipientPhone} 
                              onChange={e => {
                                  setRecipientPhone(e.target.value);
                                  if (formErrors.recipientPhone) {
                                    setFormErrors(prev => {
                                      const copy = { ...prev };
                                      delete copy.recipientPhone;
                                      return copy;
                                    });
                                  }
                              }} 
                              placeholder="Contoh: 0899XXXXXXXX"
                              className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                                formErrors.recipientPhone 
                                  ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300" 
                                  : "border-gray-200 focus:ring-2 focus:ring-green-500"
                              }`}
                            />
                            {formErrors.recipientPhone && (
                              <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                                ⚠️ {formErrors.recipientPhone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Tujuan Lengkap *</label>
                          <input 
                            type="text" 
                            value={recipientAddr} 
                            onChange={e => {
                              setRecipientAddr(e.target.value);
                              if (formErrors.recipientAddr) {
                                setFormErrors(prev => {
                                  const copy = { ...prev };
                                  delete copy.recipientAddr;
                                  return copy;
                                });
                              }
                            }} 
                            placeholder="Contoh: Bandung, Jawa Barat"
                            className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                              formErrors.recipientAddr 
                                ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300" 
                                : "border-gray-200 focus:ring-2 focus:ring-green-500"
                            }`}
                          />
                          {formErrors.recipientAddr && (
                            <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                              ⚠️ {formErrors.recipientAddr}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[15px] font-extrabold text-gray-900 border-b border-gray-100 pb-2">3. Informasi Detail Paket</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Deskripsi Barang *</label>
                            <input 
                              type="text" 
                              value={itemName} 
                              onChange={e => {
                                setItemName(e.target.value);
                                if (formErrors.itemName) {
                                  setFormErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.itemName;
                                    return copy;
                                  });
                                }
                              }} 
                              placeholder="Contoh: Pakaian / Komponen Elektronik"
                              className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                                formErrors.itemName 
                                  ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300" 
                                  : "border-gray-200 focus:ring-2 focus:ring-green-500"
                              }`}
                            />
                            {formErrors.itemName && (
                              <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                                ⚠️ {formErrors.itemName}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Berat Paket (kg) *</label>
                            <input 
                              type="number" 
                              min="0.1" 
                              step="0.1" 
                              value={itemWeight} 
                              onChange={e => {
                                setItemWeight(e.target.value);
                                if (formErrors.itemWeight) {
                                  setFormErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.itemWeight;
                                    return copy;
                                  });
                                }
                              }} 
                              className={`w-full px-4 py-3 rounded-xl border text-xs outline-none font-bold transition-all ${
                                formErrors.itemWeight 
                                  ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-500 text-red-900" 
                                  : "border-gray-200 focus:ring-2 focus:ring-green-500"
                              }`}
                            />
                            {formErrors.itemWeight && (
                              <span className="text-red-555 text-[10px] font-bold block mt-1.5 pl-1">
                                ⚠️ {formErrors.itemWeight}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Pilihan Layanan Pengiriman</label>
                          <select
                            value={shipService}
                            onChange={e => setShipService(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 bg-white font-bold outline-none cursor-pointer mb-5"
                          >
                            <option value="Cargo Reguler">Cargo Reguler (Rp 10.000 / kg)</option>
                            <option value="Cargo Express">Cargo Express (Rp 25.000 / kg)</option>
                            <option value="Cargo Same Day">Cargo Same Day (Rp 50.000 / kg)</option>
                          </select>
                        </div>

                        <div className="bg-[#FAF7ED] border border-orange-100 rounded-2xl p-5 flex items-center justify-between animate-fade-in shadow-inner">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block uppercase font-extrabold tracking-wider">Estimasi Biaya Pengiriman</span>
                            <span className="text-[11px] text-gray-500 font-bold">({itemWeight} kg x Rp {rate.toLocaleString("id-ID")} per kg)</span>
                          </div>
                          <span className="text-xl font-extrabold text-green-700">
                            Rp {estimatedCost.toLocaleString("id-ID")}
                          </span>
                        </div>

                      </div>

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <button
                          type="submit"
                          className="bg-[#65A657] hover:bg-[#58964b] text-white font-extrabold px-8 py-4 rounded-xl text-xs shadow-sm transition-all active:scale-95"
                        >
                          Buat Pengiriman & Dapatkan Resi
                        </button>
                      </div>

                    </form>
                  )}
                </div>
              </div>
            </div>
        )}

        {activeTab === "history-paket" && (
          <div className="px-6 lg:px-16 py-10 w-full">
            <div className="max-w-[1100px] mx-auto space-y-8 animate-fade-in">
              <div>
                <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight">History Paket</h2>
                <p className="text-[13px] text-gray-500 font-bold">Daftar riwayat dan status seluruh paket kiriman Anda.</p>
              </div>

              <div className="space-y-6 animate-fade-in">
                {packages.length === 0 ? (
                  <div className="bg-white border border-gray-150 rounded-[2rem] p-16 text-center text-gray-400 shadow-sm">
                    <span className="text-5xl block mb-4">📦</span>
                    <p className="font-extrabold text-base text-gray-700">Belum ada riwayat pengiriman</p>
                    <p className="text-xs text-gray-400 mt-2 max-w-[340px] mx-auto leading-relaxed">
                      Anda belum mendaftarkan pengiriman paket apa pun. Mulai kirim paket pertama Anda sekarang!
                    </p>
                    <button 
                      onClick={() => setActiveTab("buat-pengiriman")} 
                      className="mt-6 bg-[#65A657] hover:bg-[#58964b] text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Kirim Paket Sekarang
                    </button>
                  </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {packages.map(p => (
                        <div 
                          key={p.id}
                          className="bg-white border border-gray-150 hover:border-green-300 rounded-[1.75rem] p-6 shadow-sm flex flex-col justify-between transition-all group hover:shadow-md"
                        >
                          <div>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                              <div>
                                <span className="text-[10px] font-bold text-gray-400 block">NOMOR RESI</span>
                                <span className="font-extrabold text-sm text-gray-800 tracking-tight">{p.id}</span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                                p.status === "Selesai"
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : p.status === "Sedang Dikirim"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : p.status === "Gagal"
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : "bg-gray-50 text-gray-600 border-gray-100"
                              }`}>
                                {p.status === "Selesai" ? "✓ Selesai" : p.status === "Sedang Dikirim" ? "🚚 Dikirim" : p.status === "Gagal" ? "✗ Gagal" : "⏳ Tersedia"}
                              </span>
                            </div>

                            <div className="space-y-2.5 mb-5 text-[12px] text-gray-600 font-medium">
                              <div className="flex items-start gap-2.5">
                                <span className="text-sm">👤</span>
                                <div>
                                  <p className="font-extrabold text-gray-900">{p.customer}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{p.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <span className="text-sm">📍</span>
                                <p className="text-gray-750 line-clamp-2">{p.address}</p>
                              </div>
                              <div className="flex justify-between items-center border-t border-gray-50 pt-2.5 mt-2.5">
                                <div>
                                  <span className="text-[9px] text-gray-400 block font-bold">DESKRIPSI</span>
                                  <span className="font-extrabold text-gray-800">{p.itemName || "Paket Barang"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-gray-400 block font-bold">BERAT & LAYANAN</span>
                                  <span className="font-extrabold text-gray-800">{p.weight} ({p.type})</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                            <div>
                              <span className="text-[9px] text-gray-400 block font-bold">TOTAL BIAYA</span>
                              <span className="font-extrabold text-sm text-green-700">Rp {p.price ? p.price.toLocaleString("id-ID") : "0"}</span>
                            </div>
                            <button
                              onClick={() => {
                                setSearchResi(p.id);
                                handleTrackSearch(p.id);
                                setActiveTab("tracking");
                              }}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              🔍 Lacak Paket
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "cek-biaya" && (
          <div className="px-6 lg:px-16 py-10 w-full">
            <div className="max-w-[1100px] mx-auto space-y-8 animate-fade-in">
              <div>
                <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Cek Biaya</h2>
                <p className="text-[13px] text-gray-500 font-bold">Masukkan berat dan rincian kota asal & tujuan untuk simulasi tarif pengiriman.</p>
              </div>

              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input card */}
                    <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm space-y-4 h-fit">
                      <h4 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-3">Form Simulasi Ongkir</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Asal (Kota/Kabupaten)</label>
                          <input 
                            type="text" 
                            value={calcOrigin} 
                            onChange={e => setCalcOrigin(e.target.value)} 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Tujuan (Kota/Kabupaten)</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Bandung, Jawa Barat"
                            value={calcDest} 
                            onChange={e => setCalcDest(e.target.value)} 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">Berat Paket (kg)</label>
                          <input 
                            type="number" 
                            min="0.1" 
                            step="0.1" 
                            value={calcWeight} 
                            onChange={e => setCalcWeight(e.target.value)} 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Results comparison cards */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="font-extrabold text-sm text-gray-900">Hasil Estimasi Layanan</h4>
                      
                      <div className="space-y-4">
                        {[
                          { name: "Cargo Reguler", rate: 10000, desc: "Layanan hemat untuk barang besar & cargo darat.", eta: "3 - 5 Hari Kerja" },
                          { name: "Cargo Express", rate: 25000, desc: "Pengantaran lebih cepat dengan truk prioritas.", eta: "1 - 2 Hari Kerja" },
                          { name: "Cargo Same Day", rate: 50000, desc: "Layanan cargo darat sampai di hari yang sama.", eta: "Hari Ini Sampai" }
                        ].map(service => {
                          const wVal = parseFloat(calcWeight) || 0;
                          const totalCost = wVal * service.rate;

                          return (
                            <div 
                              key={service.name}
                              className="bg-white border border-gray-150 hover:border-green-200 rounded-[1.75rem] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:shadow-md"
                            >
                              <div className="flex items-start gap-4">
                                <div>
                                  <h5 className="font-extrabold text-sm text-gray-900">{service.name}</h5>
                                  <p className="text-[11px] text-gray-400 font-bold mt-0.5">{service.eta} • Rp {service.rate.toLocaleString("id-ID")}/kg</p>
                                  <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">{service.desc}</p>
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end justify-between gap-3 border-t sm:border-t-0 border-gray-50 pt-4 sm:pt-0">
                                <div className="text-left sm:text-right">
                                  <span className="text-[9px] text-gray-400 block font-bold">ESTIMASI BIAYA</span>
                                  <span className="font-black text-lg text-green-700">Rp {totalCost.toLocaleString("id-ID")}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setSenderAddr(calcOrigin);
                                    setRecipientAddr(calcDest);
                                    setItemWeight(calcWeight);
                                    setShipService(service.name);
                                    setActiveTab("buat-pengiriman");
                                    triggerToast(`Mengisi data dengan layanan ${service.name}!`, "success");
                                  }}
                                  className="bg-[#65A657] hover:bg-[#58964b] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                >
                                  Pilih & Kirim ➔
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {activeTab === "profil" && (
          <div className="px-6 lg:px-16 py-10 w-full">
            <div className="max-w-[1100px] mx-auto space-y-8 animate-fade-in">
              <div>
                <h2 className="text-[28px] font-black text-gray-900 tracking-tight leading-tight">Profil Saya</h2>
                <p className="text-[13px] text-gray-500 font-bold mt-1">Kelola data profil, tingkat keanggotaan, dan buku alamat pengiriman Anda.</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-800 via-emerald-950 to-zinc-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-emerald-700/30">
                
                <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                <div className="absolute right-[-30px] bottom-[-30px] text-white text-[160px] font-black opacity-[0.03] pointer-events-none select-none">GOLD</div>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 z-10 w-full md:w-auto">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 p-[3px] shadow-lg flex-shrink-0">
                    <div className="w-full h-full bg-[#1E293B] rounded-[21px] flex items-center justify-center text-3xl font-black text-yellow-400">
                      {customerName.charAt(0)}
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <h3 className="text-2xl font-black tracking-tight">{customerName}</h3>
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        👑 Gold Member
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 font-bold mt-1.5 tracking-wide">ID Pelanggan: CGK-USR-8027 • Pelanggan Aktif</p>
                    
                    <div className="mt-4 max-w-[280px]">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-emerald-300 mb-1">
                        <span>Progress ke Platinum</span>
                        <span>1.250 / 2.000 Poin</span>
                      </div>
                      <div className="w-full h-2 bg-emerald-950/60 rounded-full border border-emerald-800/40 overflow-hidden">
                        <div className="w-[62.5%] h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
                      </div>
                      <p className="text-[9px] text-emerald-400/70 font-semibold mt-1">Kumpulkan 750 poin lagi untuk diskon kirim paket 15%!</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 text-center z-10 w-full md:w-auto border-t md:border-t-0 border-emerald-800/50 pt-6 md:pt-0">
                  <div className="px-2">
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block">Total Kirim</span>
                    <span className="text-2xl font-black block mt-1 tracking-tight text-white font-mono">24</span>
                    <span className="text-[9px] text-emerald-400/60 font-semibold block mt-0.5">Paket Sukses</span>
                  </div>
                  <div className="px-2 border-l border-emerald-800/60">
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block">Poin Rewards</span>
                    <span className="text-2xl font-black block mt-1 tracking-tight text-yellow-400 font-mono">1.250</span>
                    <span className="text-[9px] text-yellow-400/60 font-semibold block mt-0.5">Dapat Ditukar</span>
                  </div>
                  <div className="px-2 border-l border-emerald-800/60">
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block">Voucher</span>
                    <span className="text-2xl font-black block mt-1 tracking-tight text-emerald-300 font-mono">3</span>
                    <span className="text-[9px] text-emerald-400/60 font-semibold block mt-0.5">Siap Dipakai</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div className="lg:col-span-5 space-y-8">
                  <div className={`bg-white rounded-[2rem] p-6 sm:p-8 transition-all duration-300 ${
                    isEditingProfile 
                      ? "border-2 border-blue-500 shadow-[0_10px_35px_rgba(59,130,246,0.15)]" 
                      : "border border-gray-150 shadow-sm"
                  }`}>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                      <h3 className="text-base font-black text-gray-900">Detail Akun</h3>
                      {isEditingProfile && (
                        <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">Mode Edit</span>
                      )}
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">🛡️ Kelengkapan Profil</span>
                        <span className="text-green-700 font-extrabold">90%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-[90%] h-full bg-green-600 rounded-full"></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Verifikasi nomor HP untuk mendapatkan perlindungan extra.</p>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        startTransition(async () => {
                          const res = await updateUserProfile(sessionUser.id, {
                            name: tempCustName,
                            email: tempCustEmail,
                            phone: tempCustPhone,
                            address: tempCustAddr
                          });
                          if (res.success) {
                            setCustomerName(tempCustName);
                            setCustomerEmail(tempCustEmail);
                            setCustomerPhone(tempCustPhone);
                            setCustomerAddress(tempCustAddr);
                            setIsEditingProfile(false);
                            triggerToast("Profil pelanggan sukses disimpan!", "success");
                          } else {
                            triggerToast(res.error || "Gagal memperbarui profil", "info");
                          }
                        });
                      }} 
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </span>
                          <input 
                            type="text" 
                            value={isEditingProfile ? tempCustName : customerName}
                            onChange={e => setTempCustName(e.target.value)}
                            disabled={!isEditingProfile}
                            required
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                              isEditingProfile ? "bg-white border-gray-200 text-gray-900" : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Akun</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input 
                            type="email" 
                            value={isEditingProfile ? tempCustEmail : customerEmail}
                            onChange={e => setTempCustEmail(e.target.value)}
                            disabled={!isEditingProfile}
                            required
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                              isEditingProfile ? "bg-white border-gray-200 text-gray-900" : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nomor Handphone</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </span>
                          <input 
                            type="text" 
                            value={isEditingProfile ? tempCustPhone : customerPhone}
                            onChange={e => setTempCustPhone(e.target.value)}
                            disabled={!isEditingProfile}
                            required
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                              isEditingProfile ? "bg-white border-gray-200 text-gray-900" : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Alamat Utama Asal</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-5 text-gray-400 select-none pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                          <textarea 
                            rows={3}
                            value={isEditingProfile ? tempCustAddr : customerAddress}
                            onChange={e => setTempCustAddr(e.target.value)}
                            disabled={!isEditingProfile}
                            required
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all ${
                              isEditingProfile ? "bg-white border-gray-200 text-gray-900" : "bg-gray-50 border-gray-150 text-gray-500 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex gap-2">
                        {!isEditingProfile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProfile(true);
                              setTempCustName(customerName);
                              setTempCustEmail(customerEmail);
                              setTempCustPhone(customerPhone);
                              setTempCustAddr(customerAddress);
                            }}
                            className="w-full bg-[#65A657] hover:bg-[#58964b] text-white font-extrabold py-3.5 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <span>✏️</span> <span>Edit Informasi Profil</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="submit"
                              disabled={isPending}
                              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-extrabold py-3 rounded-xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isPending ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingProfile(false);
                                triggerToast("Perubahan profil dibatalkan", "info");
                              }}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl text-xs transition-all border border-gray-200 active:scale-95"
                            >
                              Batal
                            </button>
                          </>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-8">
                  
                  <div className="bg-white border border-gray-150 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                      <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <span>📖</span> Buku Alamat Pengiriman
                      </h3>
                      <button
                        onClick={() => setShowAddAddress(!showAddAddress)}
                        className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all border ${
                          showAddAddress 
                            ? "bg-red-50 text-red-655 border-red-200 hover:bg-red-100" 
                            : "bg-[#F0F7F1] text-green-700 border-green-200/50 hover:bg-green-100"
                        }`}
                      >
                        {showAddAddress ? "Batal" : "+ Alamat Baru"}
                      </button>
                    </div>

                    {showAddAddress && (
                      <form onSubmit={handleAddAddress} className="bg-gray-50 border border-gray-150 rounded-2xl p-5 space-y-4 animate-fade-in">
                        <h4 className="font-extrabold text-xs text-gray-900">Tambah Alamat Baru</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Label Alamat *</label>
                            <input 
                              type="text" 
                              placeholder="Contoh: Kantor Cabang" 
                              value={newLabel} 
                              onChange={e => setNewLabel(e.target.value)}
                              required
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs outline-none bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Kontak *</label>
                            <input 
                              type="text" 
                              placeholder="Contoh: John Doe" 
                              value={newContact} 
                              onChange={e => setNewContact(e.target.value)}
                              required
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs outline-none bg-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">No. HP Kontak *</label>
                            <input 
                              type="text" 
                              placeholder="08XXXXXXXXXX" 
                              value={newPhone} 
                              onChange={e => setNewPhone(e.target.value)}
                              required
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs outline-none bg-white font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap *</label>
                          <input 
                            type="text" 
                            placeholder="Jl. Jenderal Sudirman No. 12, Jakarta" 
                            value={newDetails} 
                            onChange={e => setNewDetails(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs outline-none bg-white font-bold"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#65A657] hover:bg-[#58964b] text-white text-xs font-extrabold py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          Simpan Alamat ke Buku
                        </button>
                      </form>
                    )}

                    <div className="space-y-4">
                      {addresses.map(addr => (
                        <div 
                          key={addr.id} 
                          className={`p-5 rounded-2xl border transition-all relative ${
                            addr.label.includes("Utama") 
                              ? "bg-[#F0F7F1]/30 border-green-300 shadow-sm" 
                              : "bg-white border-gray-150 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                addr.label.includes("Utama") 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {addr.label}
                              </span>
                              {addr.label.includes("Utama") && (
                                <span className="text-[10px] text-green-700 font-bold flex items-center gap-0.5">
                                  <span>⭐</span> Asal Default
                                </span>
                              )}
                            </div>
                            
                            {!addr.label.includes("Utama") && (
                              <button
                                onClick={() => {
                                  setAddresses(prev => prev.map(a => {
                                    if (a.id === addr.id) return { ...a, label: `${a.label.replace(" (Utama)", "")} (Utama)` };
                                    return { ...a, label: a.label.replace(" (Utama)", "") };
                                  }));
                                  setCustomerAddress(addr.details);
                                  triggerToast(`Alamat ${addr.label} diset menjadi default!`, "success");
                                }}
                                className="text-[10px] text-[#488746] hover:underline font-extrabold"
                              >
                                Set Utama
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-start gap-2.5 text-xs text-gray-800 font-bold mb-1.5">
                            <span>👤</span>
                            <span>{addr.contact} • <span className="text-gray-400 font-medium">{addr.phone}</span></span>
                          </div>
                          <div className="flex items-start gap-2.5 text-[11px] text-gray-500 leading-relaxed pl-6">
                            <span>📍</span>
                            <span>{addr.details}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-150 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                    <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3.5 flex items-center gap-2">
                      <span>🎟️</span> Voucher & Kupon Saya
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="border border-dashed border-green-300 bg-green-50/15 rounded-2xl p-4 flex flex-col justify-between h-[125px] relative overflow-hidden group">
                        <div className="absolute right-[-15px] bottom-[-15px] text-green-700/10 text-5xl font-black select-none pointer-events-none group-hover:scale-110 transition-transform">🏷️</div>
                        <div>
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Free Shipping</span>
                          <h4 className="font-extrabold text-[13px] text-gray-800 mt-1.5 leading-snug">Gratis Ongkir s.d. 20rb</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Min. berat 2kg • S.d. 12 Jun 2026</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <code className="text-xs font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">ONGKIRBEBAS</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("ONGKIRBEBAS");
                              triggerToast("Voucher ONGKIRBEBAS berhasil disalin!", "success");
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors active:scale-95 shadow-sm"
                          >
                            Salin
                          </button>
                        </div>
                      </div>

                      <div className="border border-dashed border-amber-300 bg-amber-50/10 rounded-2xl p-4 flex flex-col justify-between h-[125px] relative overflow-hidden group">
                        <div className="absolute right-[-15px] bottom-[-15px] text-amber-700/10 text-5xl font-black select-none pointer-events-none group-hover:scale-110 transition-transform">🏷️</div>
                        <div>
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Discount 15%</span>
                          <h4 className="font-extrabold text-[13px] text-gray-800 mt-1.5 leading-snug">Diskon Same Day & Express</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Potongan maks. 50rb • S.d 30 Jun 2026</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <code className="text-xs font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">CARGOGOLD</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("CARGOGOLD");
                              triggerToast("Voucher CARGOGOLD berhasil disalin!", "success");
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors active:scale-95 shadow-sm"
                          >
                            Salin
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="bg-white border border-gray-150 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                    <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3.5 flex items-center gap-2">
                      <span>🕒</span> Riwayat Pengiriman Terakhir
                    </h3>

                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-extrabold text-base select-none">
                            📦
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-800 tracking-tight">JNT948271ID</span>
                              <span className="text-[9px] text-gray-400 font-bold">02 Jun 2026</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tujuan: Ibu Yani, Sleman • 1.2 kg</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-gray-800 block">Rp 12.000</span>
                          <span className="inline-block bg-green-50 text-green-700 border border-green-100 rounded-full text-[9px] font-black px-2 py-0.5 mt-0.5 uppercase tracking-wide">
                            Selesai
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-extrabold text-base select-none">
                            📦
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-800 tracking-tight">JNT204859ID</span>
                              <span className="text-[9px] text-gray-400 font-bold">02 Jun 2026</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tujuan: Pak Budi, Sleman • 2.5 kg</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-gray-800 block">Rp 25.000</span>
                          <span className="inline-block bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-black px-2 py-0.5 mt-0.5 uppercase tracking-wide">
                            Diproses
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-extrabold text-base select-none">
                            📦
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-800 tracking-tight">JNT194820ID</span>
                              <span className="text-[9px] text-gray-400 font-bold">01 Jun 2026</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tujuan: Toko Soka, Babarsari • 4.0 kg</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-gray-800 block">Rp 40.000</span>
                          <span className="inline-block bg-green-50 text-green-700 border border-green-100 rounded-full text-[9px] font-black px-2 py-0.5 mt-0.5 uppercase tracking-wide">
                            Selesai
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Mock Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-5 right-5 w-[320px] h-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[90] flex flex-col justify-between overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="bg-[#65A657] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-xs font-extrabold leading-tight">Kurir Pengantar</p>
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
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-[11px] font-bold my-auto p-4 leading-relaxed">
                Belum ada pesan. Kirim pesan untuk mulai menanyakan posisi paket Anda.
              </div>
            ) : (
              chatMessages.map((msg, index) => (
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
              ))
            )}
          </div>

          {/* Input Area */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              const newMsg = { sender: "me", text: chatInput, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
              setChatMessages(prev => [...prev, newMsg]);
              setChatInput("");
              
              // Simple mock replies from courier
              setTimeout(() => {
                const replies = [
                  "Halo kak, paket Anda sudah di jalan. Estimasi sampai 15 menit lagi ya.",
                  "Siap, saya sedang menuju ke alamat Anda.",
                  "Mohon ditunggu ya, saya masih di sekitar jalan utama.",
                  "Paket nanti akan saya titipkan di pos satpam sesuai notes ya kak.",
                ];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                setChatMessages(prev => [...prev, {
                  sender: "courier",
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

      {isResiModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
          <div id="print-area" className="bg-white rounded-[2rem] border border-gray-150 p-6 sm:p-8 w-full max-w-[550px] shadow-2xl relative max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:max-h-none print:overflow-visible">
            {/* Close button - hidden in print */}
            <button 
              onClick={() => setIsResiModalOpen(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-gray-50 border border-gray-150 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-150 transition-colors print:hidden"
            >
              ✕
            </button>

            {/* Brand Header */}
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-wider block w-fit mb-1.5">
                  Resi Bukti Pengiriman
                </span>
                <h3 className="text-xl font-black text-gray-950">CargoKu <span className="text-green-700">Lite</span></h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold">TANGGAL KIRIM</p>
                <p className="text-xs font-extrabold text-gray-800">
                  {trackedDetails?.delivery?.created_at 
                    ? new Date(trackedDetails.delivery.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                  }
                </p>
              </div>
            </div>

            {/* Barcode Mockup */}
            <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
              <div className="flex gap-[2px] h-10 items-stretch opacity-80 mb-2">
                {[1,3,2,1,4,2,1,3,2,1,2,4,1,2,3,1,2,4,1,2,1,3,2,1,4,2].map((w, i) => (
                  <div key={i} className="bg-black" style={{ width: `${w}px` }}></div>
                ))}
              </div>
              <span className="font-mono text-sm font-black tracking-[0.25em] text-gray-800">{trackedResi}</span>
            </div>

            {/* Delivery Status */}
            <div className="flex items-center justify-between p-4 rounded-2xl mb-6 bg-green-50/40 border border-green-100">
              <div>
                <span className="text-[9px] font-extrabold text-gray-400 block uppercase">Status Terkini</span>
                <span className="font-extrabold text-sm text-green-950">
                  {trackedDetails?.delivery?.status || "Tersedia"}
                </span>
              </div>
              <span className="bg-green-700 text-white font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                {trackedDetails?.delivery?.ship_service || "Cargo Reguler"}
              </span>
            </div>

            {/* Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-gray-100 pb-5 mb-5 text-xs">
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">PENGIRIM</h4>
                <p className="font-extrabold text-gray-900">{trackedDetails?.delivery?.sender || "Gudang Jakarta"}</p>
                <p className="text-gray-400 font-bold mt-0.5">{trackedDetails?.delivery?.sender_phone || "021-998877"}</p>
                <p className="text-gray-600 mt-1.5 leading-relaxed">{trackedDetails?.delivery?.sender_address || "Jakarta Timur"}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">PENERIMA</h4>
                <p className="font-extrabold text-gray-900">{trackedDetails?.delivery?.customer || "Toko Maju Jaya"}</p>
                <p className="text-gray-400 font-bold mt-0.5">{trackedDetails?.delivery?.phone || "0899887766"}</p>
                <p className="text-gray-600 mt-1.5 leading-relaxed">{trackedDetails?.delivery?.address || "Bandung, Jawa Barat"}</p>
              </div>
            </div>

            {/* Item Details */}
            <div className="border-b border-gray-100 pb-5 mb-5 text-xs space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">RINCIAN BARANG</h4>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Nama Barang</span>
                <span className="font-extrabold text-gray-900">{trackedDetails?.delivery?.item_name || "Komponen Elektronik"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Berat Barang</span>
                <span className="font-extrabold text-gray-900">{trackedDetails?.delivery?.weight ? `${trackedDetails.delivery.weight} kg` : "2.8 kg"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Metode Layanan</span>
                <span className="font-extrabold text-gray-900">{trackedDetails?.delivery?.ship_service || "Cargo Reguler"}</span>
              </div>
            </div>

            {/* Cost & Payment Details */}
            <div className="bg-[#FAF7ED] border border-orange-100 p-5 rounded-2xl flex items-center justify-between mb-6">
              <div>
                <span className="text-[9px] font-bold text-gray-400 block uppercase font-extrabold tracking-wider">Total Pembayaran</span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {trackedDetails?.delivery?.notes?.includes("COD") ? "Bayar di Tempat (COD)" : "Lunas (Non-COD)"}
                </span>
              </div>
              <span className="text-lg font-black text-green-800">
                Rp {trackedDetails?.delivery?.price ? trackedDetails.delivery.price.toLocaleString("id-ID") : "0"}
              </span>
            </div>

            {/* Action Buttons - hidden in print */}
            <div className="flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#65A657] hover:bg-[#58964b] text-white text-xs font-bold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                🖨️ Cetak Resi
              </button>
              <button
                onClick={() => setIsResiModalOpen(false)}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold py-3.5 rounded-xl border border-gray-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full text-center py-6 border-t border-gray-100 bg-white mt-12">
        <p className="text-xs text-gray-400 font-bold">© 2026 CargoKu Lite. Kepercayaan Logistik Anda.</p>
      </footer>

      <style jsx global>{`
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
