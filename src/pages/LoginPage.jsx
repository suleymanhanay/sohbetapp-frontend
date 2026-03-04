import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, ArrowRight, Shield, Hexagon } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async () => {
    if (!username || !password) return toast.error("Tüm alanları doldurun");
    setLoading(true);
    try { await login(username, password); nav("/"); }
    catch (e) { toast.error(e.response?.data?.error || "Giriş başarısız"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{background:"#09090B"}}>
      {/* Subtle ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.04]" style={{background:"radial-gradient(ellipse, #10B981, transparent 70%)"}}/>

      <div className="w-full max-w-[400px] relative z-10 slide-up">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <Hexagon size={20} className="text-emerald-400" strokeWidth={2.5}/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">NEXUS</h1>
            <p className="text-[10px] mono text-zinc-600 tracking-wider">FİNANS TOPLULUĞU</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Kullanıcı adı</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="inp" placeholder="kullaniciadi" autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Şifre</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                className="inp pr-10" placeholder="••••••••" />
              <button onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button onClick={submit} disabled={loading}
            className="w-full py-3 btn-primary rounded-xl flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Bağlanıyor…</>
            ) : (
              <>Giriş Yap<ArrowRight size={16}/></>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-700">
            <Shield size={11} className="text-emerald-600"/>
            <span className="mono">E2E ENCRYPTED</span>
          </div>
          <Link to="/register" className="text-[13px] text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
            Kayıt Ol →
          </Link>
        </div>
      </div>
    </div>
  );
}
