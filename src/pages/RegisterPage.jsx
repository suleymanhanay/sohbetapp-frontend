import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, UserPlus, Shield, Hexagon } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const submit = async () => {
    if (!username || !password) return toast.error("Zorunlu alanları doldurun");
    setLoading(true);
    try { await register(username, password, displayName || username); toast.success("Hoş geldiniz!"); nav("/"); }
    catch (e) { toast.error(e.response?.data?.error || "Kayıt başarısız"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{background:"#09090B"}}>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.04]" style={{background:"radial-gradient(ellipse, #3B82F6, transparent 70%)"}}/>

      <div className="w-full max-w-[400px] relative z-10 slide-up">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <UserPlus size={20} className="text-blue-400" strokeWidth={2}/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">Hesap Oluştur</h1>
            <p className="text-[10px] mono text-zinc-600 tracking-wider">NEXUS TOPLULUĞUNA KATILIN</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Kullanıcı adı <span className="text-rose-500">*</span></label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="inp" placeholder="kullaniciadi" autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Görünen ad</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="inp" placeholder="Ad Soyad (opsiyonel)" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Şifre <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()} className="inp pr-10" placeholder="••••••••" />
              <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button onClick={submit} disabled={loading} className="w-full py-3 btn-primary rounded-xl text-[13px]">
            {loading ? "Oluşturuluyor…" : "Kayıt Ol"}
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-700">
            <Shield size={11} className="text-emerald-600"/><span className="mono">SECURE</span>
          </div>
          <Link to="/login" className="text-[13px] text-emerald-500 hover:text-emerald-400 font-medium">← Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
}
