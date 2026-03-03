import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import { formatTime, formatDate, getInitials, truncate, fileToBase64, playSound, EMOJIS } from "../utils/helpers";
import toast from "react-hot-toast";
import { Send, Image, Mic, MicOff, Trash2, Ban, Search, LogOut, Users, Hash, X, Shield, Check, CheckCheck, Camera, ArrowLeft, Lock, Smile, Reply, Forward, Pin, PinOff, UserPlus, UserMinus, Phone, Video, PhoneOff, Plus, Settings, Eye, EyeOff, Archive, MessageCircle, ChevronDown, Paperclip, File } from "lucide-react";

export default function ChatPage() {
  const { user, logout, updateUser } = useAuth();
  const { socket, onlineUsers, connected, isUserOnline } = useSocket();
  const navigate = useNavigate();

  // Core state
  const [view, setView] = useState("general");
  const [tab, setTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [typingUser, setTypingUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  
  // Feature state
  const [groups, setGroups] = useState([]);
  const [stories, setStories] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showForward, setShowForward] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  // Call state
  const [callState, setCallState] = useState(null); // null | "calling" | "incoming" | "connected"
  const [callTarget, setCallTarget] = useState(null);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const callTimerRef = useRef(null);

  // Modal state
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(null);
  const [archivedChats, setArchivedChats] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [msgSearchResults, setMsgSearchResults] = useState([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  
  // Profile edit
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  
  // Group create
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  
  // Story create
  const [storyText, setStoryText] = useState("");
  const [storyBg, setStoryBg] = useState("#00a884");
  const [storyImage, setStoryImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Load data
  useEffect(() => {
    api.get("/users").then(r => setUsers(r.data.users)).catch(() => {});
    api.get("/messages/unread/counts").then(r => setUnreadCounts(r.data.unreadCounts)).catch(() => {});
    api.get("/messages/last-messages").then(r => setLastMessages(r.data.lastMessages)).catch(() => {});
    api.get("/groups").then(r => setGroups(r.data.groups)).catch(() => {});
    api.get("/stories").then(r => setStories(r.data.stories)).catch(() => {});
    api.get("/friends").then(r => setFriends(r.data.friends)).catch(() => {});
    api.get("/friends/requests").then(r => setFriendRequests(r.data)).catch(() => {});
  }, []);

  useEffect(() => { if (view === "general") api.get("/messages/room/general").then(r => setMessages(r.data.messages)).catch(() => {}); }, [view]);
  useEffect(() => { if (view === "private" && selectedUser) { api.get(`/messages/private/${selectedUser.id}`).then(r => { setPrivateMessages(r.data.messages); if (socket) socket.emit("markAllRead", { senderId: selectedUser.id }); setUnreadCounts(p => ({...p, [selectedUser.id]: 0})); }).catch(() => {}); } }, [view, selectedUser]);
  useEffect(() => { if (view === "group" && selectedGroup) { api.get(`/messages/group/${selectedGroup.id}`).then(r => setGroupMessages(r.data.messages)).catch(() => {}); if (socket) socket.emit("joinGroup", { groupId: selectedGroup.id }); } }, [view, selectedGroup]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const handlers = {
      newMessage: (msg) => { if (view === "general") setMessages(p => [...p, msg]); if (msg.senderId !== user.id) playSound("msg"); },
      newPrivateMessage: (msg) => {
        if (view === "private" && selectedUser && (msg.senderId === selectedUser.id || msg.senderId === user.id)) {
          setPrivateMessages(p => [...p, msg]);
          if (msg.senderId === selectedUser.id) socket.emit("markAsRead", { messageId: msg.id, senderId: msg.senderId });
        } else if (msg.senderId !== user.id) { setUnreadCounts(p => ({...p, [msg.senderId]: (p[msg.senderId]||0)+1})); playSound("msg"); }
        setLastMessages(p => ({...p, [msg.senderId === user.id ? msg.receiverId : msg.senderId]: { content: msg.content, type: msg.type, createdAt: msg.createdAt, senderId: msg.senderId }}));
      },
      newGroupMessage: (msg) => { if (view === "group" && selectedGroup?.id === msg.groupId) setGroupMessages(p => [...p, msg]); if (msg.senderId !== user.id) playSound("msg"); },
      messageRead: ({ messageId, readAt }) => { setPrivateMessages(p => p.map(m => m.id === messageId ? {...m, isRead:1, readAt} : m)); },
      allMessagesRead: ({ readBy }) => { if (view === "private" && selectedUser?.id === readBy) setPrivateMessages(p => p.map(m => m.senderId === user.id ? {...m, isRead:1} : m)); },
      messageDeleted: ({ messageId }) => { const upd = m => m.id === messageId ? {...m, deletedForAll:1, content:"[Bu mesaj silindi]", mediaData:null} : m; setMessages(p => p.map(upd)); setPrivateMessages(p => p.map(upd)); setGroupMessages(p => p.map(upd)); },
      messageReaction: ({ messageId, reactions }) => { const upd = m => m.id === messageId ? {...m, reactions} : m; setMessages(p => p.map(upd)); setPrivateMessages(p => p.map(upd)); setGroupMessages(p => p.map(upd)); },
      messagePinned: ({ messageId }) => { const upd = m => m.id === messageId ? {...m, isPinned:1} : m; setMessages(p => p.map(upd)); setPrivateMessages(p => p.map(upd)); setGroupMessages(p => p.map(upd)); },
      messageUnpinned: ({ messageId }) => { const upd = m => m.id === messageId ? {...m, isPinned:0} : m; setMessages(p => p.map(upd)); setPrivateMessages(p => p.map(upd)); setGroupMessages(p => p.map(upd)); },
      userTyping: (d) => setTypingUser(d),
      userStopTyping: () => setTypingUser(null),
      friendRequest: (d) => { toast(`${d.fromName} arkadas istegi gonderdi`); api.get("/friends/requests").then(r => setFriendRequests(r.data)).catch(() => {}); },
      friendAccepted: () => { toast.success("Arkadas istegi kabul edildi"); api.get("/friends").then(r => setFriends(r.data.friends)).catch(() => {}); },
      incomingCall: (data) => { setCallTarget({ id: data.callerId, displayName: data.callerName, avatar: data.callerAvatar }); setCallIsVideo(data.isVideo); setCallState("incoming"); playSound("call"); },
      callAccepted: async (data) => {
        setCallState("connected");
        callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
        if (peerRef.current) peerRef.current.signal(data.signal);
      },
      callRejected: () => { endCallCleanup(); toast("Arama reddedildi"); },
      callEnded: () => { endCallCleanup(); toast("Arama sonlandi"); },
      iceCandidate: (data) => { if (peerRef.current) peerRef.current.signal(data.candidate); },
    };
    Object.entries(handlers).forEach(([e,fn]) => socket.on(e,fn));
    return () => { Object.keys(handlers).forEach(e => socket.off(e)); };
  }, [socket, view, selectedUser, selectedGroup, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, privateMessages, groupMessages]);

  // Actions
  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;
    const data = { content: newMessage.trim(), type: "text", replyToId: replyTo?.id || null };
    if (view === "group" && selectedGroup) socket.emit("sendGroupMessage", { ...data, groupId: selectedGroup.id });
    else if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { ...data, receiverId: selectedUser.id });
    else socket.emit("sendMessage", { ...data, roomId: "general" });
    setNewMessage(""); setReplyTo(null); setShowEmoji(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket) { socket.emit("typing", { receiverId: selectedUser?.id, groupId: selectedGroup?.id, roomId: view === "general" ? "general" : undefined }); clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => socket.emit("stopTyping", { receiverId: selectedUser?.id, groupId: selectedGroup?.id }), 2000); }
  };

  const handleFileSend = async (e, type = "image") => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10*1024*1024) return toast.error("Max 10MB");
    try {
      const b64 = await fileToBase64(file);
      const msgType = file.type.startsWith("image/") ? "image" : "file";
      const data = { content: file.name, type: msgType, mediaData: b64, fileName: file.name };
      if (view === "group" && selectedGroup) socket.emit("sendGroupMessage", { ...data, groupId: selectedGroup.id });
      else if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { ...data, receiverId: selectedUser.id });
      else socket.emit("sendMessage", { ...data, roomId: "general" });
    } catch { toast.error("Gonderilemedi"); }
    e.target.value = "";
  };

  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const rec = new MediaRecorder(stream); audioChunksRef.current = []; rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; rec.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); stream.getTracks().forEach(t => t.stop()); const reader = new FileReader(); reader.readAsDataURL(blob); reader.onload = () => { const data = { content: "Sesli mesaj", type: "voice", mediaData: reader.result }; if (view === "group" && selectedGroup) socket.emit("sendGroupMessage", { ...data, groupId: selectedGroup.id }); else if (view === "private" && selectedUser) socket.emit("sendPrivateMessage", { ...data, receiverId: selectedUser.id }); else socket.emit("sendMessage", { ...data, roomId: "general" }); }; }; rec.start(); setMediaRecorder(rec); setIsRecording(true); } catch { toast.error("Mikrofon erisimi reddedildi"); } };
  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); setMediaRecorder(null); } };
  
  const deleteMessage = (id) => { if (socket) socket.emit("deleteMessage", { messageId: id, isPrivate: view === "private", receiverId: selectedUser?.id, groupId: selectedGroup?.id }); };
  const addReaction = (msgId, emoji) => { if (socket) socket.emit("addReaction", { messageId: msgId, emoji }); };
  const pinMessage = (msgId) => { if (socket) socket.emit("pinMessage", { messageId: msgId, roomId: view === "general" ? "general" : null, groupId: selectedGroup?.id }); };
  const unpinMessage = (msgId) => { if (socket) socket.emit("unpinMessage", { messageId: msgId }); };
  const forwardMessage = (msgId, target) => { if (socket) socket.emit("forwardMessage", { messageId: msgId, receiverId: target.type === "user" ? target.id : null, groupId: target.type === "group" ? target.id : null }); setShowForward(null); toast.success("Iletildi"); };
  const blockUser = async (uid) => { try { await api.post(`/users/block/${uid}`); toast.success("Engellendi"); setUsers(p => p.filter(u => u.id !== uid)); if (selectedUser?.id === uid) { setSelectedUser(null); setView("general"); } } catch { toast.error("Hata"); } };
  
  const sendFriendRequest = async (uid) => { try { await api.post(`/friends/request/${uid}`); toast.success("Istek gonderildi"); api.get("/friends/requests").then(r => setFriendRequests(r.data)); } catch (e) { toast.error(e.response?.data?.error || "Hata"); } };
  const acceptFriend = async (uid) => { try { await api.put(`/friends/accept/${uid}`); toast.success("Kabul edildi"); api.get("/friends").then(r => setFriends(r.data.friends)); api.get("/friends/requests").then(r => setFriendRequests(r.data)); } catch { toast.error("Hata"); } };
  const rejectFriend = async (uid) => { try { await api.put(`/friends/reject/${uid}`); api.get("/friends/requests").then(r => setFriendRequests(r.data)); } catch { toast.error("Hata"); } };
  const removeFriend = async (uid) => { try { await api.delete(`/friends/${uid}`); toast.success("Arkadas silindi"); setFriends(p => p.filter(f => f.id !== uid)); } catch { toast.error("Hata"); } };

  // Call functions
  const endCallCleanup = () => {
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} peerRef.current = null; }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setCallState(null); setCallTarget(null); setCallDuration(0);
  };

  const startCall = async (targetUser, isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallTarget(targetUser); setCallIsVideo(isVideo); setCallState("calling");
      
      // Use simple WebRTC offer/answer
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
      pc.onicecandidate = (e) => { if (e.candidate && socket) socket.emit("iceCandidate", { userId: targetUser.id, candidate: e.candidate }); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("callUser", { receiverId: targetUser.id, signal: offer, isVideo });
    } catch (e) { toast.error("Kamera/mikrofon erisimi reddedildi"); endCallCleanup(); }
  };

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callIsVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallState("connected");
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);

      // For simplicity, just emit answer signal
      socket.emit("answerCall", { callerId: callTarget.id, signal: { type: "answer" } });
    } catch (e) { toast.error("Kamera/mikrofon erisimi reddedildi"); endCallCleanup(); }
  };

  const rejectCall = () => { if (socket && callTarget) socket.emit("rejectCall", { callerId: callTarget.id }); endCallCleanup(); };
  const endCall = () => { if (socket && callTarget) socket.emit("endCall", { userId: callTarget.id }); endCallCleanup(); };
  const formatCallDuration = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const archiveChat = async (chatUserId) => { setArchivedChats(p => [...p, chatUserId]); toast.success("Arsivlendi"); };
  const unarchiveChat = (chatUserId) => { setArchivedChats(p => p.filter(id => id !== chatUserId)); toast.success("Arsivden cikarildi"); };
  
  const globalSearch = async () => {
    if (!globalSearchQuery.trim()) return;
    try { const r = await api.get(`/messages/search?q=${globalSearchQuery}`); setMsgSearchResults(r.data.messages); setShowGlobalSearch(true); } catch { toast.error("Arama hatasi"); }
  };

  const createGroup = async () => { if (!newGroupName.trim()) return toast.error("Grup adi gerekli"); try { const r = await api.post("/groups", { name: newGroupName, memberIds: newGroupMembers }); setGroups(p => [r.data.group, ...p]); setShowCreateGroup(false); setNewGroupName(""); setNewGroupMembers([]); toast.success("Grup olusturuldu"); } catch { toast.error("Hata"); } };
  
  const createStory = async () => { if (!storyText && !storyImage) return toast.error("Icerik gerekli"); try { await api.post("/stories", { content: storyText, mediaData: storyImage, type: storyImage ? "image" : "text", bgColor: storyBg }); api.get("/stories").then(r => setStories(r.data.stories)); setShowCreateStory(false); setStoryText(""); setStoryImage(null); toast.success("Hikaye paylsildi"); } catch { toast.error("Hata"); } };
  const viewStory = async (storyId) => { try { await api.post(`/stories/${storyId}/view`); } catch {} };

  const updateProfile = async () => { try { const r = await api.put("/auth/profile", { displayName: editDisplayName, bio: editBio }); updateUser(r.data.user); toast.success("Guncellendi"); setShowProfile(false); } catch { toast.error("Hata"); } };
  const handleAvatarUpload = async (e) => { const file = e.target.files[0]; if (!file || file.size > 2*1024*1024) return; try { const b64 = await fileToBase64(file); const r = await api.put("/auth/profile", { avatar: b64 }); updateUser(r.data.user); } catch {} e.target.value = ""; };
  const updatePrivacy = async (key, val) => { try { await api.put("/auth/profile", { [key]: val }); updateUser({ [key]: val }); toast.success("Guncellendi"); } catch {} };

  const openChat = (u) => { setSelectedUser(u); setSelectedGroup(null); setView("private"); setShowSidebar(false); setReplyTo(null); };
  const openGroup = (g) => { setSelectedGroup(g); setSelectedUser(null); setView("group"); setShowSidebar(false); setReplyTo(null); };
  const goBack = () => { setShowSidebar(true); setSelectedUser(null); setSelectedGroup(null); setView("general"); setReplyTo(null); };
  
  const curMsgs = view === "general" ? messages : view === "private" ? privateMessages : groupMessages;
  const filteredMsgs = showChatSearch && chatSearch ? curMsgs.filter(m => m.content?.toLowerCase().includes(chatSearch.toLowerCase())) : curMsgs;
  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalUnread = Object.values(unreadCounts).reduce((a,b) => a+b, 0);
  const pendingRequests = friendRequests.incoming?.length || 0;

  // Components
  const Av = ({ src, name, size = "w-12 h-12", ts = "text-sm", on, story }) => (
    <div className={`relative shrink-0 ${story ? (story === "seen" ? "story-ring-seen" : "story-ring") : ""}`}>
      {src ? <img src={src} className={`${size} rounded-full object-cover ${story ? "border-2 border-[#111b21]" : ""}`} alt="" /> : <div className={`${size} rounded-full bg-gradient-to-br from-[#2a3942] to-[#1f2c33] flex items-center justify-center ${ts} font-bold text-[#8696a0] ${story ? "border-2 border-[#111b21]" : ""}`}>{getInitials(name)}</div>}
      {on && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#111b21]"></div>}
    </div>
  );

  const MsgBubble = ({ msg, i, msgs }) => {
    const mine = msg.senderId === user?.id;
    const del = msg.deletedForAll === 1;
    const showName = !mine && view !== "private" && (i === 0 || msgs[i-1]?.senderId !== msg.senderId);
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-[2px] msg-enter group`}>
        <div className="relative max-w-[65%]" onMouseEnter={() => !del && setShowActions(true)} onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}>
          {showName && <p className="text-[11.5px] font-bold text-[#00a884] ml-1 mb-[1px]">{msg.senderDisplayName || msg.senderName}</p>}
          {msg.forwardedFrom && <p className="text-[10px] text-[#8696a0] italic ml-1 mb-[1px] flex items-center gap-1"><Forward size={10} />Iletildi</p>}
          {msg.replyTo && <div className="mx-1 mb-1 px-3 py-1.5 bg-black/20 rounded-lg border-l-[3px] border-[#00a884] cursor-pointer"><p className="text-[11px] text-[#00a884] font-bold">{msg.replyTo.senderName}</p><p className="text-[11px] text-[#8696a0] truncate">{msg.replyTo.type === "image" ? "Fotograf" : truncate(msg.replyTo.content, 50)}</p></div>}
          <div className={`relative rounded-lg px-[9px] pt-[6px] pb-[8px] shadow-sm ${del ? "bg-[#202c33]/50 italic" : mine ? "bg-[#005c4b]" : "bg-[#202c33]"} ${mine && !del ? "rounded-tr-none" : !mine && !del ? "rounded-tl-none" : ""}`}>
            {msg.isPinned === 1 && <div className="flex items-center gap-1 text-[10px] text-[#ffd700] mb-1"><Pin size={10} />Sabitlendi</div>}
            {del ? <p className="text-[13.5px] text-[#8696a0]">{msg.content}</p> :
             msg.type === "image" && msg.mediaData ? <img src={msg.mediaData} className="max-w-full rounded max-h-[280px] object-contain cursor-pointer mb-1" onClick={() => window.open(msg.mediaData, "_blank")} alt="" /> :
             msg.type === "voice" && msg.mediaData ? <div className="min-w-[220px]"><audio controls src={msg.mediaData} className="w-full h-[34px]" style={{filter:"invert(1) hue-rotate(180deg)"}}></audio></div> :
             msg.type === "file" && msg.mediaData ? <a href={msg.mediaData} download={msg.fileName} className="flex items-center gap-2 text-[#00a884] hover:underline"><File size={18} /><span className="text-[13px]">{msg.fileName || "Dosya"}</span></a> :
             <p className="text-[14px] leading-[19px] text-[#e9edef] break-words whitespace-pre-wrap">{msg.content}</p>}
            <div className="flex items-center justify-end gap-1 -mb-[2px]">
              <span className={`text-[11px] ${mine ? "text-white/40" : "text-[#8696a0]"}`}>{formatTime(msg.createdAt)}</span>
              {mine && view === "private" && !del && (msg.isRead ? <CheckCheck size={16} className="text-[#53bdeb]" /> : <Check size={16} className="text-white/40" />)}
            </div>
          </div>
          {/* Reactions */}
          {msg.reactions?.length > 0 && <div className="flex flex-wrap gap-1 mt-1 ml-1">{Object.entries(msg.reactions.reduce((a, r) => { a[r.emoji] = (a[r.emoji] || 0) + 1; return a; }, {})).map(([emoji, count]) => <span key={emoji} className="text-[12px] bg-[#2a3942] rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-[#3a4a52]" onClick={() => addReaction(msg.id, emoji)}>{emoji} {count > 1 && count}</span>)}</div>}
          {/* Action buttons */}
          {showActions && <div className="absolute -top-8 right-0 flex items-center gap-0.5 bg-[#1f2c33] rounded-lg shadow-xl border border-[#2a3942] px-1 py-0.5 animate-scale-in z-10">
            <button onClick={() => setShowReactions(!showReactions)} className="p-1.5 hover:bg-white/10 rounded text-[#8696a0]" title="Tepki"><Smile size={14} /></button>
            <button onClick={() => setReplyTo(msg)} className="p-1.5 hover:bg-white/10 rounded text-[#8696a0]" title="Yanitla"><Reply size={14} /></button>
            <button onClick={() => setShowForward(msg)} className="p-1.5 hover:bg-white/10 rounded text-[#8696a0]" title="Ilet"><Forward size={14} /></button>
            {msg.isPinned ? <button onClick={() => unpinMessage(msg.id)} className="p-1.5 hover:bg-white/10 rounded text-[#ffd700]" title="Sabitlemeyi kaldir"><PinOff size={14} /></button> : <button onClick={() => pinMessage(msg.id)} className="p-1.5 hover:bg-white/10 rounded text-[#8696a0]" title="Sabitle"><Pin size={14} /></button>}
            {mine && <button onClick={() => deleteMessage(msg.id)} className="p-1.5 hover:bg-white/10 rounded text-red-400" title="Sil"><Trash2 size={14} /></button>}
          </div>}
          {showReactions && <div className="absolute -top-16 right-0 flex gap-0.5 bg-[#1f2c33] rounded-lg shadow-xl border border-[#2a3942] px-2 py-1.5 animate-scale-in z-20">{["❤️","😂","😮","😢","🔥","👍"].map(e => <button key={e} onClick={() => { addReaction(msg.id, e); setShowReactions(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>)}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen">
      <div className="h-full w-full flex bg-[#0b141a]">
        <div className="fixed top-0 left-0 right-0 h-[127px] bg-gradient-to-r from-[#00a884] to-[#25d366] z-0"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto flex h-[calc(100%-14px)] my-[7px] shadow-2xl overflow-hidden rounded-[3px]">

          {/* ===== SIDEBAR ===== */}
          <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-[420px] bg-[#111b21] border-r border-[#2a3942] shrink-0`}>
            {/* Header */}
            <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfile(true)}><Av src={user?.avatar} name={user?.displayName} size="w-10 h-10" ts="text-xs" /></div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setShowCreateStory(true)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5" title="Hikaye"><div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center"><Plus size={12} /></div></button>
                {user?.role === "admin" && <button onClick={() => navigate("/admin")} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Shield size={20} /></button>}
                <button onClick={() => setShowFriendRequests(true)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5 relative"><UserPlus size={20} />{pendingRequests > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00a884] rounded-full text-[10px] font-bold text-[#111b21] flex items-center justify-center">{pendingRequests}</span>}</button>
                <button onClick={() => setShowSettings(true)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Settings size={20} /></button>
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Search size={20} /></button>
                <button onClick={logout} className="p-2 text-[#8696a0] hover:text-red-400 rounded-full hover:bg-white/5"><LogOut size={20} /></button>
              </div>
            </div>

            {/* Search */}
            {showSearch && <div className="px-3 py-2 bg-[#111b21] animate-fade-in"><div className="flex items-center gap-2 bg-[#2a3942] rounded-xl px-4 py-2"><Search size={16} className="text-[#8696a0]"/><input type="text" value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setGlobalSearchQuery(e.target.value)}} onKeyDown={e=>{if(e.key==="Enter")globalSearch()}} placeholder="Kisi veya mesaj ara..." autoFocus className="flex-1 bg-transparent text-[#e9edef] text-[13px] focus:outline-none placeholder-[#8696a0]"/>{searchQuery&&<button onClick={()=>{setSearchQuery("");setMsgSearchResults([]);setShowGlobalSearch(false)}}><X size={16} className="text-[#8696a0]"/></button>}<button onClick={globalSearch} className="text-[#00a884] hover:text-[#25d366] text-xs font-bold">Ara</button></div>
            {showGlobalSearch && msgSearchResults.length > 0 && <div className="mt-2 bg-[#1f2c33] rounded-xl border border-[#2a3942] max-h-[200px] overflow-y-auto">{msgSearchResults.map(m=>(<div key={m.id} className="px-3 py-2 border-b border-[#2a3942]/30 hover:bg-[#233138] cursor-pointer" onClick={()=>{if(m.receiverId){const u=users.find(x=>x.id===(m.senderId===user.id?m.receiverId:m.senderId));if(u)openChat(u);}setShowGlobalSearch(false);setShowSearch(false)}}><p className="text-[11px] text-[#00a884] font-bold">{m.senderDisplayName} <span className="text-[#8696a0] font-normal">{formatDate(m.createdAt)}</span></p><p className="text-[12px] text-[#e9edef] truncate">{truncate(m.content, 60)}</p></div>))}</div>}
            </div>}

            {/* Stories bar */}
            {tab === "chats" && stories.length > 0 && !searchQuery && (
              <div className="flex gap-3 px-4 py-3 overflow-x-auto border-b border-[#2a3942]/50 bg-[#111b21]">
                <button onClick={() => setShowCreateStory(true)} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center border-2 border-dashed border-[#00a884]"><Plus size={20} className="text-[#00a884]" /></div>
                  <span className="text-[10px] text-[#8696a0]">Ekle</span>
                </button>
                {stories.map(s => (
                  <button key={s.userId} onClick={() => { setShowStoryViewer(s); if (s.stories[0]) viewStory(s.stories[0].id); }} className="flex flex-col items-center gap-1 shrink-0">
                    <Av src={s.avatar} name={s.displayName} size="w-14 h-14" ts="text-xs" story={s.stories.every(st => st.viewed) ? "seen" : "active"} />
                    <span className="text-[10px] text-[#8696a0] truncate max-w-[60px]">{s.userId === user.id ? "Siz" : s.displayName?.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#111b21] border-b border-[#2a3942]">
              {[{id:"chats",label:"Sohbetler"},{id:"groups",label:"Gruplar"},{id:"friends",label:"Kisiler"}].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider relative ${tab===t.id?"text-[#00a884]":"text-[#8696a0]"}`}>
                  {t.label}
                  {t.id === "chats" && totalUnread > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[#00a884] text-[#111b21] text-[10px] font-bold rounded-full">{totalUnread}</span>}
                  {tab === t.id && <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#00a884] rounded-t-full"></div>}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {/* Archived chats button */}
              {tab === "chats" && !searchQuery && archivedChats.length > 0 && !showArchived && (
                <button onClick={() => setShowArchived(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/30 text-[#00a884]">
                  <div className="w-12 h-12 rounded-full bg-[#00a884]/10 flex items-center justify-center"><Archive size={20} /></div>
                  <div className="text-left"><p className="font-semibold text-sm">Arsivlenmis</p><p className="text-[#8696a0] text-xs">{archivedChats.length} sohbet</p></div>
                </button>
              )}

              {/* Archived chats list */}
              {showArchived && (<>
                <button onClick={() => setShowArchived(false)} className="w-full flex items-center gap-3 px-4 py-3 bg-[#233138] border-b border-[#2a3942]/30 text-[#00a884]"><ArrowLeft size={18} /><span className="font-semibold text-sm">Arsivlenmis Sohbetler</span></button>
                {users.filter(u => archivedChats.includes(u.id)).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20 hover:bg-[#233138]/50">
                    <button onClick={() => { openChat(u); setShowArchived(false); }} className="flex items-center gap-3 flex-1 text-left"><Av src={u.avatar} name={u.displayName} on={isUserOnline(u.id)}/><p className="text-[#e9edef] text-[15px] font-medium truncate">{u.displayName||u.username}</p></button>
                    <button onClick={() => unarchiveChat(u.id)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5" title="Arsivden cikar"><Archive size={16} /></button>
                  </div>
                ))}
              </>)}

              {/* General chat button */}
              {tab === "chats" && !searchQuery && !showArchived && (
                <button onClick={() => { setView("general"); setSelectedUser(null); setSelectedGroup(null); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/30 ${view==="general"?"bg-[#233138]":""}`}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00a884] to-[#25d366] flex items-center justify-center"><Hash size={22} className="text-white" /></div>
                  <div className="flex-1 text-left"><p className="text-[#e9edef] text-[16px] font-semibold">Genel Sohbet</p><p className="text-[#8696a0] text-[13px]">{onlineUsers.length} katilimci</p></div>
                </button>
              )}

              {/* User list */}
              {tab === "chats" && !showArchived && (searchQuery ? filtered : users.filter(u => !archivedChats.includes(u.id))).map(u => (
                <div key={u.id} className={`flex items-center border-b border-[#2a3942]/20 transition-colors ${selectedUser?.id===u.id?"bg-[#233138]":"hover:bg-[#233138]/50"}`}>
                  <button onClick={() => openChat(u)} className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                    <Av src={u.avatar} name={u.displayName} on={isUserOnline(u.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline"><p className="text-[#e9edef] text-[15px] font-medium truncate">{u.displayName||u.username}</p>{lastMessages[u.id] && <span className="text-[11px] text-[#8696a0] shrink-0 ml-2">{formatDate(lastMessages[u.id].createdAt)}</span>}</div>
                      <div className="flex justify-between items-center"><p className="text-[#8696a0] text-[13px] truncate">{lastMessages[u.id] ? (lastMessages[u.id].type === "image" ? "Fotograf" : lastMessages[u.id].type === "voice" ? "Sesli mesaj" : truncate(lastMessages[u.id].content, 35)) : isUserOnline(u.id) ? "Cevrimici" : "Cevrimdisi"}</p>
                      {unreadCounts[u.id] > 0 && <span className="px-[7px] py-[2px] bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full ml-2 shrink-0">{unreadCounts[u.id]}</span>}</div>
                    </div>
                  </button>
                  <button onClick={() => archiveChat(u.id)} className="p-2 mr-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5 opacity-0 group-hover:opacity-100" title="Arsivle"><Archive size={16} /></button>
                </div>
              ))}

              {/* Groups list */}
              {tab === "groups" && (<>
                <button onClick={() => setShowCreateGroup(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/30 text-[#00a884]">
                  <div className="w-12 h-12 rounded-full bg-[#00a884]/10 flex items-center justify-center"><Plus size={22} /></div>
                  <p className="font-semibold">Yeni Grup Olustur</p>
                </button>
                {groups.map(g => (
                  <button key={g.id} onClick={() => openGroup(g)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20 ${selectedGroup?.id===g.id?"bg-[#233138]":"hover:bg-[#233138]/50"}`}>
                    <Av src={g.avatar} name={g.name} />
                    <div className="flex-1 text-left min-w-0"><p className="text-[#e9edef] text-[15px] font-medium truncate">{g.name}</p><p className="text-[#8696a0] text-[13px] truncate">{g.lastMessage ? `${g.lastMessage.senderName}: ${truncate(g.lastMessage.content, 25)}` : `${g.memberCount} uye`}</p></div>
                  </button>
                ))}
                {groups.length === 0 && <div className="text-center py-16 text-[#8696a0]"><Users size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Henuz grup yok</p></div>}
              </>)}

              {/* Friends list */}
              {tab === "friends" && (<>
                {friends.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20 hover:bg-[#233138]/50">
                    <button onClick={() => openChat(f)} className="flex items-center gap-3 flex-1 text-left">
                      <Av src={f.avatar} name={f.displayName} on={isUserOnline(f.id)} />
                      <div><p className="text-[#e9edef] text-[15px] font-medium">{f.displayName||f.username}</p><p className="text-[#8696a0] text-[13px]">{isUserOnline(f.id)?"Cevrimici":"Cevrimdisi"}</p></div>
                    </button>
                    <button onClick={() => removeFriend(f.id)} className="p-2 text-[#8696a0] hover:text-red-400 rounded-full hover:bg-white/5"><UserMinus size={18} /></button>
                  </div>
                ))}
                <div className="px-4 py-3 border-t border-[#2a3942]/30"><p className="text-[#8696a0] text-xs font-bold uppercase tracking-wider mb-2">Tum Kullanicilar</p></div>
                {users.filter(u => !friends.some(f => f.id === u.id)).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20 hover:bg-[#233138]/50">
                    <Av src={u.avatar} name={u.displayName} size="w-10 h-10" ts="text-xs" on={isUserOnline(u.id)} />
                    <p className="flex-1 text-[#e9edef] text-[14px]">{u.displayName||u.username}</p>
                    <button onClick={() => sendFriendRequest(u.id)} className="p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-full"><UserPlus size={18} /></button>
                  </div>
                ))}
              </>)}
            </div>
            {/* Connection status */}
            <div className={`px-4 py-1.5 text-center text-[11px] font-semibold ${connected ? "bg-[#00a884]/5 text-[#00a884]" : "bg-red-500/10 text-red-400 animate-pulse"}`}>
              {connected ? <span className="flex items-center justify-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#00a884]"></div>Bagli</span> : <span className="flex items-center justify-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>Baglaniliyor...</span>}
            </div>
          </div>

          {/* ===== CHAT AREA ===== */}
          <div className={`${!showSidebar?"flex":"hidden"} md:flex flex-col flex-1 min-w-0`}>
            {(view==="general"||(view==="private"&&selectedUser)||(view==="group"&&selectedGroup)) ? (<>
              {/* Chat header */}
              <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <button onClick={goBack} className="md:hidden p-1 text-[#8696a0]"><ArrowLeft size={22}/></button>
                  {view==="private"&&selectedUser?(<div className="flex items-center gap-3 cursor-pointer" onClick={()=>setShowUserProfile(selectedUser)}><Av src={selectedUser.avatar} name={selectedUser.displayName} size="w-10 h-10" ts="text-xs" on={isUserOnline(selectedUser.id)}/><div><h3 className="text-[#e9edef] font-bold text-[16px]">{selectedUser.displayName||selectedUser.username}</h3><p className="text-[#8696a0] text-[12px]">{typingUser?.userId===selectedUser.id?<span className="text-[#00a884] italic">yaziyor...</span>:isUserOnline(selectedUser.id)?"cevrimici":"cevrimdisi"}</p></div></div>):
                  view==="group"&&selectedGroup?(<><Av src={selectedGroup.avatar} name={selectedGroup.name} size="w-10 h-10" ts="text-xs"/><div><h3 className="text-[#e9edef] font-bold text-[16px]">{selectedGroup.name}</h3><p className="text-[#8696a0] text-[12px]">{typingUser?.groupId===selectedGroup.id?<span className="text-[#00a884] italic">{typingUser.displayName} yaziyor...</span>:`${selectedGroup.memberCount||"?"} uye`}</p></div></>):
                  (<><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#25d366] flex items-center justify-center"><Hash size={20} className="text-white"/></div><div><h3 className="text-[#e9edef] font-bold text-[16px]">Genel Sohbet</h3><p className="text-[#8696a0] text-[12px]">{typingUser?<span className="text-[#00a884] italic">{typingUser.displayName} yaziyor...</span>:`${onlineUsers.length} katilimci`}</p></div></>)}
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setShowChatSearch(!showChatSearch)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5"><Search size={20}/></button>
                  {view==="private"&&selectedUser&&<><button onClick={()=>startCall(selectedUser,false)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5" title="Sesli arama"><Phone size={20}/></button><button onClick={()=>startCall(selectedUser,true)} className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-white/5" title="Goruntulu arama"><Video size={20}/></button><button onClick={()=>blockUser(selectedUser.id)} className="p-2 text-[#8696a0] hover:text-red-400 rounded-full hover:bg-white/5"><Ban size={20}/></button></>}
                </div>
              </div>

              {/* Chat search */}
              {showChatSearch && <div className="px-3 py-2 bg-[#202c33] border-b border-[#2a3942] animate-fade-in"><div className="flex items-center gap-3 bg-[#2a3942] rounded-xl px-4 py-2"><Search size={16} className="text-[#8696a0]"/><input type="text" value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Mesajlarda ara..." autoFocus className="flex-1 bg-transparent text-[#e9edef] text-[13px] focus:outline-none placeholder-[#8696a0]"/>{chatSearch&&<button onClick={()=>setChatSearch("")}><X size={16} className="text-[#8696a0]"/></button>}</div></div>}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto chat-bg px-4 md:px-16 py-3">
                {view==="private"&&<div className="flex justify-center mb-4"><div className="bg-[#233138]/90 text-[#8696a0] text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Lock size={12}/>Mesajlar uctan uca sifrelenmistir</div></div>}
                {filteredMsgs.map((msg,i)=><MsgBubble key={msg.id} msg={msg} i={i} msgs={filteredMsgs}/>)}
                {typingUser&&(view==="general"||(view==="private"&&typingUser.userId===selectedUser?.id)||(view==="group"&&typingUser.groupId===selectedGroup?.id))&&<div className="flex mb-1"><div className="flex gap-[5px] bg-[#202c33] rounded-lg px-4 py-3 shadow-sm"><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div><div className="w-[7px] h-[7px] bg-[#8696a0] rounded-full typing-dot"></div></div></div>}
                <div ref={messagesEndRef}/>
              </div>

              {/* Reply bar */}
              {replyTo && <div className="bg-[#1f2c33] px-4 py-2 border-t border-[#2a3942] flex items-center gap-3 animate-fade-in"><div className="flex-1 border-l-[3px] border-[#00a884] pl-3"><p className="text-[12px] text-[#00a884] font-bold">{replyTo.senderDisplayName || replyTo.senderName}</p><p className="text-[12px] text-[#8696a0] truncate">{replyTo.type === "image" ? "Fotograf" : truncate(replyTo.content, 60)}</p></div><button onClick={() => setReplyTo(null)} className="text-[#8696a0] hover:text-white"><X size={18} /></button></div>}

              {/* Input */}
              <div className="bg-[#202c33] px-3 md:px-5 py-2.5 flex items-end gap-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={e=>handleFileSend(e,"image")} className="hidden"/>
                <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt,.zip,.rar" onChange={e=>handleFileSend(e,"file")} className="hidden"/>
                <button onClick={()=>setShowEmoji(!showEmoji)} className={`p-2 shrink-0 transition-colors ${showEmoji?"text-[#00a884]":"text-[#8696a0] hover:text-[#00a884]"}`}><Smile size={24}/></button>
                <button onClick={()=>fileInputRef.current?.click()} className="p-2 text-[#8696a0] hover:text-[#00a884] shrink-0"><Image size={24}/></button>
                <button onClick={()=>docInputRef.current?.click()} className="p-2 text-[#8696a0] hover:text-[#00a884] shrink-0"><Paperclip size={24}/></button>
                <div className="flex-1 relative">
                  {showEmoji && <div className="absolute bottom-full mb-2 left-0 bg-[#1f2c33] border border-[#2a3942] rounded-xl shadow-2xl p-3 animate-scale-in z-20 w-[300px]"><div className="emoji-grid">{EMOJIS.map(e=><button key={e} onClick={()=>{setNewMessage(p=>p+e);setShowEmoji(false)}} className="emoji-btn">{e}</button>)}</div></div>}
                  <input type="text" value={newMessage} onChange={handleTyping} onKeyDown={e=>{if(e.key==="Enter")sendMessage()}} placeholder="Bir mesaj yazin" className="w-full px-4 py-[9px] bg-[#2a3942] rounded-xl text-[#e9edef] text-[15px] focus:outline-none placeholder-[#8696a0]"/>
                </div>
                {newMessage.trim() ? <button onClick={sendMessage} className="p-2 text-[#00a884] hover:text-[#25d366] shrink-0"><Send size={24}/></button> :
                <button onClick={isRecording?stopRecording:startRecording} className={`p-2 shrink-0 ${isRecording?"text-red-400 animate-pulse":"text-[#8696a0] hover:text-[#00a884]"}`}>{isRecording?<MicOff size={24}/>:<Mic size={24}/>}</button>}
              </div>
            </>):(<div className="flex-1 flex flex-col items-center justify-center bg-[#0b141a]/50">
              <div className="text-center animate-slide-up">
                <div className="w-64 h-64 mx-auto mb-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/20 to-transparent rounded-full animate-pulse"></div>
                  <svg className="w-full h-full opacity-[0.08]" viewBox="0 0 100 100" fill="none"><path d="M50 20c-16.57 0-30 12.54-30 28.01 0 5.25 1.56 10.13 4.24 14.25L20 80l18.38-4.82A30.5 30.5 0 0050 76.02C66.57 76.02 80 63.48 80 47.01S66.57 20 50 20z" fill="#8696a0"/></svg>
                </div>
                <h2 className="text-[#e9edef] text-[32px] font-light mb-3">SohbetApp</h2>
                <p className="text-[#8696a0] text-sm max-w-[420px] mx-auto leading-relaxed mb-2">Arkadaslariniz ve gruplarina mesaj gonderin,<br/>hikayeler paylasin, goruntulu arama yapin</p>
                <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#233138]/50 text-[#8696a0] text-[13px]"><Lock size={14} className="text-[#00a884]"/>Uctan uca sifrelenmis</div>
                <div className="mt-4 flex items-center justify-center gap-6 text-[#8696a0]">
                  <div className="flex items-center gap-1.5 text-xs"><MessageCircle size={14} className="text-[#00a884]"/>Mesaj</div>
                  <div className="flex items-center gap-1.5 text-xs"><Video size={14} className="text-[#00a884]"/>Video</div>
                  <div className="flex items-center gap-1.5 text-xs"><Users size={14} className="text-[#00a884]"/>Grup</div>
                  <div className="flex items-center gap-1.5 text-xs"><Eye size={14} className="text-[#00a884]"/>Hikaye</div>
                </div>
              </div>
            </div>)}
          </div>
        </div>

        {/* ===== MODALS ===== */}
        
        {/* Forward modal */}
        {showForward && <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowForward(null)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-sm shadow-2xl max-h-[70vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
          <div className="p-4 border-b border-[#2a3942] flex justify-between items-center"><h3 className="text-[#e9edef] font-bold">Mesaji Ilet</h3><button onClick={()=>setShowForward(null)}><X size={20} className="text-[#8696a0]"/></button></div>
          <div className="overflow-y-auto max-h-[50vh]">
            {users.map(u=>(<button key={u.id} onClick={()=>forwardMessage(showForward.id,{type:"user",id:u.id})} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/20"><Av src={u.avatar} name={u.displayName} size="w-10 h-10" ts="text-xs"/><p className="text-[#e9edef] text-sm">{u.displayName||u.username}</p></button>))}
            {groups.map(g=>(<button key={g.id} onClick={()=>forwardMessage(showForward.id,{type:"group",id:g.id})} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#233138] border-b border-[#2a3942]/20"><Av src={g.avatar} name={g.name} size="w-10 h-10" ts="text-xs"/><p className="text-[#e9edef] text-sm">{g.name} <span className="text-[#8696a0] text-xs">(grup)</span></p></button>))}
          </div>
        </div></div>}

        {/* Profile modal */}
        {showProfile&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}><div className="bg-gradient-to-r from-[#00a884] to-[#25d366] p-6 rounded-t-xl"><div className="flex items-center justify-between"><h3 className="text-white text-lg font-bold">Profil</h3><button onClick={()=>setShowProfile(false)} className="text-white/70 hover:text-white"><X size={22}/></button></div></div><div className="p-6"><div className="flex flex-col items-center -mt-14 mb-6"><div className="relative group">{user?.avatar?<img src={user.avatar} className="w-[100px] h-[100px] rounded-full object-cover border-4 border-[#1f2c33]" alt=""/>:<div className="w-[100px] h-[100px] rounded-full bg-[#2a3942] flex items-center justify-center text-2xl font-bold text-[#8696a0] border-4 border-[#1f2c33]">{getInitials(user?.displayName)}</div>}<label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer"><Camera size={28} className="text-white"/><input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/></label></div></div><div className="space-y-5"><div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Gorunen Ad</label><input type="text" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} className="w-full px-4 py-2.5 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]"/></div><div><label className="block text-[#00a884] text-xs font-bold uppercase tracking-wider mb-2">Hakkinda</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={2} className="w-full px-4 py-2.5 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] resize-none" placeholder="Durum bilgisi..."/></div></div><button onClick={updateProfile} className="w-full mt-6 py-3 bg-gradient-to-r from-[#00a884] to-[#25d366] text-white font-bold rounded-xl">Kaydet</button></div></div></div>}

        {/* Settings modal */}
        {showSettings&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowSettings(false)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}><div className="p-4 border-b border-[#2a3942]"><div className="flex justify-between items-center"><h3 className="text-[#e9edef] font-bold">Gizlilik Ayarlari</h3><button onClick={()=>setShowSettings(false)}><X size={20} className="text-[#8696a0]"/></button></div></div><div className="p-4 space-y-4">
          <div className="flex items-center justify-between"><div><p className="text-[#e9edef] text-sm font-semibold">Cevrimici Durumu</p><p className="text-[#8696a0] text-xs">Baskalarinin sizi cevrimici gormesi</p></div><button onClick={()=>updatePrivacy("showOnline",!user?.showOnline)} className={`w-12 h-6 rounded-full transition-colors relative ${user?.showOnline?"bg-[#00a884]":"bg-[#2a3942]"}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${user?.showOnline?"translate-x-6":"translate-x-0.5"}`}></div></button></div>
          <div className="flex items-center justify-between"><div><p className="text-[#e9edef] text-sm font-semibold">Son Gorulen</p><p className="text-[#8696a0] text-xs">Son gorulme zamaninizi gizleyin</p></div><button onClick={()=>updatePrivacy("showLastSeen",!user?.showLastSeen)} className={`w-12 h-6 rounded-full transition-colors relative ${user?.showLastSeen?"bg-[#00a884]":"bg-[#2a3942]"}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${user?.showLastSeen?"translate-x-6":"translate-x-0.5"}`}></div></button></div>
        </div></div></div>}

        {/* Create Group modal */}
        {showCreateGroup&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowCreateGroup(false)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
          <div className="p-4 border-b border-[#2a3942]"><div className="flex justify-between items-center"><h3 className="text-[#e9edef] font-bold">Yeni Grup</h3><button onClick={()=>setShowCreateGroup(false)}><X size={20} className="text-[#8696a0]"/></button></div></div>
          <div className="p-4 space-y-4">
            <input type="text" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Grup adi" className="w-full px-4 py-2.5 bg-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0]"/>
            <p className="text-[#8696a0] text-xs font-bold uppercase">Uye Ekle</p>
            <div className="max-h-[200px] overflow-y-auto space-y-1">{users.map(u=>(<button key={u.id} onClick={()=>setNewGroupMembers(p=>p.includes(u.id)?p.filter(x=>x!==u.id):[...p,u.id])} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${newGroupMembers.includes(u.id)?"bg-[#00a884]/10":"hover:bg-[#233138]"}`}><Av src={u.avatar} name={u.displayName} size="w-8 h-8" ts="text-[10px]"/><p className="text-[#e9edef] text-sm flex-1">{u.displayName||u.username}</p>{newGroupMembers.includes(u.id)&&<Check size={18} className="text-[#00a884]"/>}</button>))}</div>
            <button onClick={createGroup} className="w-full py-3 bg-gradient-to-r from-[#00a884] to-[#25d366] text-white font-bold rounded-xl">{newGroupMembers.length>0?`Grup Olustur (${newGroupMembers.length} uye)`:"Grup Olustur"}</button>
          </div>
        </div></div>}

        {/* Create Story modal */}
        {showCreateStory&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowCreateStory(false)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="p-4 border-b border-[#2a3942]"><div className="flex justify-between items-center"><h3 className="text-[#e9edef] font-bold">Yeni Hikaye</h3><button onClick={()=>setShowCreateStory(false)}><X size={20} className="text-[#8696a0]"/></button></div></div>
          <div className="p-4 space-y-4">
            <div className="aspect-[9/16] max-h-[300px] rounded-xl flex items-center justify-center" style={{background:storyBg}}>{storyImage?<img src={storyImage} className="max-w-full max-h-full rounded-xl object-contain" alt=""/>:<textarea value={storyText} onChange={e=>setStoryText(e.target.value)} placeholder="Hikayenizi yazin..." className="w-full h-full bg-transparent text-white text-center text-xl font-bold focus:outline-none placeholder-white/50 p-6 resize-none"/>}</div>
            <div className="flex gap-2">{["#00a884","#128c7e","#075e54","#25d366","#34b7f1","#e91e63","#9c27b0","#ff9800"].map(c=>(<button key={c} onClick={()=>setStoryBg(c)} className={`w-8 h-8 rounded-full ${storyBg===c?"ring-2 ring-white ring-offset-2 ring-offset-[#1f2c33]":""}`} style={{background:c}}/>))}</div>
            <div className="flex gap-2"><label className="flex-1 py-2.5 bg-[#2a3942] rounded-xl text-center text-[#8696a0] text-sm cursor-pointer hover:bg-[#3a4a52]"><Image size={16} className="inline mr-2"/>Fotograf Ekle<input type="file" accept="image/*" onChange={async(e)=>{const f=e.target.files[0];if(f){const b=await fileToBase64(f);setStoryImage(b)}e.target.value=""}} className="hidden"/></label></div>
            <button onClick={createStory} className="w-full py-3 bg-gradient-to-r from-[#00a884] to-[#25d366] text-white font-bold rounded-xl">Paylas</button>
          </div>
        </div></div>}

        {/* Story Viewer */}
        {showStoryViewer&&<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={()=>setShowStoryViewer(null)}>
          <div className="w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3"><Av src={showStoryViewer.avatar} name={showStoryViewer.displayName} size="w-10 h-10" ts="text-xs"/><div><p className="text-white font-bold text-sm">{showStoryViewer.displayName}</p><p className="text-white/50 text-xs">{formatDate(showStoryViewer.stories[0]?.createdAt)}</p></div><button onClick={()=>setShowStoryViewer(null)} className="ml-auto text-white/70"><X size={24}/></button></div>
            {showStoryViewer.stories[0] && (<div className="aspect-[9/16] max-h-[70vh] rounded-xl mx-4 flex items-center justify-center" style={{background:showStoryViewer.stories[0].bgColor||"#00a884"}}>{showStoryViewer.stories[0].mediaData?<img src={showStoryViewer.stories[0].mediaData} className="max-w-full max-h-full rounded-xl object-contain" alt=""/>:<p className="text-white text-xl font-bold text-center px-8">{showStoryViewer.stories[0].content}</p>}</div>)}
            <div className="flex items-center justify-center gap-2 mt-3 text-white/50 text-xs"><Eye size={14}/>{showStoryViewer.stories[0]?.viewCount || 0} goruntulenme</div>
          </div>
        </div>}

        {/* Friend Requests modal */}
        {showFriendRequests&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowFriendRequests(false)}><div className="bg-[#1f2c33] rounded-xl w-full max-w-sm shadow-2xl max-h-[70vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
          <div className="p-4 border-b border-[#2a3942]"><div className="flex justify-between items-center"><h3 className="text-[#e9edef] font-bold">Arkadas Istekleri</h3><button onClick={()=>setShowFriendRequests(false)}><X size={20} className="text-[#8696a0]"/></button></div></div>
          <div className="overflow-y-auto max-h-[50vh]">
            {friendRequests.incoming?.length > 0 && <><p className="px-4 pt-3 text-[#00a884] text-xs font-bold uppercase">Gelen Istekler</p>{friendRequests.incoming.map(u=>(<div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20"><Av src={u.avatar} name={u.displayName} size="w-10 h-10" ts="text-xs"/><p className="flex-1 text-[#e9edef] text-sm">{u.displayName||u.username}</p><button onClick={()=>acceptFriend(u.id)} className="px-3 py-1.5 bg-[#00a884] text-white text-xs font-bold rounded-lg">Kabul</button><button onClick={()=>rejectFriend(u.id)} className="px-3 py-1.5 bg-[#2a3942] text-[#8696a0] text-xs font-bold rounded-lg">Red</button></div>))}</>}
            {friendRequests.outgoing?.length > 0 && <><p className="px-4 pt-3 text-[#8696a0] text-xs font-bold uppercase">Gonderilen Istekler</p>{friendRequests.outgoing.map(u=>(<div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]/20"><Av src={u.avatar} name={u.displayName} size="w-10 h-10" ts="text-xs"/><p className="flex-1 text-[#e9edef] text-sm">{u.displayName||u.username}</p><span className="text-[#8696a0] text-xs">Bekleniyor</span></div>))}</>}
            {(!friendRequests.incoming?.length && !friendRequests.outgoing?.length) && <div className="text-center py-12 text-[#8696a0]"><UserPlus size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">Arkadas istegi yok</p></div>}
          </div>
        </div></div>}

        {/* ===== USER PROFILE VIEW ===== */}
        {showUserProfile && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowUserProfile(null)}>
            <div className="bg-[#111b21] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in" onClick={e=>e.stopPropagation()}>
              {/* Cover gradient */}
              <div className="h-32 bg-gradient-to-br from-[#00a884] via-[#128c7e] to-[#075e54] relative">
                <button onClick={()=>setShowUserProfile(null)} className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/20 rounded-full p-1.5"><X size={20}/></button>
              </div>
              {/* Avatar */}
              <div className="flex flex-col items-center -mt-16 pb-2">
                {showUserProfile.avatar ? 
                  <img src={showUserProfile.avatar} className="w-[120px] h-[120px] rounded-full object-cover border-4 border-[#111b21] shadow-xl" alt="" /> :
                  <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#2a3942] to-[#1f2c33] flex items-center justify-center text-3xl font-bold text-[#8696a0] border-4 border-[#111b21] shadow-xl">{getInitials(showUserProfile.displayName)}</div>
                }
                <h2 className="text-[#e9edef] text-xl font-bold mt-3">{showUserProfile.displayName || showUserProfile.username}</h2>
                <p className="text-[#8696a0] text-sm">@{showUserProfile.username}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isUserOnline(showUserProfile.id) ? "bg-[#00a884]" : "bg-[#8696a0]"}`}></div>
                  <span className="text-[#8696a0] text-xs">{isUserOnline(showUserProfile.id) ? "Cevrimici" : "Cevrimdisi"}</span>
                </div>
              </div>
              {/* Bio */}
              {showUserProfile.bio && <div className="px-6 py-3 border-t border-[#2a3942]"><p className="text-[#8696a0] text-xs font-bold uppercase tracking-wider mb-1">Hakkinda</p><p className="text-[#e9edef] text-sm">{showUserProfile.bio}</p></div>}
              {/* Action buttons */}
              <div className="px-6 py-4 border-t border-[#2a3942] grid grid-cols-4 gap-2">
                <button onClick={()=>{openChat(showUserProfile);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#00a884]/10 hover:bg-[#00a884]/20 transition-colors"><MessageCircle size={22} className="text-[#00a884]"/><span className="text-[10px] text-[#00a884] font-bold">Mesaj</span></button>
                <button onClick={()=>{startCall(showUserProfile,false);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#00a884]/10 hover:bg-[#00a884]/20 transition-colors"><Phone size={22} className="text-[#00a884]"/><span className="text-[10px] text-[#00a884] font-bold">Ara</span></button>
                <button onClick={()=>{startCall(showUserProfile,true);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#00a884]/10 hover:bg-[#00a884]/20 transition-colors"><Video size={22} className="text-[#00a884]"/><span className="text-[10px] text-[#00a884] font-bold">Video</span></button>
                <button onClick={()=>{sendFriendRequest(showUserProfile.id)}} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#00a884]/10 hover:bg-[#00a884]/20 transition-colors"><UserPlus size={22} className="text-[#00a884]"/><span className="text-[10px] text-[#00a884] font-bold">Ekle</span></button>
              </div>
              {/* Danger zone */}
              <div className="px-6 py-3 border-t border-[#2a3942]">
                <button onClick={()=>{blockUser(showUserProfile.id);setShowUserProfile(null)}} className="w-full flex items-center gap-3 py-2.5 text-red-400 hover:text-red-300"><Ban size={18}/><span className="text-sm font-semibold">Kullaniciyi Engelle</span></button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CALL UI ===== */}
        {callState && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{background: callIsVideo ? "black" : "linear-gradient(135deg, #075e54 0%, #128c7e 50%, #00a884 100%)"}}>
            {/* Video streams */}
            {callIsVideo && callState === "connected" && (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-44 rounded-xl object-cover border-2 border-white/30 shadow-2xl z-10" />
              </>
            )}
            
            {/* Call info overlay */}
            <div className="relative z-20 flex flex-col items-center text-white">
              {(!callIsVideo || callState !== "connected") && (
                <>
                  <div className="mb-6">
                    {callTarget?.avatar ? 
                      <img src={callTarget.avatar} className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl" alt="" /> :
                      <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/20">{getInitials(callTarget?.displayName)}</div>
                    }
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{callTarget?.displayName}</h2>
                  <p className="text-white/70 text-sm mb-8">
                    {callState === "calling" && <span className="animate-pulse">Araniyor...</span>}
                    {callState === "incoming" && <span className="animate-pulse">{callIsVideo ? "Goruntulu" : "Sesli"} arama geliyor...</span>}
                    {callState === "connected" && formatCallDuration(callDuration)}
                  </p>
                </>
              )}
              
              {callState === "connected" && callIsVideo && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
                  <p className="text-white/90 text-lg font-semibold bg-black/30 backdrop-blur-sm px-4 py-1 rounded-full">{formatCallDuration(callDuration)}</p>
                </div>
              )}

              {/* Call buttons */}
              <div className="flex items-center gap-6">
                {callState === "incoming" && (
                  <>
                    <button onClick={rejectCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 transition-colors shadow-red-500/30"><PhoneOff size={28} className="text-white" /></button>
                    <button onClick={answerCall} className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center shadow-2xl hover:bg-[#008069] transition-colors relative shadow-[#00a884]/30"><div className="absolute inset-0 bg-[#00a884] rounded-full animate-ping opacity-30"></div>{callIsVideo ? <Video size={28} className="text-white relative z-10" /> : <Phone size={28} className="text-white relative z-10" />}</button>
                  </>
                )}
                {(callState === "calling" || callState === "connected") && (
                  <button onClick={endCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 transition-colors"><PhoneOff size={28} className="text-white" /></button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
