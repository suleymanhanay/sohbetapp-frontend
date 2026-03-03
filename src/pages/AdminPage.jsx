import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";
import { getInitials, truncate } from "../utils/helpers";
import toast from "react-hot-toast";
import { ArrowLeft, Users, MessageSquare, BarChart3, Trash2, Shield, UserX, UserCheck, Search, RefreshCw, Moon, Sun, TrendingUp, Activity } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [msgType, setMsgType] = useState("all");

  useEffect(() => { loadData(); }, [tab]);
  const loadData = async () => { setLoading(true); try { if (tab==="dashboard") { const r = await api.get("/admin/stats"); setStats(r.data.stats); } else if (tab==="users") { const r = await api.get("/admin/users"); setUsers(r.data.users); } else if (tab==="messages") { const r = await api.get(`/admin/messages?type=${msgType}&limit=200`); setMessages(r.data.messages); } } catch { toast.error("Veri yuklenemedi"); } setLoading(false); };
  const toggleBlock = async (id) => { try { const r = await api.put(`/admin/users/${id}/block`); toast.success(r.data.message); setUsers(p=>p.map(u=>u.id===id?{...u,isBlocked:r.data.isBlocked}:u)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const changeRole = async (id, role) => { try { await api.put(`/admin/users/${id}/role`,{role}); toast.success("Rol degistirildi"); setUsers(p=>p.map(u=>u.id===id?{...u,role}:u)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const deleteUser = async (id) => { if (!confirm("Silmek istediginizden emin misiniz?")) return; try { await api.delete(`/admin/users/${id}`); toast.success("Silindi"); setUsers(p=>p.filter(u=>u.id!==id)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const deleteMessage = async (id) => { try { await api.delete(`/admin/messages/${id}`); toast.success("Silindi"); setMessages(p=>p.filter(m=>m.id!==id)); } catch { toast.error("Hata"); } };
  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef]">
      <div className="fixed top-0 left-0 right-0 h-[127px] bg-[#00a884] z-0"></div>
      <div className="relative z-10">
        <div className="sticky top-0 z-30 bg-[#202c33] border-b border-[#2a3942]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3"><button onClick={() => navigate("/")} className="p-2 hover:bg-white/5 rounded-full"><ArrowLeft size={20} /></button><Shield className="text-[#00a884]" size={22} /><h1 className="text-lg font-bold">Admin Panel</h1></div>
            <div className="flex items-center gap-2"><button onClick={toggleTheme} className="p-2 hover:bg-white/5 rounded-full text-[#8696a0]">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><button onClick={loadData} className="p-2 hover:bg-white/5 rounded-full text-[#8696a0]"><RefreshCw size={18} className={loading?"animate-spin":""}/></button></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex gap-2 mb-6">{[{id:"dashboard",label:"Dashboard",icon:BarChart3},{id:"users",label:"Kullanicilar",icon:Users},{id:"messages",label:"Mesajlar",icon:MessageSquare}].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${tab===t.id?"bg-[#00a884] text-white shadow-lg":"bg-[#1f2c33] text-[#8696a0] hover:bg-[#2a3942] border border-[#2a3942]"}`}><t.icon size={16}/>{t.label}</button>))}</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {loading&&<div className="flex justify-center py-20"><div className="w-8 h-8 border-[3px] border-[#00a884] border-t-transparent rounded-full animate-spin"></div></div>}
          {tab==="dashboard"&&stats&&!loading&&(<div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[{icon:Users,label:"Toplam Kullanici",val:stats.totalUsers,c:"text-[#00a884] bg-[#00a884]/10"},{icon:Activity,label:"Cevrimici",val:stats.onlineUsers,c:"text-emerald-400 bg-emerald-400/10"},{icon:MessageSquare,label:"Toplam Mesaj",val:stats.totalMessages,c:"text-sky-400 bg-sky-400/10"},{icon:TrendingUp,label:"Bugun Mesaj",val:stats.todayMessages,c:"text-amber-400 bg-amber-400/10"},{icon:Users,label:"Gruplar",val:stats.totalGroups||0,c:"text-violet-400 bg-violet-400/10"},{icon:Activity,label:"Aktif Hikaye",val:stats.totalStories||0,c:"text-pink-400 bg-pink-400/10"}].map((s,i)=>(<div key={i} className="bg-[#1f2c33] rounded-xl p-5 border border-[#2a3942]"><div className={`p-2.5 rounded-lg w-fit mb-3 ${s.c}`}><s.icon size={20}/></div><p className="text-2xl font-bold">{s.val??"-"}</p><p className="text-sm text-[#8696a0] mt-0.5">{s.label}</p></div>))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">{[{title:"Son 7 Gun - Mesajlar",data:stats.dailyStats||[],c:"bg-[#00a884]"},{title:"Yeni Kullanicilar",data:stats.dailyUsers||[],c:"bg-emerald-500"}].map((ch,ci)=>(<div key={ci} className="bg-[#1f2c33] rounded-xl p-5 border border-[#2a3942]"><h3 className="font-bold mb-4 text-sm">{ch.title}</h3><div className="space-y-2.5">{ch.data.map((d,i)=>(<div key={i} className="flex items-center gap-3"><span className="text-xs text-[#8696a0] w-16">{d.day?.slice(5)}</span><div className="flex-1 bg-[#2a3942] rounded-full h-4 overflow-hidden"><div className={`${ch.c} h-full rounded-full`} style={{width:`${Math.min((d.count/Math.max(...ch.data.map(s=>s.count),1))*100,100)}%`}}></div></div><span className="text-sm font-bold w-8 text-right">{d.count}</span></div>))}</div></div>))}</div>
          </div>)}
          {tab==="users"&&!loading&&(<div>
            <div className="mb-4"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]"/><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Ara..." className="w-full pl-10 pr-4 py-2.5 bg-[#1f2c33] border border-[#2a3942] rounded-lg text-sm focus:outline-none focus:border-[#00a884] text-[#e9edef] placeholder-[#8696a0]"/></div></div>
            <div className="bg-[#1f2c33] rounded-xl border border-[#2a3942] overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#2a3942]"><th className="text-left px-4 py-3 font-bold text-[#8696a0] text-xs uppercase">Kullanici</th><th className="text-left px-4 py-3 font-bold text-[#8696a0] text-xs uppercase">Rol</th><th className="text-left px-4 py-3 font-bold text-[#8696a0] text-xs uppercase">Durum</th><th className="text-left px-4 py-3 font-bold text-[#8696a0] text-xs uppercase">Kayit</th><th className="text-right px-4 py-3 font-bold text-[#8696a0] text-xs uppercase">Islem</th></tr></thead><tbody>{filteredUsers.map(u=>(<tr key={u.id} className="border-b border-[#2a3942]/50 hover:bg-[#233138]/30"><td className="px-4 py-3"><div className="flex items-center gap-3">{u.avatar?<img src={u.avatar} className="w-9 h-9 rounded-full object-cover" alt=""/>:<div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-xs font-bold text-[#8696a0]">{getInitials(u.displayName)}</div>}<div><p className="font-bold">{u.displayName||u.username}</p><p className="text-xs text-[#8696a0]">@{u.username}</p></div></div></td><td className="px-4 py-3"><select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} className="text-xs px-2 py-1.5 bg-[#2a3942] text-[#e9edef] rounded-lg border-0 focus:ring-1 focus:ring-[#00a884]" disabled={u.role==="admin"&&u.id!==user?.id}><option value="user">Kullanici</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold ${u.isBlocked?"bg-red-500/10 text-red-400":u.status==="online"?"bg-[#00a884]/10 text-[#00a884]":"bg-[#2a3942] text-[#8696a0]"}`}><div className={`w-1.5 h-1.5 rounded-full ${u.isBlocked?"bg-red-400":u.status==="online"?"bg-[#00a884]":"bg-[#8696a0]"}`}></div>{u.isBlocked?"Engelli":u.status==="online"?"Cevrimici":"Cevrimdisi"}</span></td><td className="px-4 py-3 text-xs text-[#8696a0]">{u.createdAt?.slice(0,10)}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1">{u.role!=="admin"&&(<><button onClick={()=>toggleBlock(u.id)} className={`p-1.5 rounded-lg ${u.isBlocked?"text-[#00a884] hover:bg-[#00a884]/10":"text-amber-400 hover:bg-amber-400/10"}`}>{u.isBlocked?<UserCheck size={16}/>:<UserX size={16}/>}</button><button onClick={()=>deleteUser(u.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={16}/></button></>)}</div></td></tr>))}</tbody></table></div></div>
          </div>)}
          {tab==="messages"&&!loading&&(<div>
            <div className="flex gap-2 mb-4">{["all","room","private"].map(t=>(<button key={t} onClick={()=>{setMsgType(t);setTimeout(loadData,100);}} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${msgType===t?"bg-[#00a884] text-white":"bg-[#1f2c33] text-[#8696a0] border border-[#2a3942]"}`}>{t==="all"?"Tumu":t==="room"?"Genel":"Ozel"}</button>))}</div>
            <div className="space-y-2">{messages.map(msg=>(<div key={msg.id} className="bg-[#1f2c33] rounded-xl p-4 border border-[#2a3942] flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold">{msg.senderDisplayName||msg.senderName}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${msg.msgType==="private"?"bg-violet-500/10 text-violet-400":"bg-sky-500/10 text-sky-400"}`}>{msg.msgType==="private"?"Ozel":"Genel"}</span><span className="text-[10px] text-[#8696a0]">{msg.createdAt?.replace("T"," ").slice(0,16)}</span></div><p className="text-sm text-[#8696a0] truncate">{msg.type==="image"?"Fotograf":msg.type==="voice"?"Sesli mesaj":truncate(msg.content,100)}</p></div>{msg.deletedForAll!==1&&<button onClick={()=>deleteMessage(msg.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg shrink-0"><Trash2 size={16}/></button>}</div>))}{messages.length===0&&<div className="text-center py-16 text-[#8696a0]"><MessageSquare size={40} className="mx-auto mb-3 opacity-20"/><p>Mesaj bulunamadi</p></div>}</div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
