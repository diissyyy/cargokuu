"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { register } from "@/app/auth/actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    const clearPasswords = () => {
      const pwdInput = document.getElementById('password') as HTMLInputElement;
      const confirmPwdInput = document.getElementById('confirmPassword') as HTMLInputElement;
      if (pwdInput) pwdInput.value = '';
      if (confirmPwdInput) confirmPwdInput.value = '';
    };

    if (password !== confirmPassword) {
      setError('Password dan Konfirmasi Password tidak cocok');
      clearPasswords();
      return;
    }

    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
        clearPasswords();
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full lg:w-[45%] bg-[#488746] flex items-center justify-center p-6 lg:p-12 z-20">
        <div className="w-full max-w-[460px] bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl">
          <h2 className="text-[28px] font-bold text-[#1E293B] mb-1 tracking-tight">Daftar Akun Baru</h2>
          <p className="text-[#64748B] tracking-tight mb-6 text-[13px] sm:text-[14px] font-medium leading-relaxed">
            Buat akun untuk mulai tracking paket Anda
          </p>

          <form className="space-y-[14px]" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-100 text-red-600 text-[13px] rounded-xl font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1.5">
                Nama Lengkap
              </label>
              <input 
                name="name"
                type="text" 
                required
                placeholder="Masukkan nama lengkap" 
                className="w-full px-4 py-[12px] rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1.5">
                Nomor HP
              </label>
              <input 
                name="phone"
                type="text" 
                required
                placeholder="08xxxxxxxxxxx" 
                className="w-full px-4 py-[12px] rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1.5">
                Email
              </label>
              <input 
                name="email"
                type="email" 
                required
                placeholder="nama@email.com" 
                className="w-full px-4 py-[12px] rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1.5">
                Password
              </label>
              <input 
                id="password"
                name="password"
                type="password" 
                required
                minLength={8}
                placeholder="Minimal 8 karakter" 
                className="w-full px-4 py-[12px] rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1.5">
                Konfirmasi Password
              </label>
              <input 
                id="confirmPassword"
                name="confirmPassword"
                type="password" 
                required
                minLength={8}
                placeholder="Ulangi password" 
                className="w-full px-4 py-[12px] rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1.5 pb-2">
              <div className="flex items-center h-5">
                <input 
                  type="checkbox" 
                  required
                  className="w-[15px] h-[15px] rounded border-gray-300 text-[#65A657] focus:ring-[#65A657]"
                />
              </div>
              <p className="text-[12px] text-gray-500 font-medium leading-snug tracking-tight">
                Saya setuju dengan <span className="text-[#65A657] font-bold">Syarat & Ketentuan</span> dan <span className="text-[#65A657] font-bold">Kebijakan Privasi</span>
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-[#65A657] hover:bg-[#58964b] disabled:bg-[#8ec283] active:scale-[0.98] transition-all text-white font-bold py-[14px] rounded-xl shadow-sm tracking-wide text-[13px]"
            >
              {isPending ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <p className="text-center text-[13px] text-gray-500 mt-6 font-medium">
            Sudah punya akun? <Link href="/login" className="text-[#65A657] font-bold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex w-[55%] flex-col relative pt-12 lg:pt-24 pb-0 px-0 bg-white overflow-hidden">
        <div className="z-10 mt-4 px-12 w-full flex justify-center">
          <Image 
            src="/asset/logo.png" 
            alt="CargoKu Logo" 
            width={350} 
            height={120} 
            className="h-[72px] lg:h-[96px] w-auto object-contain origin-center mb-6"
            priority
          />
        </div>
        
        <div className="absolute bottom-0 left-[-15px] lg:left-[-20px] w-[110%] lg:w-[112%] pointer-events-none">
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
  );
}
