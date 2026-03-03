import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, MessageCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username || !password) return toast.error("Tum alanlari doldurun");
    setLoading(true);
    try { await login(username, password); toast.success("Hos geldiniz!"); navigate("/"); }
    catch (err) { toast.error(err.response?.data?.error || "Giris basarisiz"); }
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
            <div className="text-center mb-8"><h2 className="text-[#e9edef] text-xl font-bold mb-1">Giris Yap</h2><p className="text-[#8696a0] text-sm">Mesajlasmaya baslamak icin giris yapin</p></div>
            <div className="space-y-5">
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Kullanici Adi</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-3 bg-[#2a3942] rounded-xl text-[#e9edef] text-base focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0] transition-all" placeholder="kullaniciadi"/></div>
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Sifre</label><div className="relative"><input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} className="w-full px-4 py-3 bg-[#2a3942] rounded-xl text-[#e9edef] text-base focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0] pr-12 transition-all" placeholder="********"/><button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#00a884] p-1">{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#00a884] to-[#25d366] hover:from-[#008069] hover:to-[#00a884] disabled:opacity-50 text-white font-bold rounded-xl text-sm uppercase tracking-wider mt-2 active:scale-[0.98] transition-all shadow-lg shadow-[#00a884]/20">{loading?<span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Giris yapiliyor...</span>:"Giris Yap"}</button>
            </div>
            <div className="mt-6 pt-5 border-t border-[#2a3942] text-center"><p className="text-[#8696a0] text-sm">Hesabiniz yok mu? <Link to="/register" className="text-[#00a884] hover:text-[#25d366] font-bold transition-colors">Kayit Ol</Link></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
