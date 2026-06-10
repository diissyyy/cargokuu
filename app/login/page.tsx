"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { login } from "@/app/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        const pwdInput = document.getElementById('password') as HTMLInputElement;
        if (pwdInput) pwdInput.value = '';
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex w-[55%] flex-col p-12 lg:px-24 lg:py-16 relative overflow-hidden">
        <div className="z-10 mt-4">
          <Image 
            src="/asset/logo.png" 
            alt="CargoKu Logo" 
            width={350} 
            height={120} 
            className="h-[72px] lg:h-[96px] w-auto object-contain origin-left mb-6"
            priority
          />
          <p className="text-[1.1rem] text-gray-800 font-medium z-10 w-full relative tracking-wide">
            Platform Tracking Logistik Terpercaya
          </p>
        </div>
        
        <div className="absolute bottom-0 right-[-15px] lg:right-[-20px] w-[110%] lg:w-[112%] pointer-events-none">
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

      <div className="w-full lg:w-[45%] bg-[#488746] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[460px] bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl">
          <h2 className="text-[32px] font-extrabold text-gray-900 mb-1.5 tracking-tight">Selamat Datang!</h2>
          <p className="text-gray-500 tracking-tight mb-8 text-[13px] sm:text-[14px] font-medium leading-relaxed">
            Masuk untuk melanjutkan tracking paket Anda
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-100 text-red-600 text-[13px] rounded-xl font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2">
                Email
              </label>
              <input 
                name="email"
                type="email" 
                required
                suppressHydrationWarning
                placeholder="Masukkan email" 
                className="w-full px-4 py-[14px] rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2">
                Password
              </label>
              <input 
                id="password"
                name="password"
                type="password" 
                required
                suppressHydrationWarning
                placeholder="Masukkan password" 
                className="w-full px-4 py-[14px] rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A657] focus:border-transparent transition-all placeholder:text-gray-400 font-medium"
              />
            </div>

            <div className="flex justify-end pt-1 pb-1.5">
              <Link href="#" className="text-[13px] text-[#5aa14d] hover:text-[#488746] font-bold transition-colors">
                Lupa kata sandi?
              </Link>
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              suppressHydrationWarning
              className="w-full bg-[#65A657] hover:bg-[#58964b] disabled:bg-[#8ec283] active:scale-[0.98] transition-all text-white font-bold py-[15px] rounded-xl shadow-sm tracking-wide text-sm mt-1.5 mb-2"
            >
              {isPending ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="px-5 text-[12px] text-gray-400 font-medium tracking-wide">atau masuk dengan</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button 
              suppressHydrationWarning
              className="flex-1 flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3.5 rounded-xl transition-all text-[13px] tracking-wide"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button 
              suppressHydrationWarning
              className="flex-1 flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3.5 rounded-xl transition-all text-[13px] tracking-wide"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.67.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.85 1.95-1.57 3.14-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#000000"/>
              </svg>
              Apple
            </button>
          </div>

          <p className="text-center text-[13px] text-gray-500 mt-8 font-medium">
            Belum punya akun? <Link href="/register" className="text-[#5aa14d] font-bold hover:underline">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
