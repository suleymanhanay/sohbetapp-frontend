import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, MessageCircle } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username||!password) return toast.error("Kullanici adi ve sifre gerekli");
    if (username.length<3) return toast.error("Kullanici adi en az 3 karakter");
    if (password.length<4) return toast.error("Sifre en az 4 karakter");
    setLoading(true);
    try { await register(username, password, displayName||username); toast.success("Kayit basarili!"); navigate("/"); }
    catch (err) { toast.error(err.response?.data?.error || "Kayit basarisiz"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col">
      <div className="h-[200px] bg-gradient-to-r from-[#00a884] to-[#25d366] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><MessageCircle size={28} className="text-white" /></div>
          <div><h1 className="text-white text-2xl font-extrabold tracking-wider">SOHBETAPP</h1><p className="text-white/70 text-xs font-medium">Gercek zamanli mesajlasma</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center -mt-14 px-4 pb-8">
        <div className="w-full max-w-[440px] bg-[#1f2c33] rounded-xl shadow-2xl shadow-black/50 overflow-hidden border border-[#2a3942]/50">
          <div className="p-8 pt-10">
            <div className="text-center mb-8"><h2 className="text-[#e9edef] text-xl font-bold mb-1">Kayit Ol</h2><p className="text-[#8696a0] text-sm">Ucretsiz hesap olusturun</p></div>
            <div className="space-y-4">
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Kullanici Adi</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-3 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0]" placeholder="kullaniciadi"/></div>
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Gorunen Ad</label><input type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full px-4 py-3 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0]" placeholder="Ad Soyad (opsiyonel)"/></div>
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Sifre</label><div className="relative"><input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} className="w-full px-4 py-3 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0] pr-12" placeholder="********"/><button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#00a884] p-1">{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#00a884] to-[#25d366] hover:from-[#008069] hover:to-[#00a884] disabled:opacity-50 text-white font-bold rounded-xl text-sm uppercase tracking-wider mt-2 active:scale-[0.98] transition-all shadow-lg shadow-[#00a884]/20">{loading?"Kayit yapiliyor...":"Kayit Ol"}</button>
            </div>
            <div className="mt-6 pt-5 border-t border-[#2a3942] text-center"><p className="text-[#8696a0] text-sm">Zaten hesabiniz var mi? <Link to="/login" className="text-[#00a884] hover:text-[#25d366] font-bold">Giris Yap</Link></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
