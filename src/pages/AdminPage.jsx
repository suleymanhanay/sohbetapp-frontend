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

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab==="dashboard") { const r = await api.get("/admin/stats"); setStats(r.data.stats); }
      else if (tab==="users") { const r = await api.get("/admin/users"); setUsers(r.data.users); }
      else if (tab==="messages") { const r = await api.get(`/admin/messages?type=${msgType}&limit=200`); setMessages(r.data.messages); }
    } catch { toast.error("Veri yuklenemedi"); }
    setLoading(false);
  };

  const toggleBlock = async (id) => { try { const r = await api.put(`/admin/users/${id}/block`); toast.success(r.data.message); setUsers(p=>p.map(u=>u.id===id?{...u,isBlocked:r.data.isBlocked}:u)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const changeRole = async (id, role) => { try { await api.put(`/admin/users/${id}/role`,{role}); toast.success("Rol degistirildi"); setUsers(p=>p.map(u=>u.id===id?{...u,role}:u)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const deleteUser = async (id) => { if (!confirm("Bu kullaniciyi silmek istediginizden emin misiniz?")) return; try { await api.delete(`/admin/users/${id}`); toast.success("Silindi"); setUsers(p=>p.filter(u=>u.id!==id)); } catch(e) { toast.error(e.response?.data?.error||"Hata"); } };
  const deleteMessage = async (id) => { try { await api.delete(`/admin/messages/${id}`); toast.success("Mesaj silindi"); setMessages(p=>p.filter(m=>m.id!==id)); } catch { toast.error("Silme hatasi"); } };

  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const StatCard = ({icon:Icon,label,value,color="brand"}) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50">
      <div className={`p-2.5 rounded-xl bg-${color}-500/10 w-fit mb-3`}><Icon size={20} className={`text-${color}-500`}/></div>
      <p className="text-2xl font-bold">{value??"-"}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme==="dark"?"dark":""}`}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>navigate("/")} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft size={20}/></button>
              <div className="flex items-center gap-2"><Shield className="text-amber-500" size={22}/><h1 className="text-lg font-bold">Admin Panel</h1></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button>
              <button onClick={loadData} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><RefreshCw size={18} className={loading?"animate-spin":""}/></button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex gap-2 mb-6">
            {[{id:"dashboard",label:"Dashboard",icon:BarChart3},{id:"users",label:"Kullanicilar",icon:Users},{id:"messages",label:"Mesajlar",icon:MessageSquare}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab===t.id?"bg-brand-600 text-white shadow-lg shadow-brand-600/20":"bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700/50"}`}><t.icon size={16}/>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-8">
          {loading&&<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}

          {tab==="dashboard"&&stats&&!loading&&(
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Toplam Kullanici" value={stats.totalUsers} color="brand"/>
                <StatCard icon={Activity} label="Cevrimici" value={stats.onlineUsers} color="emerald"/>
                <StatCard icon={MessageSquare} label="Toplam Mesaj" value={stats.totalMessages} color="violet"/>
                <StatCard icon={TrendingUp} label="Bugunki Mesaj" value={stats.todayMessages} color="amber"/>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50">
                  <h3 className="font-semibold mb-4">Son 7 Gun - Mesajlar</h3>
                  <div className="space-y-2">{(stats.dailyStats||[]).map((d,i)=>(
                    <div key={i} className="flex items-center gap-3"><span className="text-xs text-slate-500 w-20">{d.day?.slice(5)}</span><div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-5 overflow-hidden"><div className="bg-brand-500 h-full rounded-full" style={{width:`${Math.min((d.count/Math.max(...(stats.dailyStats||[]).map(s=>s.count),1))*100,100)}%`}}></div></div><span className="text-sm font-medium w-8 text-right">{d.count}</span></div>
                  ))}</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50">
                  <h3 className="font-semibold mb-4">Son 7 Gun - Yeni Kullanicilar</h3>
                  <div className="space-y-2">{(stats.dailyUsers||[]).map((d,i)=>(
                    <div key={i} className="flex items-center gap-3"><span className="text-xs text-slate-500 w-20">{d.day?.slice(5)}</span><div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-5 overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{width:`${Math.min((d.count/Math.max(...(stats.dailyUsers||[]).map(s=>s.count),1))*100,100)}%`}}></div></div><span className="text-sm font-medium w-8 text-right">{d.count}</span></div>
                  ))}</div>
                </div>
              </div>
            </div>
          )}

          {tab==="users"&&!loading&&(
            <div>
              <div className="mb-4"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Kullanici ara..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/></div></div>
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 dark:border-slate-700/50"><th className="text-left px-4 py-3 font-medium text-slate-500">Kullanici</th><th className="text-left px-4 py-3 font-medium text-slate-500">Rol</th><th className="text-left px-4 py-3 font-medium text-slate-500">Durum</th><th className="text-left px-4 py-3 font-medium text-slate-500">Kayit</th><th className="text-right px-4 py-3 font-medium text-slate-500">Islemler</th></tr></thead>
                  <tbody>{filteredUsers.map(u=>(
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3"><div className="flex items-center gap-3">{u.avatar?<img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt=""/>:<div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">{getInitials(u.displayName)}</div>}<div><p className="font-medium">{u.displayName||u.username}</p><p className="text-xs text-slate-500">@{u.username}</p></div></div></td>
                      <td className="px-4 py-3"><select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg border-0 focus:ring-1 focus:ring-brand-500" disabled={u.role==="admin"&&u.id!==user?.id}><option value="user">Kullanici</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${u.isBlocked?"bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400":u.status==="online"?"bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400":"bg-slate-100 dark:bg-slate-700 text-slate-500"}`}><div className={`w-1.5 h-1.5 rounded-full ${u.isBlocked?"bg-red-500":u.status==="online"?"bg-emerald-500":"bg-slate-400"}`}></div>{u.isBlocked?"Engelli":u.status==="online"?"Cevrimici":"Cevrimdisi"}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.createdAt?.slice(0,10)}</td>
                      <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">{u.role!=="admin"&&(<><button onClick={()=>toggleBlock(u.id)} className={`p-1.5 rounded-lg ${u.isBlocked?"text-emerald-500 hover:bg-emerald-500/10":"text-amber-500 hover:bg-amber-500/10"}`} title={u.isBlocked?"Engeli kaldir":"Engelle"}>{u.isBlocked?<UserCheck size={16}/>:<UserX size={16}/>}</button><button onClick={()=>deleteUser(u.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg" title="Sil"><Trash2 size={16}/></button></>)}</div></td>
                    </tr>))}</tbody>
                </table></div>
              </div>
            </div>
          )}

          {tab==="messages"&&!loading&&(
            <div>
              <div className="flex gap-2 mb-4">{["all","room","private"].map(t=>(<button key={t} onClick={()=>{setMsgType(t);setTimeout(loadData,100);}} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${msgType===t?"bg-brand-600 text-white":"bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"}`}>{t==="all"?"Tumu":t==="room"?"Genel":"Ozel"}</button>))}</div>
              <div className="space-y-2">{messages.map(msg=>(
                <div key={msg.id} className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium">{msg.senderDisplayName||msg.senderName}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${msg.msgType==="private"?"bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400":"bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>{msg.msgType==="private"?"Ozel":"Genel"}</span><span className="text-[10px] text-slate-500">{msg.createdAt?.replace("T"," ").slice(0,16)}</span></div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{msg.type==="image"?"Fotograf":msg.type==="voice"?"Sesli mesaj":truncate(msg.content,100)}</p>
                    {msg.deletedForAll===1&&<span className="text-xs text-red-500 italic">Silinmis</span>}</div>
                  {msg.deletedForAll!==1&&<button onClick={()=>deleteMessage(msg.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg shrink-0" title="Sil"><Trash2 size={16}/></button>}
                </div>
              ))}{messages.length===0&&<div className="text-center py-16 text-slate-500"><MessageSquare size={40} className="mx-auto mb-3 opacity-30"/><p>Mesaj bulunamadi</p></div>}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
