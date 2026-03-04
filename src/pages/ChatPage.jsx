import{useState,useEffect,useRef,useCallback}from"react";
import{useNavigate}from"react-router-dom";
import{useAuth}from"../context/AuthContext";
import{useSocket}from"../context/SocketContext";
import api from"../utils/api";
import{formatTime,formatDate,getInitials,truncate,fileToBase64,playNotif,playCallSound,EMOJIS,QUICK_REACTIONS,STORY_COLORS}from"../utils/helpers";
import toast from"react-hot-toast";
import{Send,Image,Mic,MicOff,Trash2,Ban,Search,LogOut,Users,X,Shield,Check,CheckCheck,Camera,ArrowLeft,Lock,Smile,Reply,Forward,Pin,PinOff,UserPlus,UserMinus,Phone,Video,PhoneOff,Plus,Settings,Eye,MessageCircle,Paperclip,FileText,Bell,Zap,Activity}from"lucide-react";

export default function ChatPage(){
const{user,logout,updateUser}=useAuth();
const{socket,onlineUsers,connected,isOnline}=useSocket();
const nav=useNavigate();
const[view,setView]=useState("general");
const[tab,setTab]=useState("chats");
const[selUser,setSelUser]=useState(null);
const[selGroup,setSelGroup]=useState(null);
const[users,setUsers]=useState([]);
const[msgs,setMsgs]=useState([]);
const[pmMsgs,setPmMsgs]=useState([]);
const[gMsgs,setGMsgs]=useState([]);
const[text,setText]=useState("");
const[unread,setUnread]=useState({});
const[lastMsgs,setLastMsgs]=useState({});
const[typing,setTyping]=useState(null);
const[sidebar,setSidebar]=useState(true);
const[search,setSearch]=useState("");
const[showSearch,setShowSearch]=useState(false);
const[chatSearch,setChatSearch]=useState("");
const[showChatSearch,setShowChatSearch]=useState(false);
const[groups,setGroups]=useState([]);
const[stories,setStories]=useState([]);
const[friends,setFriends]=useState([]);
const[friendReqs,setFriendReqs]=useState({incoming:[],outgoing:[]});
const[showEmoji,setShowEmoji]=useState(false);
const[replyTo,setReplyTo]=useState(null);
const[showFwd,setShowFwd]=useState(null);
const[recording,setRecording]=useState(false);
const[recorder,setRecorder]=useState(null);
const[showProfile,setShowProfile]=useState(false);
const[showSettings,setShowSettings]=useState(false);
const[showNewGroup,setShowNewGroup]=useState(false);
const[showNewStory,setShowNewStory]=useState(false);
const[showStory,setShowStory]=useState(null);
const[storyIdx,setStoryIdx]=useState(0);
const[showFriendReq,setShowFriendReq]=useState(false);
const[showUserProfile,setShowUserProfile]=useState(null);
const[showImgViewer,setShowImgViewer]=useState(null);
const[callState,setCallState]=useState(null);
const[callTarget,setCallTarget]=useState(null);
const[callVideo,setCallVideo]=useState(false);
const[callTime,setCallTime]=useState(0);
const callTmr=useRef(null);
const[editName,setEditName]=useState(user?.displayName||"");
const[editBio,setEditBio]=useState(user?.bio||"");
const[grpName,setGrpName]=useState("");
const[grpMembers,setGrpMembers]=useState([]);
const[storyText,setStoryText]=useState("");
const[storyBg,setStoryBg]=useState("#F0B90B");
const[storyImg,setStoryImg]=useState(null);
const endRef=useRef(null);
const fileRef=useRef(null);
const docRef=useRef(null);
const typeTmr=useRef(null);
const audioChunks=useRef([]);

const reload=useCallback(()=>{
  api.get("/users").then(r=>setUsers(r.data.users||[])).catch(()=>{});
  api.get("/messages/unread/counts").then(r=>setUnread(r.data.unreadCounts||{})).catch(()=>{});
  api.get("/messages/last-messages").then(r=>setLastMsgs(r.data.lastMessages||{})).catch(()=>{});
  api.get("/groups").then(r=>setGroups(r.data.groups||[])).catch(()=>{});
  api.get("/stories").then(r=>setStories(r.data.stories||[])).catch(()=>{});
  api.get("/friends").then(r=>setFriends(r.data.friends||[])).catch(()=>{});
  api.get("/friends/requests").then(r=>setFriendReqs(r.data||{incoming:[],outgoing:[]})).catch(()=>{});
},[]);
useEffect(()=>{reload()},[reload]);
useEffect(()=>{if(view==="general")api.get("/messages/room/general").then(r=>setMsgs(r.data.messages||[])).catch(()=>{})},[view]);
useEffect(()=>{if(view==="private"&&selUser){api.get("/messages/private/"+selUser.id).then(r=>{setPmMsgs(r.data.messages||[]);if(socket)socket.emit("markAllRead",{senderId:selUser.id});setUnread(p=>({...p,[selUser.id]:0}))}).catch(()=>{})}},[view,selUser]);
useEffect(()=>{if(view==="group"&&selGroup){api.get("/messages/group/"+selGroup.id).then(r=>setGMsgs(r.data.messages||[])).catch(()=>{});if(socket)socket.emit("joinGroup",{groupId:selGroup.id})}},[view,selGroup]);

useEffect(()=>{
  if(!socket)return;
  const h={
    newMessage:m=>{setMsgs(p=>[...p,m]);if(m.senderId!==user?.id)playNotif()},
    newPrivateMessage:m=>{
      if(view==="private"&&selUser&&(m.senderId===selUser.id||m.senderId===user?.id)){setPmMsgs(p=>[...p,m]);if(m.senderId===selUser.id&&socket)socket.emit("markAsRead",{messageId:m.id,senderId:m.senderId})}
      else if(m.senderId!==user?.id){setUnread(p=>({...p,[m.senderId]:(p[m.senderId]||0)+1}));playNotif()}
      setLastMsgs(p=>({...p,[m.senderId===user?.id?m.receiverId:m.senderId]:{content:m.content,type:m.type,createdAt:m.createdAt,senderId:m.senderId}}))},
    newGroupMessage:m=>{if(view==="group"&&selGroup?.id===m.groupId)setGMsgs(p=>[...p,m]);if(m.senderId!==user?.id)playNotif()},
    messageRead:({messageId,readAt})=>setPmMsgs(p=>p.map(m=>m.id===messageId?{...m,isRead:1,readAt}:m)),
    allMessagesRead:({readBy})=>{if(selUser?.id===readBy)setPmMsgs(p=>p.map(m=>m.senderId===user?.id?{...m,isRead:1}:m))},
    messageDeleted:({messageId})=>{const up=m=>m.id===messageId?{...m,deletedForAll:1,content:"[silindi]",mediaData:null}:m;setMsgs(p=>p.map(up));setPmMsgs(p=>p.map(up));setGMsgs(p=>p.map(up))},
    messageReaction:({messageId,reactions})=>{const up=m=>m.id===messageId?{...m,reactions}:m;setMsgs(p=>p.map(up));setPmMsgs(p=>p.map(up));setGMsgs(p=>p.map(up))},
    messagePinned:({messageId})=>{const up=m=>m.id===messageId?{...m,isPinned:1}:m;setMsgs(p=>p.map(up));setPmMsgs(p=>p.map(up));setGMsgs(p=>p.map(up))},
    messageUnpinned:({messageId})=>{const up=m=>m.id===messageId?{...m,isPinned:0}:m;setMsgs(p=>p.map(up));setPmMsgs(p=>p.map(up));setGMsgs(p=>p.map(up))},
    userTyping:d=>setTyping(d),
    userStopTyping:()=>setTyping(null),
    friendRequest:()=>{toast("Yeni arkadas istegi!",{icon:"⚡"});api.get("/friends/requests").then(r=>setFriendReqs(r.data)).catch(()=>{})},
    friendAccepted:()=>{toast.success("Kabul edildi!");api.get("/friends").then(r=>setFriends(r.data.friends||[])).catch(()=>{})},
    incomingCall:d=>{setCallTarget({id:d.callerId,displayName:d.callerName,avatar:d.callerAvatar});setCallVideo(d.isVideo);setCallState("incoming");playCallSound()},
    callAccepted:()=>{setCallState("connected");callTmr.current=setInterval(()=>setCallTime(p=>p+1),1000)},
    callRejected:()=>{cleanCall();toast("Reddedildi",{icon:"📞"})},
    callEnded:()=>{cleanCall();toast("Bitti",{icon:"📞"})},
  };
  Object.entries(h).forEach(([e,fn])=>socket.on(e,fn));
  return()=>Object.keys(h).forEach(e=>socket.off(e));
},[socket,view,selUser,selGroup,user]);
useEffect(()=>{setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50)},[msgs,pmMsgs,gMsgs]);

const cleanCall=()=>{if(callTmr.current)clearInterval(callTmr.current);setCallState(null);setCallTarget(null);setCallTime(0)};
const startCall=(t,v)=>{if(!socket)return toast.error("Baglanti yok");setCallTarget(t);setCallVideo(v);setCallState("calling");socket.emit("callUser",{receiverId:t.id,signal:{},isVideo:v});playCallSound()};
const answerCall=()=>{setCallState("connected");callTmr.current=setInterval(()=>setCallTime(p=>p+1),1000);socket?.emit("answerCall",{callerId:callTarget.id,signal:{}})};
const rejectCallFn=()=>{socket?.emit("rejectCall",{callerId:callTarget.id});cleanCall()};
const endCall=()=>{socket?.emit("endCall",{userId:callTarget.id});cleanCall()};
const fmtCall=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

const send=()=>{if(!text.trim()||!socket)return;const d={content:text.trim(),type:"text",replyToId:replyTo?.id||null};
if(view==="group"&&selGroup)socket.emit("sendGroupMessage",{...d,groupId:selGroup.id});
else if(view==="private"&&selUser)socket.emit("sendPrivateMessage",{...d,receiverId:selUser.id});
else socket.emit("sendMessage",{...d,roomId:"general"});
setText("");setReplyTo(null);setShowEmoji(false)};

const handleType=e=>{setText(e.target.value);if(socket){socket.emit("typing",{receiverId:selUser?.id,groupId:selGroup?.id});clearTimeout(typeTmr.current);typeTmr.current=setTimeout(()=>socket.emit("stopTyping",{receiverId:selUser?.id,groupId:selGroup?.id}),2000)}};

const sendFile=async(e)=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024)return toast.error("Max 10MB");
try{const b=await fileToBase64(f);const t=f.type.startsWith("image/")?"image":"file";const d={content:f.name,type:t,mediaData:b,fileName:f.name};
if(view==="group"&&selGroup)socket.emit("sendGroupMessage",{...d,groupId:selGroup.id});
else if(view==="private"&&selUser)socket.emit("sendPrivateMessage",{...d,receiverId:selUser.id});
else socket.emit("sendMessage",{...d,roomId:"general"});toast.success("Gonderildi!")}catch{toast.error("Hata")}e.target.value=""};

const startRec=async()=>{try{const s=await navigator.mediaDevices.getUserMedia({audio:true});const r=new MediaRecorder(s);audioChunks.current=[];r.ondataavailable=e=>{if(e.data.size>0)audioChunks.current.push(e.data)};
r.onstop=()=>{const b=new Blob(audioChunks.current,{type:"audio/webm"});s.getTracks().forEach(t=>t.stop());const rd=new FileReader();rd.readAsDataURL(b);rd.onload=()=>{const d={content:"Ses kaydi",type:"voice",mediaData:rd.result};
if(view==="group"&&selGroup)socket.emit("sendGroupMessage",{...d,groupId:selGroup.id});
else if(view==="private"&&selUser)socket.emit("sendPrivateMessage",{...d,receiverId:selUser.id});
else socket.emit("sendMessage",{...d,roomId:"general"})}};r.start();setRecorder(r);setRecording(true)}catch{toast.error("Mikrofon erisimi reddedildi")}};
const stopRec=()=>{if(recorder){recorder.stop();setRecording(false);setRecorder(null)}};

const del=id=>socket?.emit("deleteMessage",{messageId:id,receiverId:selUser?.id,groupId:selGroup?.id});
const react=(id,em)=>socket?.emit("addReaction",{messageId:id,emoji:em});
const pinMsg=id=>socket?.emit("pinMessage",{messageId:id});
const unpinMsg=id=>socket?.emit("unpinMessage",{messageId:id});
const fwd=(id,t)=>{socket?.emit("forwardMessage",{messageId:id,receiverId:t.type==="user"?t.id:null,groupId:t.type==="group"?t.id:null});setShowFwd(null);toast.success("Iletildi!")};
const block=async id=>{try{await api.post("/users/block/"+id);toast.success("Engellendi");setUsers(p=>p.filter(u=>u.id!==id));if(selUser?.id===id){setSelUser(null);setView("general")}}catch{}};
const addFriend=async id=>{try{await api.post("/friends/request/"+id);toast.success("Istek gonderildi!");api.get("/friends/requests").then(r=>setFriendReqs(r.data)).catch(()=>{})}catch(e){toast.error(e.response?.data?.error||"Hata")}};
const acceptFriend=async id=>{try{await api.put("/friends/accept/"+id);toast.success("Kabul!");api.get("/friends").then(r=>setFriends(r.data.friends||[])).catch(()=>{});api.get("/friends/requests").then(r=>setFriendReqs(r.data)).catch(()=>{})}catch{}};
const rejectFriend=async id=>{try{await api.put("/friends/reject/"+id);api.get("/friends/requests").then(r=>setFriendReqs(r.data)).catch(()=>{})}catch{}};
const delFriend=async id=>{try{await api.delete("/friends/"+id);setFriends(p=>p.filter(f=>f.id!==id))}catch{}};
const createGroup=async()=>{if(!grpName.trim())return toast.error("Grup adi gerekli");try{const r=await api.post("/groups",{name:grpName,memberIds:grpMembers});setGroups(p=>[r.data.group,...p]);setShowNewGroup(false);setGrpName("");setGrpMembers([]);toast.success("Olusturuldu!")}catch{}};
const createStory=async()=>{if(!storyText&&!storyImg)return toast.error("Icerik gerekli");try{await api.post("/stories",{content:storyText,mediaData:storyImg,type:storyImg?"image":"text",bgColor:storyBg});api.get("/stories").then(r=>setStories(r.data.stories||[]));setShowNewStory(false);setStoryText("");setStoryImg(null);toast.success("Paylsildi!")}catch{}};
const viewStory=async id=>{try{await api.post("/stories/"+id+"/view")}catch{}};
const updateProfile=async()=>{try{const r=await api.put("/auth/profile",{displayName:editName,bio:editBio});updateUser(r.data.user);toast.success("Guncellendi!");setShowProfile(false)}catch{}};
const uploadAvatar=async e=>{const f=e.target.files?.[0];if(!f)return;try{const b=await fileToBase64(f);const r=await api.put("/auth/profile",{avatar:b});updateUser(r.data.user)}catch{}e.target.value=""};
const togglePrivacy=async(k,v)=>{try{await api.put("/auth/profile",{[k]:v});updateUser({[k]:v})}catch{}};

const openChat=u=>{setSelUser(u);setSelGroup(null);setView("private");setSidebar(false);setReplyTo(null)};
const openGroup=g=>{setSelGroup(g);setSelUser(null);setView("group");setSidebar(false);setReplyTo(null)};
const goBack=()=>{setSidebar(true);setSelUser(null);setSelGroup(null);setView("general");setReplyTo(null)};

const curMsgs=view==="general"?msgs:view==="private"?pmMsgs:gMsgs;
const filteredMsgs=showChatSearch&&chatSearch?curMsgs.filter(m=>m.content?.toLowerCase().includes(chatSearch.toLowerCase())):curMsgs;
const filtered=search?users.filter(u=>(u.username||"").toLowerCase().includes(search.toLowerCase())||(u.displayName||"").toLowerCase().includes(search.toLowerCase())):users;
const totalUnread=Object.values(unread).reduce((a,b)=>a+b,0);
const pendingReqs=friendReqs.incoming?.length||0;

const Av=({src,name,size="w-10 h-10",ts="text-xs",on,story,onClick})=>{
  const colors=["#F0B90B","#00DC82","#3B82F6","#FF4757","#22D3EE","#8B5CF6"];
  const bg=colors[(name||"").charCodeAt(0)%colors.length];
  const inner=src?<img src={src} className={`${size} rounded-xl object-cover ${story?"border-2 border-[#06080f]":""}`} alt=""/>:
  <div className={`${size} rounded-xl flex items-center justify-center ${ts} font-bold ${story?"border-2 border-[#06080f]":""}`} style={{background:`${bg}15`,color:bg}}>{getInitials(name)}</div>;
  return(<div className={`relative shrink-0 ${onClick?"cursor-pointer":""} ${story?(story==="seen"?"story-ring-seen":"story-ring"):""}`} onClick={onClick}>{inner}{on&&<div className="status-dot on"/>}</div>)};

const Bubble=({msg,i,list})=>{
  const mine=msg.senderId===user?.id;
  const dead=msg.deletedForAll===1;
  const showName=!mine&&view!=="private"&&(i===0||list[i-1]?.senderId!==msg.senderId);
  const[hover,setHover]=useState(false);
  const[showRx,setShowRx]=useState(false);
  return(<div className={`flex ${mine?"justify-end":"justify-start"} mb-1 msg-anim px-3 md:px-0`}>
    <div className="relative max-w-[75%] md:max-w-[55%]" onMouseEnter={()=>!dead&&setHover(true)} onMouseLeave={()=>{setHover(false);setShowRx(false)}}>
      {showName&&<p className="text-[10px] font-mono font-bold ml-3 mb-0.5 text-[#F0B90B]">{msg.senderDisplayName||msg.senderName}</p>}
      {msg.forwardedFrom&&<p className="text-[9px] font-mono italic ml-3 flex items-center gap-1 text-[#3d4b63]"><Forward size={8}/>FWD</p>}
      {msg.replyTo&&<div className="mx-2 mb-1 px-3 py-1 rounded-lg" style={{background:"rgba(240,185,11,0.05)",borderLeft:"2px solid #F0B90B"}}><p className="text-[9px] font-mono font-bold text-[#F0B90B]">{msg.replyTo.senderName}</p><p className="text-[10px] text-[#6b7994] truncate">{truncate(msg.replyTo.content,50)}</p></div>}
      <div className={`relative px-3.5 pt-2 pb-1.5 ${dead?"opacity-40 italic":mine?"bubble-mine rounded-2xl rounded-br-sm":"bubble-other rounded-2xl rounded-bl-sm"}`}>
        {msg.isPinned===1&&<div className="flex items-center gap-1 text-[8px] font-mono mb-0.5 text-[#F0B90B]"><Pin size={8}/>PINNED</div>}
        {dead?<p className="text-[13px] text-[#3d4b63] font-mono">{msg.content}</p>:
        msg.type==="image"&&msg.mediaData?<img src={msg.mediaData} className="max-w-full rounded-lg max-h-[240px] object-contain cursor-pointer mb-1 hover:opacity-90" onClick={()=>setShowImgViewer(msg.mediaData)} alt=""/>:
        msg.type==="voice"&&msg.mediaData?<audio controls src={msg.mediaData} className="w-[200px] h-[32px]" style={{filter:"invert(0.7) sepia(1) hue-rotate(10deg) brightness(0.8)"}}/>:
        msg.type==="file"&&msg.mediaData?<a href={msg.mediaData} download={msg.fileName} className="flex items-center gap-2 text-[#22D3EE] hover:underline text-[12px] font-mono"><FileText size={14}/>{msg.fileName||"dosya"}</a>:
        <p className="text-[13px] leading-[19px] break-words whitespace-pre-wrap text-[#e8eaed]">{msg.content}</p>}
        <div className="flex items-center justify-end gap-1.5 mt-0.5"><span className="text-[9px] font-mono text-[#3d4b63]">{formatTime(msg.createdAt)}</span>
        {mine&&view==="private"&&!dead&&(msg.isRead?<CheckCheck size={12} className="text-[#00DC82]"/>:<Check size={12} className="text-[#3d4b63]"/>)}</div>
      </div>
      {msg.reactions?.length>0&&<div className="flex flex-wrap gap-1 mt-0.5 ml-1">{Object.entries(msg.reactions.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a},{})).map(([em,c])=><button key={em} onClick={()=>react(msg.id,em)} className="text-[10px] rounded-md px-1.5 py-0.5 bg-[#111827]" style={{border:"1px solid rgba(240,185,11,0.08)"}}>{em}{c>1&&" "+c}</button>)}</div>}
      {hover&&<div className="absolute -top-8 right-0 flex items-center gap-0 glass-light rounded-lg px-0.5 py-0.5 scale-in z-10">
        <button onClick={()=>setShowRx(!showRx)} className="p-1.5 rounded text-[#6b7994] hover:text-[#F0B90B]"><Smile size={12}/></button>
        <button onClick={()=>setReplyTo(msg)} className="p-1.5 rounded text-[#6b7994] hover:text-[#F0B90B]"><Reply size={12}/></button>
        <button onClick={()=>setShowFwd(msg)} className="p-1.5 rounded text-[#6b7994] hover:text-[#F0B90B]"><Forward size={12}/></button>
        {msg.isPinned?<button onClick={()=>unpinMsg(msg.id)} className="p-1.5 rounded text-[#F0B90B]"><PinOff size={12}/></button>:<button onClick={()=>pinMsg(msg.id)} className="p-1.5 rounded text-[#6b7994] hover:text-[#F0B90B]"><Pin size={12}/></button>}
        {mine&&<button onClick={()=>del(msg.id)} className="p-1.5 rounded text-[#FF4757]"><Trash2 size={12}/></button>}
      </div>}
      {showRx&&<div className="absolute -top-14 right-0 flex gap-0.5 glass-light rounded-lg px-1.5 py-1 scale-in z-20">{QUICK_REACTIONS.map(em=><button key={em} onClick={()=>{react(msg.id,em);setShowRx(false);setHover(false)}} className="text-base hover:scale-125 transition-transform px-0.5">{em}</button>)}</div>}
    </div>
  </div>)};

const Modal=({children,onClose})=>(<div className="modal-overlay fade-in" onClick={onClose}><div className="scale-in w-full max-w-md" onClick={e=>e.stopPropagation()}>{children}</div></div>);
const Card=({children,title,onClose,sub})=>(<div className="rounded-2xl overflow-hidden shadow-2xl" style={{background:"#0c1120",border:"1px solid rgba(240,185,11,0.06)"}}>{title&&<div className="flex items-center justify-between px-5 py-4" style={{borderBottom:"1px solid rgba(240,185,11,0.06)"}}><div><h3 className="font-bold text-sm text-[#e8eaed]">{title}</h3>{sub&&<p className="text-[10px] font-mono text-[#3d4b63] mt-0.5">{sub}</p>}</div><button onClick={onClose} className="p-1 text-[#3d4b63] hover:text-[#F0B90B]"><X size={16}/></button></div>}{children}</div>);

return(<div className="h-screen flex" style={{background:"#06080f"}}>

{/* SIDEBAR */}
<div className={`${sidebar?"flex":"hidden"} md:flex flex-col sidebar-full md:w-[340px] lg:w-[380px] shrink-0`} style={{background:"#0a0e18",borderRight:"1px solid rgba(240,185,11,0.04)"}}>

<div className="flex items-center justify-between px-4 h-[56px]" style={{borderBottom:"1px solid rgba(240,185,11,0.04)"}}>
  <button onClick={()=>{setShowProfile(true);setEditName(user?.displayName||"");setEditBio(user?.bio||"")}} className="flex items-center gap-2.5 hover:opacity-80">
    <Av src={user?.avatar} name={user?.displayName} size="w-8 h-8" ts="text-[10px]"/>
    <div><p className="font-semibold text-[13px] text-[#e8eaed]">{user?.displayName}</p><p className="text-[9px] font-mono text-[#3d4b63]">@{user?.username}</p></div>
  </button>
  <div className="flex items-center">
    {user?.role==="admin"&&<button onClick={()=>nav("/admin")} className="p-2 text-[#3d4b63] hover:text-[#F0B90B]"><Shield size={16}/></button>}
    <button onClick={()=>setShowFriendReq(true)} className="p-2 text-[#3d4b63] hover:text-[#F0B90B] relative"><Bell size={16}/>{pendingReqs>0&&<span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#F0B90B] rounded-full text-[8px] font-bold text-[#06080f] flex items-center justify-center">{pendingReqs}</span>}</button>
    <button onClick={()=>setShowSearch(!showSearch)} className="p-2 text-[#3d4b63] hover:text-[#F0B90B]"><Search size={16}/></button>
    <button onClick={()=>setShowSettings(true)} className="p-2 text-[#3d4b63] hover:text-[#F0B90B]"><Settings size={16}/></button>
    <button onClick={logout} className="p-2 text-[#3d4b63] hover:text-[#FF4757]"><LogOut size={16}/></button>
  </div>
</div>

{showSearch&&<div className="px-3 py-2 fade-in"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..." autoFocus className="inp text-[12px]"/></div>}

{tab==="chats"&&stories.length>0&&!search&&<div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{borderBottom:"1px solid rgba(255,255,255,0.02)"}}>
  <button onClick={()=>setShowNewStory(true)} className="flex flex-col items-center gap-1 shrink-0"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{border:"1.5px dashed rgba(240,185,11,0.3)",background:"rgba(240,185,11,0.03)"}}><Plus size={18} className="text-[#F0B90B]"/></div><span className="text-[9px] text-[#3d4b63]">Ekle</span></button>
  {stories.map(s=>(<button key={s.userId} onClick={()=>{setShowStory(s);setStoryIdx(0);if(s.stories[0])viewStory(s.stories[0].id)}} className="flex flex-col items-center gap-1 shrink-0">
    <Av src={s.avatar} name={s.displayName} size="w-12 h-12" ts="text-[10px]" story={s.stories.every(st=>st.viewed)?"seen":"active"}/>
    <span className="text-[9px] text-[#6b7994] truncate max-w-[48px]">{s.userId===user?.id?"Siz":s.displayName?.split(" ")[0]}</span>
  </button>))}
</div>}

<div className="flex" style={{borderBottom:"1px solid rgba(255,255,255,0.02)"}}>
  {[{id:"chats",l:"SOHBET",badge:totalUnread},{id:"groups",l:"GRUP"},{id:"friends",l:"KISI"}].map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className="flex-1 py-2.5 text-[10px] font-mono font-bold tracking-[0.15em] relative" style={{color:tab===t.id?"#F0B90B":"#3d4b63"}}>
    {t.l}{t.badge>0&&<span className="ml-1 px-1 py-0 bg-[#F0B90B] text-[#06080f] text-[8px] font-bold rounded">{t.badge}</span>}
    {tab===t.id&&<div className="absolute bottom-0 left-[25%] right-[25%] h-[1.5px] bg-[#F0B90B]"/>}
  </button>))}
</div>

<div className="flex-1 overflow-y-auto">
  {tab==="chats"&&!search&&<div className={`sidebar-item ${view==="general"&&!selUser?"active":""}`} onClick={()=>{setView("general");setSelUser(null);setSelGroup(null);setSidebar(false)}}>
    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{background:"linear-gradient(135deg,#F0B90B,#FCD535)"}}><Zap size={18} color="#06080f"/></div>
    <div className="flex-1 min-w-0"><p className="font-semibold text-[13px] text-[#e8eaed]">Genel Kanal</p><p className="text-[11px] font-mono text-[#3d4b63]">{onlineUsers.length} aktif</p></div>
    <Activity size={14} className="text-[#00DC82]"/>
  </div>}

  {tab==="chats"&&filtered.map(u=>(<div key={u.id} className={`sidebar-item ${selUser?.id===u.id?"active":""}`} onClick={()=>openChat(u)}>
    <Av src={u.avatar} name={u.displayName} on={isOnline(u.id)}/>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline"><p className="font-medium text-[13px] text-[#e8eaed] truncate">{u.displayName||u.username}</p>{lastMsgs[u.id]&&<span className="text-[9px] font-mono text-[#3d4b63] shrink-0 ml-2">{formatDate(lastMsgs[u.id].createdAt)}</span>}</div>
      <div className="flex justify-between items-center"><p className="text-[11px] text-[#6b7994] truncate">{lastMsgs[u.id]?(lastMsgs[u.id].type==="image"?"📷 Fotograf":lastMsgs[u.id].type==="voice"?"🎵 Ses":truncate(lastMsgs[u.id].content,28)):isOnline(u.id)?"Cevrimici":""}</p>
      {unread[u.id]>0&&<span className="px-1.5 py-0.5 bg-[#F0B90B] text-[#06080f] text-[9px] font-bold rounded ml-2 shrink-0 font-mono">{unread[u.id]}</span>}</div>
    </div>
  </div>))}

  {tab==="groups"&&<>
    <div className="sidebar-item text-[#F0B90B]" onClick={()=>setShowNewGroup(true)}><div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{background:"rgba(240,185,11,0.08)"}}><Plus size={18}/></div><p className="font-semibold text-[13px]">Yeni Grup</p></div>
    {groups.map(g=>(<div key={g.id} className={`sidebar-item ${selGroup?.id===g.id?"active":""}`} onClick={()=>openGroup(g)}>
      <Av src={g.avatar} name={g.name}/>
      <div className="flex-1 min-w-0"><p className="font-medium text-[13px] text-[#e8eaed] truncate">{g.name}</p><p className="text-[11px] text-[#6b7994] truncate font-mono">{g.memberCount||0} uye</p></div>
    </div>))}
    {groups.length===0&&<div className="text-center py-16 text-[#3d4b63]"><Users size={28} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-mono">HENUZ GRUP YOK</p></div>}
  </>}

  {tab==="friends"&&<>
    {friends.length>0&&<div className="px-4 py-2" style={{borderBottom:"1px solid rgba(255,255,255,0.02)"}}><p className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#F0B90B]">ARKADASLAR · {friends.length}</p></div>}
    {friends.map(f=>(<div key={f.id} className="sidebar-item">
      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={()=>openChat(f)}><Av src={f.avatar} name={f.displayName} on={isOnline(f.id)} size="w-9 h-9"/><div><p className="font-medium text-[13px] text-[#e8eaed]">{f.displayName||f.username}</p><p className="text-[10px] font-mono" style={{color:isOnline(f.id)?"#00DC82":"#3d4b63"}}>{isOnline(f.id)?"ONLINE":"OFFLINE"}</p></div></div>
      <div className="flex gap-0.5"><button onClick={()=>startCall(f,false)} className="p-1.5 text-[#00DC82] rounded"><Phone size={14}/></button><button onClick={()=>startCall(f,true)} className="p-1.5 text-[#22D3EE] rounded"><Video size={14}/></button><button onClick={()=>delFriend(f.id)} className="p-1.5 text-[#FF4757] rounded"><UserMinus size={14}/></button></div>
    </div>))}
    <div className="px-4 py-2" style={{borderTop:"1px solid rgba(255,255,255,0.02)"}}><p className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#3d4b63]">TUM KULLANICILAR</p></div>
    {users.filter(u=>!friends.some(f=>f.id===u.id)).map(u=>(<div key={u.id} className="sidebar-item">
      <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={()=>setShowUserProfile(u)}><Av src={u.avatar} name={u.displayName} size="w-8 h-8" ts="text-[9px]" on={isOnline(u.id)}/><p className="text-[12px] text-[#e8eaed]">{u.displayName||u.username}</p></div>
      <button onClick={()=>addFriend(u.id)} className="p-1.5 text-[#F0B90B] rounded"><UserPlus size={14}/></button>
    </div>))}
  </>}
</div>

<div className="px-4 py-1.5 flex items-center justify-between text-[9px] font-mono" style={{borderTop:"1px solid rgba(240,185,11,0.04)"}}>
  <div className="flex items-center gap-1.5" style={{color:connected?"#00DC82":"#FF4757"}}><div className={`w-1.5 h-1.5 rounded-full ${connected?"animate-pulse":""}`} style={{background:connected?"#00DC82":"#FF4757"}}/>{connected?"CONNECTED":"RECONNECTING..."}</div>
  <span className="text-[#3d4b63]">v5.0</span>
</div>
</div>

{/* CHAT AREA */}
<div className={`${!sidebar?"flex":"hidden"} md:flex flex-col flex-1 chat-full min-w-0`}>
{(view!=="general"&&!selUser&&!selGroup)?
(<div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
  <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px] bg-[#F0B90B]"/>
  <div className="text-center slide-up z-10">
    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{background:"rgba(240,185,11,0.05)",border:"1px solid rgba(240,185,11,0.08)"}}><Zap size={36} className="text-[#F0B90B]"/></div>
    <h2 className="text-[28px] font-light text-[#e8eaed] mb-2">FinansChat</h2>
    <p className="text-[#6b7994] text-sm max-w-[350px]">Finans toplulugunuza hos geldiniz</p>
    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg glass text-[10px] font-mono text-[#3d4b63]"><Lock size={10} className="text-[#F0B90B]"/>E2E ENCRYPTED</div>
  </div>
</div>):(<>

{/* Chat Header */}
<div className="h-[56px] flex items-center justify-between px-4" style={{background:"#0a0e18",borderBottom:"1px solid rgba(240,185,11,0.04)"}}>
  <div className="flex items-center gap-3">
    <button onClick={goBack} className="md:hidden p-1 text-[#6b7994]"><ArrowLeft size={18}/></button>
    {view==="private"&&selUser?(<div className="flex items-center gap-3 cursor-pointer" onClick={()=>setShowUserProfile(selUser)}>
      <Av src={selUser.avatar} name={selUser.displayName} size="w-9 h-9" on={isOnline(selUser.id)}/>
      <div><h3 className="font-bold text-[14px] text-[#e8eaed]">{selUser.displayName||selUser.username}</h3>
      <p className="text-[10px] font-mono">{typing?.userId===selUser.id?<span className="text-[#F0B90B]">typing...</span>:<span style={{color:isOnline(selUser.id)?"#00DC82":"#3d4b63"}}>{isOnline(selUser.id)?"ONLINE":"OFFLINE"}</span>}</p></div></div>):
    view==="group"&&selGroup?(<div className="flex items-center gap-3"><Av src={selGroup.avatar} name={selGroup.name} size="w-9 h-9"/><div><h3 className="font-bold text-[14px] text-[#e8eaed]">{selGroup.name}</h3><p className="text-[10px] font-mono text-[#6b7994]">{typing?.groupId===selGroup.id?<span className="text-[#F0B90B]">{typing.displayName} typing...</span>:`${selGroup.memberCount||"?"} uye`}</p></div></div>):
    (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#F0B90B,#FCD535)"}}><Zap size={16} color="#06080f"/></div><div><h3 className="font-bold text-[14px] text-[#e8eaed]">Genel Kanal</h3><p className="text-[10px] font-mono text-[#6b7994]">{typing?<span className="text-[#F0B90B]">{typing.displayName} typing...</span>:<>{onlineUsers.length} ONLINE</>}</p></div></div>)}
  </div>
  <div className="flex items-center gap-0.5">
    <button onClick={()=>setShowChatSearch(!showChatSearch)} className="p-2 text-[#3d4b63] hover:text-[#F0B90B] rounded-lg"><Search size={16}/></button>
    {view==="private"&&selUser&&<><button onClick={()=>startCall(selUser,false)} className="p-2 text-[#3d4b63] hover:text-[#00DC82] rounded-lg"><Phone size={16}/></button><button onClick={()=>startCall(selUser,true)} className="p-2 text-[#3d4b63] hover:text-[#22D3EE] rounded-lg"><Video size={16}/></button></>}
  </div>
</div>

{showChatSearch&&<div className="px-3 py-2 fade-in" style={{background:"#0a0e18",borderBottom:"1px solid rgba(255,255,255,0.02)"}}><input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Mesajlarda ara..." autoFocus className="inp text-[12px]"/></div>}

<div className="flex-1 overflow-y-auto chat-bg px-2 md:px-8 lg:px-16 py-3">
  {view==="private"&&<div className="flex justify-center mb-4"><div className="glass rounded-lg text-[9px] font-mono px-4 py-1.5 flex items-center gap-1.5 text-[#3d4b63]"><Lock size={9} className="text-[#F0B90B]"/>ENCRYPTED CHANNEL</div></div>}
  {filteredMsgs.map((m,i)=><Bubble key={m.id} msg={m} i={i} list={filteredMsgs}/>)}
  {typing&&(view==="general"||(view==="private"&&typing.userId===selUser?.id)||(view==="group"&&typing.groupId===selGroup?.id))&&<div className="flex mb-1 px-3"><div className="flex gap-[4px] bubble-other rounded-2xl rounded-bl-sm px-4 py-3"><div className="w-[5px] h-[5px] rounded-full bg-[#6b7994] typing-dot"/><div className="w-[5px] h-[5px] rounded-full bg-[#6b7994] typing-dot"/><div className="w-[5px] h-[5px] rounded-full bg-[#6b7994] typing-dot"/></div></div>}
  <div ref={endRef}/>
</div>

{replyTo&&<div className="px-4 py-2 flex items-center gap-3 fade-in" style={{background:"#0a0e18",borderTop:"1px solid rgba(240,185,11,0.04)"}}><div className="flex-1 pl-3" style={{borderLeft:"2px solid #F0B90B"}}><p className="text-[10px] font-mono font-bold text-[#F0B90B]">{replyTo.senderDisplayName||replyTo.senderName}</p><p className="text-[10px] text-[#6b7994] truncate">{truncate(replyTo.content,60)}</p></div><button onClick={()=>setReplyTo(null)} className="text-[#3d4b63]"><X size={14}/></button></div>}

<div className="px-3 md:px-4 py-2.5 flex items-end gap-2" style={{background:"#0a0e18",borderTop:"1px solid rgba(240,185,11,0.04)"}}>
  <input type="file" ref={fileRef} accept="image/*" onChange={sendFile} className="hidden"/>
  <input type="file" ref={docRef} accept=".pdf,.doc,.docx,.txt,.zip,.rar,.xlsx" onChange={sendFile} className="hidden"/>
  <button onClick={()=>setShowEmoji(!showEmoji)} className={`p-2 shrink-0 rounded-lg ${showEmoji?"text-[#F0B90B]":"text-[#3d4b63] hover:text-[#F0B90B]"}`}><Smile size={20}/></button>
  <button onClick={()=>fileRef.current?.click()} className="p-2 text-[#3d4b63] hover:text-[#F0B90B] shrink-0 rounded-lg"><Image size={20}/></button>
  <button onClick={()=>docRef.current?.click()} className="p-2 text-[#3d4b63] hover:text-[#F0B90B] shrink-0 rounded-lg"><Paperclip size={20}/></button>
  <div className="flex-1 relative">
    {showEmoji&&<div className="absolute bottom-full mb-2 left-0 glass rounded-xl p-3 scale-in z-20 w-[280px]"><div className="emoji-grid">{EMOJIS.map(em=><button key={em} onClick={()=>{setText(p=>p+em);setShowEmoji(false)}} className="emoji-btn">{em}</button>)}</div></div>}
    <input value={text} onChange={handleType} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)send()}} placeholder="Mesaj yaz..." className="inp text-[13px]"/>
  </div>
  {text.trim()?<button onClick={send} className="p-2.5 btn-gold rounded-xl shrink-0"><Send size={18}/></button>:
  <button onClick={recording?stopRec:startRec} className={`p-2 shrink-0 rounded-lg ${recording?"text-[#FF4757] animate-pulse":"text-[#3d4b63] hover:text-[#F0B90B]"}`}>{recording?<MicOff size={20}/>:<Mic size={20}/>}</button>}
</div>
</>)}
</div>

{/* MODALS */}

{showFwd&&<Modal onClose={()=>setShowFwd(null)}><Card title="Mesaji Ilet" sub="SELECT TARGET" onClose={()=>setShowFwd(null)}>
  <div className="max-h-[50vh] overflow-y-auto">{users.map(u=>(<div key={u.id} className="sidebar-item" onClick={()=>fwd(showFwd.id,{type:"user",id:u.id})}><Av src={u.avatar} name={u.displayName} size="w-8 h-8" ts="text-[9px]"/><p className="text-[12px] text-[#e8eaed]">{u.displayName||u.username}</p></div>))}
  {groups.map(g=>(<div key={g.id} className="sidebar-item" onClick={()=>fwd(showFwd.id,{type:"group",id:g.id})}><Av src={g.avatar} name={g.name} size="w-8 h-8" ts="text-[9px]"/><p className="text-[12px] text-[#e8eaed]">{g.name}</p></div>))}</div>
</Card></Modal>}

{showProfile&&<Modal onClose={()=>setShowProfile(false)}><Card onClose={()=>setShowProfile(false)}>
  <div className="h-20" style={{background:"linear-gradient(135deg, rgba(240,185,11,0.15), rgba(0,220,130,0.1))"}}/>
  <div className="px-6 pb-6"><div className="flex flex-col items-center -mt-10 mb-5"><div className="relative group">{user?.avatar?<img src={user.avatar} className="w-20 h-20 rounded-xl object-cover border-2 border-[#0c1120]" alt=""/>:<div className="w-20 h-20 rounded-xl flex items-center justify-center text-xl font-bold" style={{background:"rgba(240,185,11,0.08)",color:"#F0B90B",border:"2px solid #0c1120"}}>{getInitials(user?.displayName)}</div>}<label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer"><Camera size={20} className="text-white"/><input type="file" accept="image/*" onChange={uploadAvatar} className="hidden"/></label></div></div>
  <div className="space-y-3"><div><label className="block text-[9px] font-mono font-bold text-[#3d4b63] tracking-[0.2em] mb-1">GORUNEN_AD</label><input value={editName} onChange={e=>setEditName(e.target.value)} className="inp text-[13px]"/></div><div><label className="block text-[9px] font-mono font-bold text-[#3d4b63] tracking-[0.2em] mb-1">BIO</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={2} className="inp text-[13px] resize-none" placeholder="Hakkinda..."/></div></div>
  <button onClick={updateProfile} className="w-full mt-4 py-3 btn-gold rounded-xl text-[12px]">KAYDET</button></div>
</Card></Modal>}

{showSettings&&<Modal onClose={()=>setShowSettings(false)}><Card title="Ayarlar" sub="PRIVACY" onClose={()=>setShowSettings(false)}>
  <div className="p-5 space-y-5">
    {[{k:"showOnline",l:"Cevrimici Durumu",d:"Digerlerine goster"},{k:"showLastSeen",l:"Son Gorulen",d:"Zaman bilgisi"}].map(s=>(<div key={s.k} className="flex items-center justify-between"><div><p className="text-[13px] font-medium text-[#e8eaed]">{s.l}</p><p className="text-[10px] font-mono text-[#3d4b63]">{s.d}</p></div>
    <button onClick={()=>togglePrivacy(s.k,!user?.[s.k])} className="w-10 h-5 rounded-full relative transition-all" style={{background:user?.[s.k]?"#F0B90B":"rgba(255,255,255,0.06)"}}><div className="w-4 h-4 rounded-full absolute top-0.5 shadow transition-all" style={{background:user?.[s.k]?"#06080f":"#6b7994",left:user?.[s.k]?"22px":"2px"}}/></button></div>))}
    <div className="pt-3" style={{borderTop:"1px solid rgba(240,185,11,0.04)"}}><p className="text-center text-[9px] font-mono text-[#3d4b63]">FINANSCHAT v5.0</p></div>
  </div>
</Card></Modal>}

{showNewGroup&&<Modal onClose={()=>setShowNewGroup(false)}><Card title="Yeni Grup" sub="CREATE" onClose={()=>setShowNewGroup(false)}>
  <div className="p-5 space-y-4"><input value={grpName} onChange={e=>setGrpName(e.target.value)} placeholder="Grup adi..." className="inp"/>
  <p className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#3d4b63]">UYE SEC · {grpMembers.length}</p>
  <div className="max-h-[180px] overflow-y-auto space-y-1">{users.map(u=>(<button key={u.id} onClick={()=>setGrpMembers(p=>p.includes(u.id)?p.filter(x=>x!==u.id):[...p,u.id])} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors" style={{background:grpMembers.includes(u.id)?"rgba(240,185,11,0.05)":"transparent",border:grpMembers.includes(u.id)?"1px solid rgba(240,185,11,0.1)":"1px solid transparent"}}>
    <Av src={u.avatar} name={u.displayName} size="w-7 h-7" ts="text-[8px]"/><p className="flex-1 text-[12px] text-left text-[#e8eaed]">{u.displayName||u.username}</p>{grpMembers.includes(u.id)&&<Check size={14} className="text-[#F0B90B]"/>}
  </button>))}</div>
  <button onClick={createGroup} className="w-full py-3 btn-gold rounded-xl text-[12px]">OLUSTUR{grpMembers.length>0&&` (${grpMembers.length})`}</button></div>
</Card></Modal>}

{showNewStory&&<Modal onClose={()=>setShowNewStory(false)}><Card title="Hikaye" sub="STATUS" onClose={()=>setShowNewStory(false)}>
  <div className="p-5 space-y-4">
    <div className="aspect-[9/14] max-h-[220px] rounded-xl flex items-center justify-center overflow-hidden" style={{background:storyBg}}>{storyImg?<img src={storyImg} className="max-w-full max-h-full object-contain" alt=""/>:<textarea value={storyText} onChange={e=>setStoryText(e.target.value)} placeholder="..." className="w-full h-full bg-transparent text-white text-center text-base font-bold focus:outline-none placeholder-white/30 p-4 resize-none"/>}</div>
    <div className="flex gap-2 flex-wrap">{STORY_COLORS.map(c=>(<button key={c} onClick={()=>setStoryBg(c)} className={`w-6 h-6 rounded-lg transition-all ${storyBg===c?"ring-2 ring-white ring-offset-1 ring-offset-[#0c1120] scale-110":""}`} style={{background:c}}/>))}</div>
    <label className="block py-2 rounded-lg text-center text-[12px] font-mono cursor-pointer" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.04)",color:"#6b7994"}}><Image size={12} className="inline mr-1"/>FOTOGRAF<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f)setStoryImg(await fileToBase64(f));e.target.value=""}} className="hidden"/></label>
    <button onClick={createStory} className="w-full py-3 btn-gold rounded-xl text-[12px]">PAYLAS</button>
  </div>
</Card></Modal>}

{showStory&&<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center fade-in" onClick={()=>setShowStory(null)}>
  <div className="w-full max-w-md" onClick={e=>e.stopPropagation()}>
    <div className="flex items-center gap-3 px-4 py-3"><Av src={showStory.avatar} name={showStory.displayName} size="w-8 h-8" ts="text-[9px]"/><div><p className="text-white font-semibold text-[13px]">{showStory.displayName}</p><p className="text-white/30 text-[10px] font-mono">{formatDate(showStory.stories[storyIdx]?.createdAt)}</p></div><button onClick={()=>setShowStory(null)} className="ml-auto text-white/40 hover:text-white"><X size={20}/></button></div>
    <div className="flex gap-1 px-4 mb-2">{showStory.stories.map((_,i)=>(<div key={i} className="flex-1 h-[2px] rounded-full" style={{background:i<=storyIdx?"#F0B90B":"rgba(255,255,255,0.15)"}}/>))}</div>
    {showStory.stories[storyIdx]&&<div className="aspect-[9/16] max-h-[55vh] rounded-xl mx-4 flex items-center justify-center overflow-hidden cursor-pointer" style={{background:showStory.stories[storyIdx].bgColor||"#F0B90B"}} onClick={()=>{const n=storyIdx+1;if(n<showStory.stories.length){setStoryIdx(n);viewStory(showStory.stories[n].id)}else setShowStory(null)}}>
      {showStory.stories[storyIdx].mediaData?<img src={showStory.stories[storyIdx].mediaData} className="max-w-full max-h-full object-contain" alt=""/>:<p className="text-white text-lg font-bold text-center px-6">{showStory.stories[storyIdx].content}</p>}
    </div>}
    <p className="text-center text-white/20 text-[10px] font-mono mt-3"><Eye size={10} className="inline mr-1"/>{showStory.stories[storyIdx]?.viewCount||0}</p>
  </div>
</div>}

{showFriendReq&&<Modal onClose={()=>setShowFriendReq(false)}><Card title="Istekler" sub="REQUESTS" onClose={()=>setShowFriendReq(false)}>
  <div className="max-h-[50vh] overflow-y-auto">
    {friendReqs.incoming?.length>0&&friendReqs.incoming.map(u=>(<div key={u.id} className="sidebar-item"><Av src={u.avatar} name={u.displayName} size="w-8 h-8" ts="text-[9px]"/><p className="flex-1 text-[12px] text-[#e8eaed]">{u.displayName||u.username}</p><button onClick={()=>acceptFriend(u.id)} className="px-3 py-1 btn-gold rounded-lg text-[10px]">KABUL</button><button onClick={()=>rejectFriend(u.id)} className="px-3 py-1 rounded-lg text-[10px] text-[#6b7994]" style={{background:"rgba(255,255,255,0.03)"}}>RED</button></div>))}
    {friendReqs.outgoing?.length>0&&<><div className="px-4 pt-3 pb-1"><p className="text-[9px] font-mono font-bold text-[#3d4b63]">GONDERILEN</p></div>{friendReqs.outgoing.map(u=>(<div key={u.id} className="sidebar-item"><Av src={u.avatar} name={u.displayName} size="w-8 h-8" ts="text-[9px]"/><p className="flex-1 text-[12px] text-[#e8eaed]">{u.displayName||u.username}</p><span className="text-[9px] font-mono text-[#F0B90B]">PENDING</span></div>))}</>}
    {!friendReqs.incoming?.length&&!friendReqs.outgoing?.length&&<div className="text-center py-12 text-[#3d4b63]"><Bell size={24} className="mx-auto mb-2 opacity-20"/><p className="text-[11px] font-mono">NO REQUESTS</p></div>}
  </div>
</Card></Modal>}

{showUserProfile&&<Modal onClose={()=>setShowUserProfile(null)}><Card onClose={()=>setShowUserProfile(null)}>
  <div className="h-20" style={{background:"linear-gradient(135deg, rgba(240,185,11,0.1), rgba(0,220,130,0.08))"}}/>
  <div className="flex flex-col items-center -mt-12 pb-3">
    <div className="cursor-pointer" onClick={()=>showUserProfile.avatar&&setShowImgViewer(showUserProfile.avatar)}>{showUserProfile.avatar?<img src={showUserProfile.avatar} className="w-24 h-24 rounded-xl object-cover border-2 border-[#0c1120] shadow-xl" alt=""/>:<div className="w-24 h-24 rounded-xl flex items-center justify-center text-2xl font-bold border-2 border-[#0c1120]" style={{background:"rgba(240,185,11,0.08)",color:"#F0B90B"}}>{getInitials(showUserProfile.displayName)}</div>}</div>
    <h2 className="text-lg font-bold mt-3 text-[#e8eaed]">{showUserProfile.displayName||showUserProfile.username}</h2>
    <p className="text-[11px] font-mono text-[#3d4b63]">@{showUserProfile.username}</p>
    <div className="flex items-center gap-1.5 mt-1"><div className="w-2 h-2 rounded-full" style={{background:isOnline(showUserProfile.id)?"#00DC82":"#3d4b63"}}/><span className="text-[10px] font-mono" style={{color:isOnline(showUserProfile.id)?"#00DC82":"#3d4b63"}}>{isOnline(showUserProfile.id)?"ONLINE":"OFFLINE"}</span></div>
  </div>
  {showUserProfile.bio&&<div className="px-6 py-3" style={{borderTop:"1px solid rgba(240,185,11,0.04)"}}><p className="text-[9px] font-mono font-bold text-[#3d4b63] mb-1">BIO</p><p className="text-[13px] text-[#e8eaed]">{showUserProfile.bio}</p></div>}
  <div className="px-6 py-4 grid grid-cols-4 gap-2" style={{borderTop:"1px solid rgba(240,185,11,0.04)"}}>
    <button onClick={()=>{openChat(showUserProfile);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{background:"rgba(240,185,11,0.05)"}}><MessageCircle size={18} className="text-[#F0B90B]"/><span className="text-[8px] font-mono font-bold text-[#F0B90B]">MSG</span></button>
    <button onClick={()=>{startCall(showUserProfile,false);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{background:"rgba(0,220,130,0.05)"}}><Phone size={18} className="text-[#00DC82]"/><span className="text-[8px] font-mono font-bold text-[#00DC82]">CALL</span></button>
    <button onClick={()=>{startCall(showUserProfile,true);setShowUserProfile(null)}} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{background:"rgba(34,211,238,0.05)"}}><Video size={18} className="text-[#22D3EE]"/><span className="text-[8px] font-mono font-bold text-[#22D3EE]">VIDEO</span></button>
    <button onClick={()=>addFriend(showUserProfile.id)} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{background:"rgba(255,255,255,0.02)"}}><UserPlus size={18} className="text-[#6b7994]"/><span className="text-[8px] font-mono font-bold text-[#6b7994]">ADD</span></button>
  </div>
  <div className="px-6 py-3" style={{borderTop:"1px solid rgba(240,185,11,0.04)"}}><button onClick={()=>{block(showUserProfile.id);setShowUserProfile(null)}} className="w-full flex items-center gap-2 py-1.5 text-[12px] text-[#FF4757]"><Ban size={14}/>Engelle</button></div>
</Card></Modal>}

{showImgViewer&&<div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center fade-in cursor-pointer" onClick={()=>setShowImgViewer(null)}><button className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={24}/></button><img src={showImgViewer} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" alt=""/></div>}

{callState&&<div className="fixed inset-0 z-[60] flex items-center justify-center" style={{background:"linear-gradient(180deg, #06080f 0%, #0a1628 100%)"}}>
  <div className="absolute inset-0"><div className="absolute top-[30%] left-[40%] w-[200px] h-[200px] bg-[#F0B90B] rounded-full opacity-[0.03] blur-[80px]"/></div>
  <div className="relative z-10 flex flex-col items-center text-white">
    <div className="mb-8 relative">{callTarget?.avatar?<img src={callTarget.avatar} className="w-28 h-28 rounded-2xl object-cover border-2 border-white/10" alt=""/>:<div className="w-28 h-28 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{background:"rgba(240,185,11,0.1)",color:"#F0B90B",border:"2px solid rgba(240,185,11,0.1)"}}>{getInitials(callTarget?.displayName)}</div>}
    {callState==="incoming"&&<div className="absolute inset-[-6px] rounded-2xl border border-[#F0B90B]" style={{animation:"ring 1.5s ease-out infinite"}}/>}</div>
    <h2 className="text-xl font-bold mb-1">{callTarget?.displayName}</h2>
    <p className="text-white/40 text-[12px] font-mono mb-10">{callState==="calling"&&<span className="animate-pulse">CALLING...</span>}{callState==="incoming"&&<span className="animate-pulse">{callVideo?"VIDEO":"VOICE"} CALL</span>}{callState==="connected"&&fmtCall(callTime)}</p>
    <div className="flex items-center gap-8">
      {callState==="incoming"&&<><button onClick={rejectCallFn} className="w-14 h-14 bg-[#FF4757] rounded-2xl flex items-center justify-center shadow-lg"><PhoneOff size={22}/></button><button onClick={answerCall} className="w-14 h-14 bg-[#00DC82] rounded-2xl flex items-center justify-center shadow-lg relative"><div className="absolute inset-0 bg-[#00DC82] rounded-2xl animate-ping opacity-15"/>{callVideo?<Video size={22} className="relative z-10"/>:<Phone size={22} className="relative z-10"/>}</button></>}
      {(callState==="calling"||callState==="connected")&&<button onClick={endCall} className="w-14 h-14 bg-[#FF4757] rounded-2xl flex items-center justify-center shadow-lg"><PhoneOff size={22}/></button>}
    </div>
  </div>
</div>}

</div>);
}
