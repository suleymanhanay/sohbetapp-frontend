import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MessageSquare, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) return toast.error("Tum alanlari doldurun");
    setLoading(true);
    try { await login(username, password); toast.success("Hos geldiniz!"); navigate("/"); }
    catch (err) { toast.error(err.response?.data?.error || "Giris basarisiz"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-600/30"><MessageSquare className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-white mb-2">SohbetApp</h1>
          <p className="text-slate-400">Hesabiniza giris yapin</p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-5">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Kullanici Adi</label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" placeholder="kullaniciadi" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Sifre</label>
              <div className="relative">
                <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all pr-12" placeholder="********" />
                <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div></div>
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]">{loading?"Giris yapiliyor...":"Giris Yap"}</button>
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">Hesabiniz yok mu? <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Kayit Ol</Link></p>
        </div>
      </div>
    </div>
  );
}
