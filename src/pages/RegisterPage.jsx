import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, UserPlus, Shield } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();
  const submit = async () => {
    if (!username || !password) return toast.error("Zorunlu alanlari doldurun");
    setLoading(true);
    try { await register(username, password, displayName || username); toast.success("Hesap olusturuldu!"); nav("/"); }
    catch (e) { toast.error(e.response?.data?.error || "Kayit basarisiz"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "#06080f" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(240,185,11,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,11,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06] blur-[100px]" style={{ background: "#00DC82" }} />

      <div className="w-full max-w-[440px] relative z-10 slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "linear-gradient(135deg,#00DC82,#22D3EE)", boxShadow: "0 0 40px rgba(0,220,130,0.15)" }}>
            <UserPlus size={30} color="#06080f" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gold-gradient">Hesap Olustur</h1>
          <p className="text-sm mt-2 font-mono tracking-wider" style={{ color: "#3d4b63" }}>TOPLULUGA KATILIN</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: "1px solid rgba(0,220,130,0.08)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#FF4757" }} />
            <div className="w-2 h-2 rounded-full" style={{ background: "#F0B90B" }} />
            <div className="w-2 h-2 rounded-full" style={{ background: "#00DC82" }} />
            <span className="ml-2 text-[10px] font-mono tracking-wider" style={{ color: "#3d4b63" }}>NEW ACCOUNT</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest mb-2" style={{ color: "#6b7994" }}>KULLANICI_ADI *</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="inp" placeholder="kullaniciadi" />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest mb-2" style={{ color: "#6b7994" }}>GORUNEN_AD</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="inp" placeholder="Ad Soyad (opsiyonel)" />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest mb-2" style={{ color: "#6b7994" }}>SIFRE *</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} className="inp pr-11" placeholder="••••••••" />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#3d4b63" }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={submit} disabled={loading} className="w-full py-3.5 btn-gold rounded-xl text-sm tracking-wider">
              {loading ? "OLUSTURULUYOR..." : "KAYIT OL"}
            </button>
          </div>

          <div className="mt-6 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(240,185,11,0.06)" }}>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#3d4b63" }}>
              <Shield size={12} style={{ color: "#00DC82" }} />Guvenli
            </div>
            <Link to="/login" className="text-sm font-semibold" style={{ color: "#F0B90B" }}>
              ← Giris Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
