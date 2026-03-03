import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import { formatTime, getInitials, truncate, fileToBase64 } from "../utils/helpers";
import toast from "react-hot-toast";
import { MessageSquare, Send, Image, Mic, MicOff, Trash2, Ban, Search, Settings, LogOut, Moon, Sun, Users, Hash, X, Shield, Check, CheckCheck, Camera, ArrowLeft } from "lucide-react";

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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editBio, setEditBio] = useState(user?.bio || "");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    api.get("/users").then(r => setUsers(r.data.users)).catch(() => {});
    api.get("/messages/unread/counts").then(r => setUnreadCounts(r.data.unreadCounts)).catch(() => {});
  }, []);

  useEffect(() => {
    if (view === "general") api.get("/messages/room/general").then(r => setMessages(r.data.messages)).catch(() => {});
  }, [view]);

  useEffect(() => {
    if (view === "private" && selectedUser) {
      api.get(`/messages/private/${selectedUser.id}`).then(r => {
        setPrivateMessages(r.data.messages);
        if (socket) socket.emit("markAllRead", { senderId: selectedUser.id });
        setUnreadCounts(p => ({...p, [selectedUser.id]: 0}));
      }).catch(() => {});
    }
  }, [view, selectedUser]);

  useEffect(() => {
    if (!socket) return;
    const handlers = {
      newMessage: (msg) => { if (view === "general") setMessages(p => [...p, msg]); },
      newPrivateMessage: (msg) => {
        if (view === "private" && selectedUser && (msg.senderId === selectedUser.id || msg.senderId === user.id)) {
          setPrivateMessages(p => [...p, msg]);
          if (msg.senderId === selectedUser.id) socket.emit("markAsRead", { messageId: msg.id, senderId: msg.senderId });
        } else if (msg.senderId !== user.id) {
          setUnreadCounts(p => ({...p, [msg.senderId]: (p[msg.senderId]||0)+1}));
          toast(msg.senderDisplayName || "Yeni mesaj", { icon: "💬", duration: 2000 });
        }
      },
      messageRead: ({ messageId, readAt }) => { setPrivateMessages(p => p.map(m => m.id === messageId ? {...m, isRead:1, readAt} : m)); },
      allMessagesRead: ({ readBy }) => {
        if (view === "private" && selectedUser?.id === readBy)
          setPrivateMessages(p => p.map(m => m.senderId === user.id ? {...m, isRead:1} : m));
      },
      messageDeleted: ({ messageId }) => {
        setMessages(p => p.map(m => m.id === messageId ? {...m, deletedForAll:1, content:"[Bu mesaj silindi]", mediaData:null} : m));
        setPrivateMessages(p => p.map(m => m.id === messageId ? {...m, deletedForAll:1, content:"[Bu mesaj silindi]", mediaData:null} : m));
      },
      userTyping: (d) => setTypingUser(d),
      userStopTyping: () => setTypingUser(null)
    };
    Object.entries(handlers).forEach(([e,h]) => socket.on(e,h));
    return () => { Object.keys(handlers).forEach(e => socket.off(e)); };
  }, [socket, view, selectedUser, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, privateMessages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;
    if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: newMessage.trim(), type: "text" });
    else socket.emit("sendMessage", { content: newMessage.trim(), type: "text", roomId: "general" });
    setNewMessage("");
    socket.emit("stopTyping", { receiverId: selectedUser?.id, roomId: view === "general" ? "general" : undefined });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit("typing", { receiverId: selectedUser?.id, roomId: view === "general" ? "general" : undefined });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit("stopTyping", { receiverId: selectedUser?.id, roomId: view === "general" ? "general" : undefined }), 2000);
    }
  };

  const handleImageSend = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) return toast.error("Max 5MB");
    if (!file.type.startsWith("image/")) return toast.error("Sadece resim");
    try {
      const b64 = await fileToBase64(file);
      if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: "Fotograf", type: "image", mediaData: b64, fileName: file.name });
      else socket.emit("sendMessage", { content: "Fotograf", type: "image", mediaData: b64, fileName: file.name, roomId: "general" });
      toast.success("Resim gonderildi");
    } catch { toast.error("Resim gonderilemedi"); }
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream); audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        const reader = new FileReader(); reader.readAsDataURL(blob);
        reader.onload = () => {
          if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { receiverId: selectedUser.id, content: "Sesli mesaj", type: "voice", mediaData: reader.result });
          else socket.emit("sendMessage", { content: "Sesli mesaj", type: "voice", mediaData: reader.result, roomId: "general" });
          toast.success("Sesli mesaj gonderildi");
        };
      };
      recorder.start(); setMediaRecorder(recorder); setIsRecording(true);
    } catch { toast.error("Mikrofon erisimi reddedildi"); }
  };

  const stopRecording = () => { if (mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); setMediaRecorder(null); } };

  const deleteMessage = (id, isPrivate = false) => {
    if (!socket) return;
    socket.emit("deleteMessage", { messageId: id, isPrivate, receiverId: selectedUser?.id });
  };

  const blockUser = async (userId) => {
    try { await api.post(`/users/block/${userId}`); toast.success("Engellendi"); setUsers(p => p.filter(u => u.id !== userId)); if (selectedUser?.id === userId) { setSelectedUser(null); setView("general"); } }
    catch (err) { toast.error(err.response?.data?.error || "Hata"); }
  };

  const updateProfile = async () => {
    try { const r = await api.put("/auth/profile", { displayName: editDisplayName, bio: editBio }); updateUser(r.data.user); toast.success("Profil guncellendi"); setShowProfile(false); }
    catch { toast.error("Guncelleme hatasi"); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) return toast.error("Max 2MB");
    try { const b64 = await fileToBase64(file); const r = await api.put("/auth/profile", { avatar: b64 }); updateUser(r.data.user); toast.success("Foto guncellendi"); }
    catch { toast.error("Yukleme hatasi"); }
    e.target.value = "";
  };

  const openPrivateChat = (u) => { setSelectedUser(u); setView("private"); setShowSidebar(false); };
  const currentMessages = view === "general" ? messages : privateMessages;
  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalUnread = Object.values(unreadCounts).reduce((a,b) => a+b, 0);

  return (
    <div className={`h-screen flex ${theme==="dark"?"dark":""}`}>
      <div className="h-full w-full flex bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        {/* SIDEBAR */}
        <div className={`${showSidebar?"flex":"hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50 shrink-0`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {user?.avatar ? <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" alt="" /> :
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm">{getInitials(user?.displayName)}</div>}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></div>
                </div>
                <div><h2 className="font-semibold text-sm">{user?.displayName}</h2><p className="text-xs text-slate-500">@{user?.username}</p></div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleTheme} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">{theme==="dark"?<Sun size={18} className="text-slate-400"/>:<Moon size={18} className="text-slate-500"/>}</button>
                <button onClick={()=>setShowProfile(true)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><Settings size={18} className="text-slate-400"/></button>
                {user?.role==="admin"&&<button onClick={()=>navigate("/admin")} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg" title="Admin"><Shield size={18} className="text-amber-500"/></button>}
              </div>
            </div>
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Kullanici ara..." className="w-full pl-10 pr-4 py-2.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400"/>
            </div>
          </div>
          <div className="flex border-b border-slate-200 dark:border-slate-800/50">
            <button onClick={()=>{setView("general");setSelectedUser(null);}} className={`flex-1 py-3 text-sm font-medium relative ${view==="general"?"text-brand-600 dark:text-brand-400":"text-slate-500"}`}><Hash size={16} className="inline mr-1.5"/>Genel{view==="general"&&<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}</button>
            <button onClick={()=>setView("general")} className={`flex-1 py-3 text-sm font-medium relative ${view==="private"?"text-brand-600 dark:text-brand-400":"text-slate-500"}`}><Users size={16} className="inline mr-1.5"/>Kisiler{totalUnread>0&&<span className="ml-1.5 px-1.5 py-0.5 bg-brand-600 text-white text-xs rounded-full">{totalUnread}</span>}</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {view==="general"&&!searchQuery ? (
              <div className="p-3">
                <div className="flex items-center gap-2 px-3 py-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot"></div><span className="text-xs text-slate-500">{onlineUsers.length} cevrimici</span></div>
                {onlineUsers.map(u=>u.id!==user?.id&&(
                  <button key={u.id} onClick={()=>openPrivateChat(u)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                    <div className="relative">{u.avatar?<img src={u.avatar} className="w-9 h-9 rounded-full object-cover" alt=""/>:<div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">{getInitials(u.displayName)}</div>}<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></div></div>
                    <div className="flex-1 text-left"><p className="text-sm font-medium">{u.displayName||u.username}</p></div>
                    {unreadCounts[u.id]>0&&<span className="px-2 py-0.5 bg-brand-600 text-white text-xs rounded-full">{unreadCounts[u.id]}</span>}
                  </button>))}
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {filteredUsers.map(u=>(
                  <button key={u.id} onClick={()=>openPrivateChat(u)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${selectedUser?.id===u.id?"bg-brand-600/10":"hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}>
                    <div className="relative">{u.avatar?<img src={u.avatar} className="w-10 h-10 rounded-full object-cover" alt=""/>:<div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold">{getInitials(u.displayName)}</div>}{isUserOnline(u.id)&&<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></div>}</div>
                    <div className="flex-1 text-left min-w-0"><div className="flex items-center justify-between"><p className="text-sm font-medium truncate">{u.displayName||u.username}</p>{isUserOnline(u.id)&&<span className="text-[10px] text-emerald-500 font-medium">Cevrimici</span>}</div><p className="text-xs text-slate-500 truncate">@{u.username}</p></div>
                    {unreadCounts[u.id]>0&&<span className="px-2 py-0.5 bg-brand-600 text-white text-xs rounded-full font-medium">{unreadCounts[u.id]}</span>}
                  </button>))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-slate-800/50"><button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl text-sm font-medium"><LogOut size={16}/>Cikis Yap</button></div>
        </div>

        {/* CHAT AREA */}
        <div className={`${!showSidebar?"flex":"hidden"} md:flex flex-col flex-1 min-w-0`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button onClick={()=>setShowSidebar(true)} className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft size={20}/></button>
              {view==="private"&&selectedUser ? (
                <><div className="relative">{selectedUser.avatar?<img src={selectedUser.avatar} className="w-9 h-9 rounded-full object-cover" alt=""/>:<div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold">{getInitials(selectedUser.displayName)}</div>}{isUserOnline(selectedUser.id)&&<div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>}</div>
                <div><h3 className="font-semibold text-sm">{selectedUser.displayName||selectedUser.username}</h3><p className="text-xs text-slate-500">{typingUser?.userId===selectedUser.id?<span className="text-brand-500">yaziyor...</span>:isUserOnline(selectedUser.id)?<span className="text-emerald-500">Cevrimici</span>:"Cevrimdisi"}</p></div></>
              ) : (
                <><div className="w-9 h-9 rounded-full bg-brand-600/10 flex items-center justify-center"><Hash size={18} className="text-brand-600 dark:text-brand-400"/></div>
                <div><h3 className="font-semibold text-sm">Genel Sohbet</h3><p className="text-xs text-slate-500">{typingUser&&view==="general"?<span className="text-brand-500">{typingUser.username} yaziyor...</span>:`${onlineUsers.length} cevrimici`}</p></div></>
              )}
            </div>
            {view==="private"&&selectedUser&&<button onClick={()=>blockUser(selectedUser.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500" title="Engelle"><Ban size={18}/></button>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-100/50 dark:bg-slate-950">
            {currentMessages.map((msg,i)=>{
              const isMine=msg.senderId===user?.id;
              const isDeleted=msg.deletedForAll===1;
              const showAvatar=!isMine&&(i===0||currentMessages[i-1]?.senderId!==msg.senderId);
              return (
                <div key={msg.id} className={`flex ${isMine?"justify-end":"justify-start"} message-enter group`}>
                  {!isMine&&showAvatar&&<div className="mr-2 mt-auto mb-1">{msg.senderAvatar?<img src={msg.senderAvatar} className="w-7 h-7 rounded-full object-cover" alt=""/>:<div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold">{getInitials(msg.senderDisplayName)}</div>}</div>}
                  {!isMine&&!showAvatar&&<div className="w-7 mr-2"></div>}
                  <div className={`relative max-w-[75%] md:max-w-[60%]`}>
                    {!isMine&&showAvatar&&view==="general"&&<p className="text-[11px] font-medium text-brand-600 dark:text-brand-400 mb-0.5 ml-1">{msg.senderDisplayName||msg.senderName}</p>}
                    <div className={`relative rounded-2xl px-3.5 py-2 ${isDeleted?"bg-slate-200 dark:bg-slate-800/50 italic":isMine?"bg-brand-600 text-white":"bg-white dark:bg-slate-800 shadow-sm"} ${isMine?"rounded-br-md":"rounded-bl-md"}`}>
                      {isDeleted?<p className="text-sm text-slate-500">{msg.content}</p>:
                       msg.type==="image"&&msg.mediaData?<img src={msg.mediaData} alt="" className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer" onClick={()=>window.open(msg.mediaData,"_blank")}/>:
                       msg.type==="voice"&&msg.mediaData?<div className="min-w-[200px]"><audio controls src={msg.mediaData} className="w-full h-8" style={{filter:isMine?"invert(1)":"none"}}></audio></div>:
                       <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine?"text-white/60":"text-slate-400"}`}>
                        <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        {isMine&&view==="private"&&!isDeleted&&(msg.isRead?<CheckCheck size={13} className="text-sky-300"/>:<Check size={13}/>)}
                      </div>
                      {isMine&&!isDeleted&&<button onClick={()=>deleteMessage(msg.id,view==="private")} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600" title="Sil"><Trash2 size={12}/></button>}
                    </div>
                  </div>
                </div>);
            })}
            {typingUser&&<div className="flex items-center gap-2 px-2"><div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm"><div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div><div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div><div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div></div></div>}
            <div ref={messagesEndRef}/>
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/80">
            <div className="flex items-end gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSend} className="hidden"/>
              <button onClick={()=>fileInputRef.current?.click()} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-500 shrink-0"><Image size={20}/></button>
              <button onClick={isRecording?stopRecording:startRecording} className={`p-2.5 rounded-xl shrink-0 ${isRecording?"bg-red-500 text-white animate-pulse":"hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500"}`}>{isRecording?<MicOff size={20}/>:<Mic size={20}/>}</button>
              <div className="flex-1"><textarea value={newMessage} onChange={handleTyping} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Mesaj yazin..." rows={1} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none max-h-32 text-slate-900 dark:text-white placeholder-slate-400" style={{minHeight:"42px"}}/></div>
              <button onClick={sendMessage} disabled={!newMessage.trim()} className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl shrink-0 active:scale-95 disabled:scale-100"><Send size={20}/></button>
            </div>
          </div>
        </div>

        {/* PROFILE MODAL */}
        {showProfile&&(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e=>e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">Profil Ayarlari</h3><button onClick={()=>setShowProfile(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X size={20}/></button></div>
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    {user?.avatar?<img src={user.avatar} className="w-24 h-24 rounded-full object-cover" alt=""/>:<div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold">{getInitials(user?.displayName)}</div>}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer"><Camera size={24} className="text-white"/><input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/></label>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Degistirmek icin tiklayin</p>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Gorunen Ad</label><input type="text" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/></div>
                  <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Hakkinda</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" placeholder="Kendiniz hakkinda..."/></div>
                </div>
                <button onClick={updateProfile} className="w-full mt-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl">Kaydet</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
