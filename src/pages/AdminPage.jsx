import{useState,useEffect}from"react";
import{useNavigate}from"react-router-dom";
import{useAuth}from"../context/AuthContext";
import api from"../utils/api";
import toast from"react-hot-toast";
import{Users,MessageSquare,Shield,Trash2,ArrowLeft,Ban,Activity,TrendingUp,UserX,Globe,Zap,BarChart3}from"lucide-react";

export default function AdminPage(){
  const{user}=useAuth();
  const nav=useNavigate();
  const[stats,setStats]=useState({});
  const[usrs,setUsrs]=useState([]);
  const[tab,setTab]=useState("stats");

  useEffect(()=>{api.get("/admin/stats").then(r=>setStats(r.data.stats||{})).catch(()=>{});api.get("/admin/users").then(r=>setUsrs(r.data.users||[])).catch(()=>{})},[]);

  const toggleBlock=async id=>{try{const r=await api.put("/admin/users/"+id+"/block");setUsrs(p=>p.map(u=>u.id===id?{...u,isBlocked:r.data.isBlocked}:u));toast.success(r.data.isBlocked?"Engellendi":"Engel kaldirildi")}catch{toast.error("Hata")}};
  const deleteUser=async id=>{if(!confirm("Emin misiniz?"))return;try{await api.delete("/admin/users/"+id);setUsrs(p=>p.filter(u=>u.id!==id));toast.success("Silindi")}catch{toast.error("Hata")}};
  const changeRole=async(id,role)=>{try{await api.put("/admin/users/"+id+"/role",{role});setUsrs(p=>p.map(u=>u.id===id?{...u,role}:u));toast.success("Guncellendi")}catch{toast.error("Hata")}};

  const cards=[
    {icon:Users,label:"TOPLAM KULLANICI",val:stats.totalUsers,color:"#F0B90B"},
    {icon:Activity,label:"CEVRIMICI",val:stats.onlineUsers,color:"#00DC82"},
    {icon:MessageSquare,label:"TOPLAM MESAJ",val:stats.totalMessages,color:"#22D3EE"},
    {icon:TrendingUp,label:"BUGUN MESAJ",val:stats.todayMessages,color:"#FCD535"},
    {icon:Globe,label:"GRUPLAR",val:stats.totalGroups,color:"#3B82F6"},
    {icon:BarChart3,label:"HIKAYELER",val:stats.totalStories,color:"#8B5CF6"},
  ];

  return(<div className="min-h-screen" style={{background:"#06080f"}}>
    {/* Header */}
    <div className="px-4 md:px-8 py-3 flex items-center justify-between" style={{background:"#0a0e18",borderBottom:"1px solid rgba(240,185,11,0.04)"}}>
      <div className="flex items-center gap-3">
        <button onClick={()=>nav("/")} className="p-2 rounded-xl text-[#6b7994] hover:text-[#F0B90B]"><ArrowLeft size={18}/></button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#F0B90B,#FCD535)"}}><Shield size={18} color="#06080f"/></div>
        <div><h1 className="font-bold text-[15px] text-[#e8eaed]">Admin Panel</h1><p className="text-[9px] font-mono text-[#3d4b63] tracking-wider">FINANSCHAT MANAGEMENT</p></div>
      </div>
      <div className="flex gap-1">
        {["stats","users"].map(t=>(<button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-[10px] font-mono font-bold tracking-wider transition-all ${tab===t?"btn-gold":"text-[#3d4b63] hover:text-[#F0B90B]"}`}>{t==="stats"?"DASHBOARD":"KULLANICILAR"}</button>))}
      </div>
    </div>

    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      {tab==="stats"&&<div className="grid grid-cols-2 md:grid-cols-3 gap-4 slide-up">{cards.map((c,i)=>(<div key={i} className="glass rounded-2xl p-5 hover:scale-[1.01] transition-transform group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${c.color}10`}}><c.icon size={18} style={{color:c.color}}/></div>
          <div className="w-8 h-4 rounded-full opacity-40" style={{background:`linear-gradient(90deg, transparent, ${c.color}20)`}}/>
        </div>
        <p className="text-3xl font-extrabold text-[#e8eaed] font-mono">{c.val ?? "—"}</p>
        <p className="text-[9px] font-mono font-bold tracking-[0.15em] mt-1.5" style={{color:c.color}}>{c.label}</p>
      </div>))}</div>}

      {tab==="users"&&<div className="glass rounded-2xl overflow-hidden slide-up">
        <div className="px-5 py-4 flex items-center justify-between" style={{borderBottom:"1px solid rgba(240,185,11,0.06)"}}>
          <div><p className="font-bold text-[14px] text-[#e8eaed]">Kullanicilar</p><p className="text-[9px] font-mono text-[#3d4b63]">{usrs.length} TOTAL</p></div>
        </div>
        {usrs.map(u=>(<div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[rgba(240,185,11,0.02)] transition-all" style={{borderBottom:"1px solid rgba(255,255,255,0.02)"}}>
          <div className="relative">{u.avatar?<img src={u.avatar} className="w-9 h-9 rounded-xl object-cover" alt=""/>:<div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold" style={{background:"rgba(240,185,11,0.08)",color:"#F0B90B"}}>{(u.displayName||u.username||"?").slice(0,2).toUpperCase()}</div>}
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0e18]`} style={{background:u.status==="online"?"#00DC82":"#3d4b63"}}/></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-[#e8eaed] truncate">{u.displayName||u.username}</p>
              {u.role==="admin"&&<span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded tracking-wider" style={{background:"rgba(240,185,11,0.1)",color:"#F0B90B"}}>ADMIN</span>}
              {u.isBlocked===1&&<span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded tracking-wider" style={{background:"rgba(255,71,87,0.1)",color:"#FF4757"}}>BLOCKED</span>}
            </div>
            <p className="text-[10px] font-mono text-[#3d4b63]">@{u.username}</p>
          </div>
          {u.id!==user?.id&&<div className="flex items-center gap-1">
            <select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} className="inp text-[10px] px-2 py-1 cursor-pointer font-mono" style={{width:"auto",background:"rgba(255,255,255,0.03)"}}><option value="user">User</option><option value="moderator">Mod</option><option value="admin">Admin</option></select>
            <button onClick={()=>toggleBlock(u.id)} className="p-2 rounded-lg hover:bg-[rgba(240,185,11,0.05)]" style={{color:u.isBlocked?"#00DC82":"#F0B90B"}}>{u.isBlocked?<UserX size={15}/>:<Ban size={15}/>}</button>
            <button onClick={()=>deleteUser(u.id)} className="p-2 rounded-lg hover:bg-[rgba(255,71,87,0.05)] text-[#FF4757]"><Trash2 size={15}/></button>
          </div>}
        </div>))}
      </div>}
    </div>
  </div>);
}
