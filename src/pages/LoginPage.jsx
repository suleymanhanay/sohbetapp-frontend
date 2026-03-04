import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight, Shield } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const submit = async () => {
    if (!username || !password) return toast.error("Tum alanlari doldurun");
    setLoading(true);
    try { await login(username, password); nav("/"); }
    catch (e) { toast.error(e.response?.data?.error || "Giris basarisiz"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "#06080f" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(240,185,11,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,11,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.08] blur-[100px]" style={{ background: "radial-gradient(ellipse, #F0B90B 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[80px]" style={{ background: "#00DC82" }} />

      <div className="w-full max-w-[440px] relative z-10 slide-up">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "linear-gradient(135deg,#F0B90B,#FCD535)", boxShadow: "0 0 40px rgba(240,185,11,0.2)" }}>
            <Zap size={32} color="#06080f" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gold-gradient">FinansChat</h1>
          <p className="text-sm mt-2 font-mono tracking-wider" style={{ color: "#3d4b63" }}>FINANS TOPLULUGU PLATFORMU</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: "1px solid rgba(240,185,11,0.06)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#FF4757" }} />
            <div className="w-2 h-2 rounded-full" style={{ background: "#F0B90B" }} />
            <div className="w-2 h-2 rounded-full" style={{ background: "#00DC82" }} />
            <span className="ml-2 text-[10px] font-mono tracking-wider" style={{ color: "#3d4b63" }}>SECURE LOGIN v5.0</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest mb-2" style={{ color: "#6b7994" }}>KULLANICI_ADI</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="inp" placeholder="kullaniciadi" autoFocus />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest mb-2" style={{ color: "#6b7994" }}>SIFRE</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} className="inp pr-11" placeholder="••••••••" />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors" style={{ color: "#3d4b63" }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={submit} disabled={loading} className="w-full py-3.5 btn-gold rounded-xl text-sm tracking-wider flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />BAGLANIYOR...</> : <>GIRIS YAP<ArrowRight size={16} /></>}
            </button>
          </div>

          <div className="mt-6 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(240,185,11,0.06)" }}>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#3d4b63" }}>
              <Shield size={12} style={{ color: "#00DC82" }} />256-bit SSL
            </div>
            <Link to="/register" className="text-sm font-semibold transition-colors" style={{ color: "#F0B90B" }}>
              Kayit Ol →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
