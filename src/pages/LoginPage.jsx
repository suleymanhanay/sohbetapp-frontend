import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

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
      <div className="h-[200px] bg-[#00a884] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="w-11 h-11" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="22" fill="rgba(255,255,255,0.15)"/><path d="M50 20c-16.57 0-30 12.54-30 28.01 0 5.25 1.56 10.13 4.24 14.25L20 80l18.38-4.82A30.5 30.5 0 0050 76.02C66.57 76.02 80 63.48 80 47.01S66.57 20 50 20z" fill="white" opacity="0.9"/></svg>
          <h1 className="text-white text-2xl font-extrabold tracking-wider">SOHBETAPP</h1>
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center -mt-14 px-4 pb-8">
        <div className="w-full max-w-[440px] bg-[#1f2c33] rounded-lg shadow-2xl overflow-hidden">
          <div className="p-8 pt-10">
            <div className="text-center mb-8">
              <h2 className="text-[#e9edef] text-xl font-bold mb-1">Giris Yap</h2>
              <p className="text-[#8696a0] text-sm">Mesajlasmaya baslamak icin giris yapin</p>
            </div>
            <div className="space-y-5">
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Kullanici Adi</label>
                <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#2a3942] text-[#e9edef] text-base focus:outline-none focus:border-[#00a884] transition-colors placeholder-[#8696a0]" placeholder="kullaniciadi"/></div>
              <div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Sifre</label>
                <div className="relative"><input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#2a3942] text-[#e9edef] text-base focus:outline-none focus:border-[#00a884] transition-colors placeholder-[#8696a0] pr-10" placeholder="********"/>
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#00a884] p-2">{showPass?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 text-white font-bold rounded-lg text-sm uppercase tracking-wider mt-2 active:scale-[0.98] transition-all">{loading?"Giris yapiliyor...":"Giris Yap"}</button>
            </div>
            <div className="mt-6 pt-5 border-t border-[#2a3942] text-center"><p className="text-[#8696a0] text-sm">Hesabiniz yok mu? <Link to="/register" className="text-[#00a884] hover:underline font-bold">Kayit Ol</Link></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
