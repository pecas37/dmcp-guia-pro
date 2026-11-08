import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Espera 2 segundos y empieza a desvanecerse
    const timer1 = setTimeout(() => setFadeOut(true), 2000);
    // Espera 0.5 segundos más (para la animación) y avisa que terminó
    const timer2 = setTimeout(() => onFinish(), 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}>
      <div className="relative flex flex-col items-center animate-pulse-slow">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase text-glow text-center">
          DMPC GUIA <br />
          <span className="text-blue-500 text-5xl md:text-7xl">PRO</span>
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-4 tracking-[0.3em] uppercase text-center">
          Cargando sistema...
        </p>
      </div>
      
      {/* Barra de carga decorativa */}
      <div className="mt-8 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 w-full animate-[loading_2s_ease-in-out_forwards]"></div>
      </div>
    </div>
  );
}