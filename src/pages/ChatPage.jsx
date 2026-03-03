import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import { formatTime, getInitials, fileToBase64 } from "../utils/helpers";
import toast from "react-hot-toast";
import { Send, Image, Mic, MicOff, Trash2, Ban, Search, LogOut, Moon, Sun, Users, Hash, X, Shield, Check, CheckCheck, Camera, ArrowLeft, Lock } from "lucide-react";

export default function ChatPage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket, onlineUsers, connected, isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [view, setView] = useState("general");
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUser, setTypingUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { api.get("/users").then(r => setUsers(r.data.users)).catch(() => {}); api.get("/messages/unread/counts").then(r => setUnreadCounts(r.data.unreadCounts)).catch(() => {}); }, []);
  useEffect(() => { if (view === "general") api.get("/messages/room/general").then(r => setMessages(r.data.messages)).catch(() => {}); }, [view]);
  useEffect(() => { if (view === "private" && selectedUser) { api.get(`/messages/private/${selectedUser.id}`).then(r => { setPrivateMessages(r.data.messages); if (socket) socket.emit("markAllRead", { senderId: selectedUser.id }); setUnreadCounts(p => ({...p, [selectedUser.id]: 0})); }).catch(() => {}); } }, [view, selectedUser]);

  useEffect(() => {
    if (!socket) return;
    const h = {
      newMessage: (msg) => { if (view === "general") setMessages(p => [...p, msg]); },
      newPrivateMessage: (msg) => {
        if (view === "private" && selectedUser && (msg.senderId === selectedUser.id || msg.senderId === user.id)) {
          setPrivateMessages(p => [...p, msg]);
          if (msg.senderId === selectedUser.id) socket.emit("markAsRead", { messageId: msg.id, senderId: msg.senderId });
        } else if (msg.senderId !== user.id) { setUnreadCounts(p => ({...p, [msg.senderId]: (p[msg.senderId]||0)+1})); }
      },
      messageRead: ({ messageId, readAt }) => { setPrivateMessages(p => p.map(m => m.id === messageId ? {...m, isRead:1, readAt} : m)); },
      allMessagesRead: ({ readBy }) => { if (view === "private" && selectedUser?.id === readBy) setPrivateMessages(p => p.map(m => m.senderId === user.id ? {...m, isRead:1} : m)); },
      messageDeleted: ({ messageId }) => { setMessages(p => p.map(m => m.id === messageId ? {...m, deletedForAll:1, content:"[Bu mesaj silindi]", mediaData:null} : m)); setPrivateMessages(p => p.map(m => m.id === messageId ? {...m, deletedForAll:1, content:"[Bu mesaj silindi]", mediaData:null} : m)); },
      userTyping: (d) => setTypingUser(d),
      userStopTyping: () => setTypingUser(null)
    };
    Object.entries(h).forEach(([e,fn]) => socket.on(e,fn));
    return () => { Object.keys(h).forEach(e => socket.off(e)); };
  }, [socket, view, selectedUser, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, privateMessages]);

  const sendMessage = () => { if (!newMessage.trim() || !socket) return; if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: newMessage.trim(), type: "text" }); else socket.emit("sendMessage", { content: newMessage.trim(), type: "text", roomId: "general" }); setNewMessage(""); };
  const handleTyping = (e) => { setNewMessage(e.target.value); if (socket) { socket.emit("typing", { receiverId: selectedUser?.id, roomId: view === "general" ? "general" : undefined }); clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => socket.emit("stopTyping", { receiverId: selectedUser?.id, roomId: view === "general" ? "general" : undefined }), 2000); } };
  const handleImageSend = async (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5*1024*1024) return toast.error("Max 5MB"); try { const b64 = await fileToBase64(file); if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: "Fotograf", type: "image", mediaData: b64 }); else socket.emit("sendMessage", { content: "Fotograf", type: "image", mediaData: b64, roomId: "general" }); } catch { toast.error("Gonderilemedi"); } e.target.value = ""; };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(stream); audioChunksRef.current = []; rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; rec.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); stream.getTracks().forEach(t => t.stop()); const reader = new FileReader(); reader.readAsDataURL(blob); reader.onload = () => { if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: "Sesli mesaj", type: "voice", mediaData: reader.result }); else socket.emit("sendMessage", { content: "Sesli mesaj", type: "voice", mediaData: reader.result, roomId: "general" }); }; }; rec.start(); setMediaRecorder(rec); setIsRecording(true); } catch { toast.error("Mikrofon erisimi reddedildi"); } };
  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); setMediaRecorder(null); } };
  const deleteMessage = (id, priv = false) => { if (socket) socket.emit("deleteMessage", { messageId: id, isPrivate: priv, receiverId: selectedUser?.id }); };
  const blockUser = async (uid) => { try { await api.post(`/users/block/${uid}`); toast.success("Engellendi"); setUsers(p => p.filter(u => u.id !== uid)); if (selectedUser?.id === uid) { setSelectedUser(null); setView("general"); } } catch (e) { toast.error("Hata"); } };
  const updateProfile = async () => { try { const r = await api.put("/auth/profile", { displayName: editDisplayName, bio: editBio }); updateUser(r.data.user); toast.success("Guncellendi"); setShowProfile(false); } catch { toast.error("Hata"); } };
  const handleAvatarUpload = async (e) => { const file = e.target.files[0]; if (!file || file.size > 2*1024*1024) return; try { const b64 = await fileToBase64(file); const r = await api.put("/auth/profile", { avatar: b64 }); updateUser(r.data.user); } catch {} e.target.value = ""; };

  const openChat = (u) => { setSelectedUser(u); setView("private"); setShowSidebar(false); };
  const curMsgs = view === "general" ? messages : privateMessages;
  const filtered = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalUnread = Object.values(unreadCounts).reduce((a,b) => a+b, 0);

  const Av = ({ src, name, size = "w-12 h-12", ts = "text-sm", on }) => (<div className="relative shrink-0">{src ? <img src={src} className={`${size} rounded-full object-cover`} alt="" /> : <div className={`${size} rounded-full bg-[#2a3942] flex items-center justify-center ${ts} font-bold text-[#8696a0]`}>{getInitials(name)}</div>}{on && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#1f2c33]"></div>}</div>);

  return (
    <div className="h-screen">
      <div className="h-full w-full flex bg-[#0b141a]">
        <div className="fixed top-0 left-0 right-0 h-[127px] bg-[#00a884] z-0"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto flex h-[calc(100%-14px)] my-[7px] shadow-2xl overflow-hidden">

          {/* SIDEBAR */}
          <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-[400px] bg-[#111b21] border-r border-[#2a3942] shrink-0`}>
            <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfile(true)}><Av src={user?.avatar} name={user?.displayName} size="w-10 h-10" ts="text-xs" /></div>
              <div className="flex items-center gap-0.5">
                {user?.role === "admin" && <button onClick={() => navigate("/admin")} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Shield size={20} /></button>}
                <button onClick={toggleTheme} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5">{theme==="dark"?<Sun size={20}/>:<Moon size={20}/>}</button>
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Search size={20} /></button>
                <button onClick={logout} className="p-2 text-[#8696a0] hover:text-red-400 rounded-full hover:bg-white/5"><LogOut size={20} /></button>
              </div>
            </div>
            {showSearch && <div className="px-3 py-2 bg-[#111b21]"><div className="flex items-center gap-3 bg-[#2a3942] rounded-lg px-4 py-2"><Search size={16} className="text-[#8696a0]"/><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Ara..." autoFocus className="flex-1 bg-transparent text-[#e9edef] text-[13px] focus:outline-none placeholder-[#8696a0]"/>{searchQuery&&<button onClick={()=>setSearchQuery("")}><X size={16} className="text-[#8696a0]"/></button>}</div></div>}
            <div className="flex bg-[#111b21] border-b border-[#2a3942]">
              <button onClick={()=>{setView("general");setSelectedUser(null);}} className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider relative ${view==="general"?"text-[#00a884]":"text-[#8696a0]"}`}>Genel{view==="general"&&<div className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#00a884] rounded-t-full"></div>}</button>
              <button onClick={()=>{}} className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider relative ${view==="private"?"text-[#00a884]":"text-[#8696a0]"}`}>Kisiler{totalUnread>0&&<span className="ml-1 px-1.5 py-0.5 bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full">{totalUnread}</span>}{view==="private"&&<div className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#00a884] rounded-t-full"></div>}</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {view==="general"&&!searchQuery ? onlineUsers.filter(u=>u.id!==user?.id).map(u=>(<button key={u.id} onClick={()=>openChat(u)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/30"><Av src={u.avatar} name={u.displayName} on={true}/><div className="flex-1 text-left min-w-0"><p className="text-[#e9edef] text-[16px] font-medium truncate">{u.displayName||u.username}</p><p className="text-[#8696a0] text-[13px]">Cevrimici</p></div>{unreadCounts[u.id]>0&&<span className="px-[7px] py-[2px] bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full">{unreadCounts[u.id]}</span>}</button>)) : filtered.map(u=>(<button key={u.id} onClick={()=>openChat(u)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/30 ${selectedUser?.id===u.id?"bg-[#233138]":"hover:bg-[#233138]"}`}><Av src={u.avatar} name={u.displayName} on={isUserOnline(u.id)}/><div className="flex-1 text-left min-w-0"><p className="text-[#e9edef] text-[16px] font-medium truncate">{u.displayName||u.username}</p><p className="text-[#8696a0] text-[13px]">{isUserOnline(u.id)?"Cevrimici":"Cevrimdisi"}</p></div>{unreadCounts[u.id]>0&&<span className="px-[7px] py-[2px] bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full">{unreadCounts[u.id]}</span>}</button>))}
              {view==="general"&&!searchQuery&&onlineUsers.filter(u=>u.id!==user?.id).length===0&&<div className="flex flex-col items-center py-20 text-[#8696a0]"><Users size={48} className="opacity-20 mb-3"/><p className="text-sm">Henuz kimse cevrimici degil</p></div>}
            </div>
          </div>

          {/* CHAT AREA */}
          <div className={`${!showSidebar?"flex":"hidden"} md:flex flex-col flex-1 min-w-0`}>
            {(view==="general"||(view==="private"&&selectedUser)) ? (<>
              <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <button onClick={()=>{setShowSidebar(true);if(view==="private"){setSelectedUser(null);setView("general");}}} className="md:hidden p-1 text-[#8696a0]"><ArrowLeft size={22}/></button>
                  {view==="private"&&selectedUser?(<><Av src={selectedUser.avatar} name={selectedUser.displayName} size="w-10 h-10" ts="text-xs" on={isUserOnline(selectedUser.id)}/><div><h3 className="text-[#e9edef] font-bold text-[16px]">{selectedUser.displayName||selectedUser.username}</h3><p className="text-[#8696a0] text-[12px]">{typingUser?.userId===selectedUser.id?<span className="text-[#00a884] italic">yaziyor...</span>:isUserOnline(selectedUser.id)?"cevrimici":"cevrimdisi"}</p></div></>):(<><div className="w-10 h-10 rounded-full bg-[#00a884]/10 flex items-center justify-center"><Hash size={20} className="text-[#00a884]"/></div><div><h3 className="text-[#e9edef] font-bold text-[16px]">Genel Sohbet</h3><p className="text-[#8696a0] text-[12px]">{typingUser?<span className="text-[#00a884] italic">{typingUser.username} yaziyor...</span>:`${onlineUsers.length} katilimci`}</p></div></>)}
                </div>
                {view==="private"&&selectedUser&&<button onClick={()=>blockUser(selectedUser.id)} className="p-2 text-[#8696a0] hover:text-red-400 rounded-full hover:bg-white/5"><Ban size={20}/></button>}
              </div>
              <div className="flex-1 overflow-y-auto chat-bg px-4 md:px-16 py-3">
                {view==="private"&&<div className="flex justify-center mb-4"><div className="bg-[#233138]/90 text-[#8696a0] text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Lock size={12}/>Mesajlar uctan uca sifrelenmistir</div></div>}
                {curMsgs.map((msg,i)=>{const mine=msg.senderId===user?.id;const del=msg.deletedForAll===1;const showName=!mine&&view==="general"&&(i===0||curMsgs[i-1]?.senderId!==msg.senderId);return(<div key={msg.id} className={`flex ${mine?"justify-end":"justify-start"} mb-[2px] msg-enter group`}><div className="relative max-w-[65%]">{showName&&<p className="text-[11.5px] font-bold text-[#00a884] ml-1 mb-[1px]">{msg.senderDisplayName||msg.senderName}</p>}<div className={`relative rounded-lg px-[9px] pt-[6px] pb-[8px] shadow-sm ${del?"bg-[#202c33]/50 italic":mine?"bg-[#005c4b]":"bg-[#202c33]"} ${mine&&!del?"rounded-tr-none":!mine&&!del?"rounded-tl-none":""}`}>{del?<p className="text-[13.5px] text-[#8696a0]">{msg.content}</p>:msg.type==="image"&&msg.mediaData?<img src={msg.mediaData} className="max-w-full rounded max-h-[280px] object-contain cursor-pointer mb-1" onClick={()=>window.open(msg.mediaData,"_blank")} alt=""/>:msg.type==="voice"&&msg.mediaData?<div className="min-w-[220px]"><audio controls src={msg.mediaData} className="w-full h-[34px]" style={{filter:"invert(1) hue-rotate(180deg)"}}></audio></div>:<p className="text-[14px] leading-[19px] text-[#e9edef] break-words whitespace-pre-wrap">{msg.content}</p>}<div className="flex items-center justify-end gap-1 -mb-[2px]"><span className={`text-[11px] ${mine?"text-white/40":"text-[#8696a0]"}`}>{formatTime(msg.createdAt)}</span>{mine&&view==="private"&&!del&&(msg.isRead?<CheckCheck size={16} className="text-[#53bdeb]"/>:<Check size={16} className="text-white/40"/>)}</div>{mine&&!del&&<button onClick={()=>deleteMessage(msg.id,view==="private")} className="absolute -top-1.5 -right-1.5 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Trash2 size={11}/></button>}</div></div></div>);})}
                {typingUser&&(view==="general"||(view==="private"&&typingUser.userId===selectedUser?.id))&&<div className="flex mb-1"><div className="flex gap-[5px] bg-[#202c33] rounded-lg px-4 py-3 shadow-sm"><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div></div></div>}
                <div ref={messagesEndRef}/>
              </div>
              <div className="bg-[#202c33] px-3 md:px-5 py-2.5 flex items-end gap-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSend} className="hidden"/>
                <button onClick={()=>fileInputRef.current?.click()} className="p-2 text-[#8696a0] hover:text-[#00a884] shrink-0"><Image size={24}/></button>
                <button onClick={isRecording?stopRecording:startRecording} className={`p-2 shrink-0 ${isRecording?"text-red-400 animate-pulse":"text-[#8696a0] hover:text-[#00a884]"}`}>{isRecording?<MicOff size={24}/>:<Mic size={24}/>}</button>
                <div className="flex-1"><input type="text" value={newMessage} onChange={handleTyping} onKeyDown={e=>{if(e.key==="Enter")sendMessage();}} placeholder="Bir mesaj yazin" className="w-full px-4 py-[9px] bg-[#2a3942] rounded-lg text-[#e9edef] text-[15px] focus:outline-none placeholder-[#8696a0]"/></div>
                <button onClick={sendMessage} disabled={!newMessage.trim()} className="p-2 text-[#8696a0] hover:text-[#00a884] disabled:opacity-30 shrink-0"><Send size={24}/></button>
              </div>
            </>):(<div className="flex-1 flex flex-col items-center justify-center bg-[#233138]/20"><svg className="w-48 h-48 opacity-[0.06] mb-6" viewBox="0 0 100 100" fill="none"><path d="M50 20c-16.57 0-30 12.54-30 28.01 0 5.25 1.56 10.13 4.24 14.25L20 80l18.38-4.82A30.5 30.5 0 0050 76.02C66.57 76.02 80 63.48 80 47.01S66.57 20 50 20z" fill="#8696a0"/></svg><h2 className="text-[#e9edef] text-[28px] font-light mb-2">SohbetApp Web</h2><p className="text-[#8696a0] text-sm max-w-[400px] text-center">Mesajlasmaya baslamak icin sol panelden bir kisi secin</p><div className="mt-6 flex items-center gap-2 text-[#8696a0] text-[13px]"><Lock size={14}/>Uctan uca sifrelenmis</div></div>)}
          </div>
        </div>

        {showProfile&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}><div className="bg-[#1f2c33] rounded-lg w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}><div className="bg-[#00a884] p-6 rounded-t-lg"><div className="flex items-center justify-between"><h3 className="text-white text-lg font-bold">Profil</h3><button onClick={()=>setShowProfile(false)} className="text-white/70 hover:text-white"><X size={22}/></button></div></div><div className="p-6"><div className="flex flex-col items-center -mt-14 mb-6"><div className="relative group">{user?.avatar?<img src={user.avatar} className="w-[100px] h-[100px] rounded-full object-cover border-4 border-[#1f2c33]" alt=""/>:<div className="w-[100px] h-[100px] rounded-full bg-[#2a3942] flex items-center justify-center text-2xl font-bold text-[#8696a0] border-4 border-[#1f2c33]">{getInitials(user?.displayName)}</div>}<label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer"><Camera size={28} className="text-white"/><input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/></label></div></div><div className="space-y-5"><div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Gorunen Ad</label><input type="text" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} className="w-full px-0 py-2.5 bg-transparent border-0 border-b-2 border-[#2a3942] text-[#e9edef] focus:outline-none focus:border-[#00a884]"/></div><div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Hakkinda</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={2} className="w-full px-0 py-2.5 bg-transparent border-0 border-b-2 border-[#2a3942] text-[#e9edef] focus:outline-none focus:border-[#00a884] resize-none" placeholder="Durum bilgisi..."/></div></div><button onClick={updateProfile} className="w-full mt-6 py-3 bg-[#00a884] hover:bg-[#008069] text-white font-bold rounded-lg">Kaydet</button></div></div></div>}
      </div>
    </div>
  );
}
