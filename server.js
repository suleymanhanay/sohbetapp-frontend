require("dotenv").config();
const express=require("express"),http=require("http"),{Server}=require("socket.io"),cors=require("cors"),jwt=require("jsonwebtoken"),{initDB,getDB}=require("./database");
const app=express(),server=http.createServer(app);
const JWT=process.env.JWT_SECRET||"sohbet_secret_2024",FE=process.env.FRONTEND_URL||"https://sohbetapp-frontend.vercel.app";
app.use(cors({origin:[FE,"http://localhost:5173"],credentials:true}));
app.use(express.json({limit:"50mb"}));
const io=new Server(server,{cors:{origin:[FE,"http://localhost:5173"],credentials:true},maxHttpBufferSize:5e7,pingTimeout:60000});

app.use("/api/auth",require("./routes/auth"));
app.use("/api/users",require("./routes/users"));
app.use("/api/messages",require("./routes/messages"));
app.use("/api/groups",require("./routes/groups"));
app.use("/api/stories",require("./routes/stories"));
app.use("/api/friends",require("./routes/friends"));
app.use("/api/admin",require("./routes/admin"));
app.get("/",(_, res)=>res.json({status:"SohbetApp v5.0",time:new Date().toISOString()}));

const online=new Map();
io.use((s,next)=>{try{const d=jwt.verify(s.handshake.auth.token,JWT);s.userId=d.id;s.username=d.username;next()}catch{next(new Error("Auth"))}});

io.on("connection",(socket)=>{
  const db=getDB(),uid=socket.userId;
  db.run("UPDATE users SET status='online',lastSeen=datetime('now') WHERE id=?",[uid]);
  const uRow=db.exec("SELECT displayName,avatar FROM users WHERE id=?",[uid]);
  const dn=uRow[0]?.values[0]?.[0]||socket.username,av=uRow[0]?.values[0]?.[1]||"";
  online.set(uid,{id:uid,username:socket.username,socketId:socket.id,displayName:dn,avatar:av});
  const uG=db.exec("SELECT groupId FROM group_members WHERE userId=?",[uid]);
  if(uG.length)uG[0].values.forEach(g=>socket.join("g_"+g[0]));
  bcast();

  const me=()=>online.get(uid);
  const getReply=(rid)=>{if(!rid)return null;const r=db.exec("SELECT m.id,m.content,m.type,m.senderId,u.displayName FROM messages m JOIN users u ON m.senderId=u.id WHERE m.id=?",[rid]);return r.length?{id:r[0].values[0][0],content:r[0].values[0][1],type:r[0].values[0][2],senderId:r[0].values[0][3],senderName:r[0].values[0][4]}:null};

  socket.on("sendMessage",(d)=>{db.run("INSERT INTO messages (senderId,roomId,content,type,mediaData,fileName,replyToId) VALUES (?,?,?,?,?,?,?)",[uid,d.roomId||"general",d.content,d.type||"text",d.mediaData||null,d.fileName||null,d.replyToId||null]);const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];const u=me();io.emit("newMessage",{id,senderId:uid,senderName:socket.username,senderDisplayName:u?.displayName,senderAvatar:u?.avatar,roomId:d.roomId||"general",content:d.content,type:d.type||"text",mediaData:d.mediaData,fileName:d.fileName,replyTo:getReply(d.replyToId),createdAt:new Date().toISOString()})});

  socket.on("sendPrivateMessage",(d)=>{db.run("INSERT INTO messages (senderId,receiverId,content,type,mediaData,fileName,replyToId) VALUES (?,?,?,?,?,?,?)",[uid,d.receiverId,d.content,d.type||"text",d.mediaData||null,d.fileName||null,d.replyToId||null]);const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];const u=me();const msg={id,senderId:uid,receiverId:d.receiverId,senderName:socket.username,senderDisplayName:u?.displayName,senderAvatar:u?.avatar,content:d.content,type:d.type||"text",mediaData:d.mediaData,fileName:d.fileName,replyTo:getReply(d.replyToId),isRead:0,createdAt:new Date().toISOString()};socket.emit("newPrivateMessage",msg);const rv=online.get(d.receiverId);if(rv)io.to(rv.socketId).emit("newPrivateMessage",msg)});

  socket.on("sendGroupMessage",(d)=>{const ck=db.exec("SELECT id FROM group_members WHERE groupId=? AND userId=?",[d.groupId,uid]);if(!ck.length||!ck[0].values.length)return;db.run("INSERT INTO messages (senderId,groupId,content,type,mediaData,fileName,replyToId) VALUES (?,?,?,?,?,?,?)",[uid,d.groupId,d.content,d.type||"text",d.mediaData||null,d.fileName||null,d.replyToId||null]);const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];const u=me();io.to("g_"+d.groupId).emit("newGroupMessage",{id,senderId:uid,groupId:d.groupId,senderName:socket.username,senderDisplayName:u?.displayName,senderAvatar:u?.avatar,content:d.content,type:d.type||"text",mediaData:d.mediaData,fileName:d.fileName,replyTo:getReply(d.replyToId),createdAt:new Date().toISOString()})});

  socket.on("addReaction",(d)=>{const ex=db.exec("SELECT id FROM reactions WHERE messageId=? AND userId=?",[d.messageId,uid]);if(ex.length&&ex[0].values.length)db.run("UPDATE reactions SET emoji=? WHERE messageId=? AND userId=?",[d.emoji,d.messageId,uid]);else db.run("INSERT INTO reactions (messageId,userId,emoji) VALUES (?,?,?)",[d.messageId,uid,d.emoji]);const all=db.exec("SELECT r.emoji,r.userId,u.displayName FROM reactions r JOIN users u ON r.userId=u.id WHERE r.messageId=?",[d.messageId]);io.emit("messageReaction",{messageId:d.messageId,reactions:all.length?all[0].values.map(r=>({emoji:r[0],userId:r[1],displayName:r[2]})):[]})});

  socket.on("forwardMessage",(d)=>{const orig=db.exec("SELECT content,type,mediaData,fileName FROM messages WHERE id=?",[d.messageId]);if(!orig.length)return;const[c,t,m,f]=orig[0].values[0];const u=me();if(d.receiverId){db.run("INSERT INTO messages (senderId,receiverId,content,type,mediaData,fileName,forwardedFrom) VALUES (?,?,?,?,?,?,?)",[uid,d.receiverId,c,t,m,f,d.messageId]);const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];const msg={id,senderId:uid,receiverId:d.receiverId,senderDisplayName:u?.displayName,content:c,type:t,mediaData:m,fileName:f,forwardedFrom:d.messageId,isRead:0,createdAt:new Date().toISOString()};socket.emit("newPrivateMessage",msg);const rv=online.get(d.receiverId);if(rv)io.to(rv.socketId).emit("newPrivateMessage",msg)}else if(d.groupId){db.run("INSERT INTO messages (senderId,groupId,content,type,mediaData,fileName,forwardedFrom) VALUES (?,?,?,?,?,?,?)",[uid,d.groupId,c,t,m,f,d.messageId]);const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];io.to("g_"+d.groupId).emit("newGroupMessage",{id,senderId:uid,groupId:d.groupId,senderDisplayName:u?.displayName,content:c,type:t,mediaData:m,fileName:f,forwardedFrom:d.messageId,createdAt:new Date().toISOString()})}});

  socket.on("pinMessage",(d)=>{db.run("UPDATE messages SET isPinned=1 WHERE id=?",[d.messageId]);io.emit("messagePinned",{messageId:d.messageId})});
  socket.on("unpinMessage",(d)=>{db.run("UPDATE messages SET isPinned=0 WHERE id=?",[d.messageId]);io.emit("messageUnpinned",{messageId:d.messageId})});
  socket.on("markAsRead",(d)=>{db.run("UPDATE messages SET isRead=1,readAt=datetime('now') WHERE id=? AND receiverId=?",[d.messageId,uid]);const s=online.get(d.senderId);if(s)io.to(s.socketId).emit("messageRead",{messageId:d.messageId,readAt:new Date().toISOString()})});
  socket.on("markAllRead",(d)=>{db.run("UPDATE messages SET isRead=1,readAt=datetime('now') WHERE senderId=? AND receiverId=? AND isRead=0",[d.senderId,uid]);const s=online.get(d.senderId);if(s)io.to(s.socketId).emit("allMessagesRead",{readBy:uid})});
  socket.on("deleteMessage",(d)=>{db.run("UPDATE messages SET deletedForAll=1,content='[Mesaj silindi]',mediaData=NULL WHERE id=? AND senderId=?",[d.messageId,uid]);if(d.groupId)io.to("g_"+d.groupId).emit("messageDeleted",{messageId:d.messageId});else if(d.receiverId){socket.emit("messageDeleted",{messageId:d.messageId});const rv=online.get(d.receiverId);if(rv)io.to(rv.socketId).emit("messageDeleted",{messageId:d.messageId})}else io.emit("messageDeleted",{messageId:d.messageId})});

  socket.on("typing",(d)=>{const u=me();const data={userId:uid,displayName:u?.displayName};if(d.groupId)socket.to("g_"+d.groupId).emit("userTyping",{...data,groupId:d.groupId});else if(d.receiverId){const rv=online.get(d.receiverId);if(rv)io.to(rv.socketId).emit("userTyping",data)}else socket.broadcast.emit("userTyping",data)});
  socket.on("stopTyping",(d)=>{if(d.groupId)socket.to("g_"+d.groupId).emit("userStopTyping",{userId:uid});else if(d.receiverId){const rv=online.get(d.receiverId);if(rv)io.to(rv.socketId).emit("userStopTyping",{userId:uid})}else socket.broadcast.emit("userStopTyping",{userId:uid})});

  socket.on("callUser",(d)=>{const rv=online.get(d.receiverId);if(rv){const u=me();io.to(rv.socketId).emit("incomingCall",{callerId:uid,callerName:u?.displayName,callerAvatar:u?.avatar,signal:d.signal,isVideo:d.isVideo})}});
  socket.on("answerCall",(d)=>{const c=online.get(d.callerId);if(c)io.to(c.socketId).emit("callAccepted",{signal:d.signal,answererId:uid})});
  socket.on("rejectCall",(d)=>{const c=online.get(d.callerId);if(c)io.to(c.socketId).emit("callRejected",{})});
  socket.on("endCall",(d)=>{const o=online.get(d.userId);if(o)io.to(o.socketId).emit("callEnded",{})});
  socket.on("iceCandidate",(d)=>{const o=online.get(d.userId);if(o)io.to(o.socketId).emit("iceCandidate",{candidate:d.candidate,userId:uid})});
  socket.on("joinGroup",(d)=>socket.join("g_"+d.groupId));

  socket.on("disconnect",()=>{db.run("UPDATE users SET status='offline',lastSeen=datetime('now') WHERE id=?",[uid]);online.delete(uid);bcast()});
});

function bcast(){io.emit("onlineUsers",Array.from(online.values()).map(u=>({id:u.id,username:u.username,displayName:u.displayName,avatar:u.avatar})))}
app.set("io",io);app.set("onlineUsers",online);
const PORT=process.env.PORT||3001;
initDB().then(()=>server.listen(PORT,()=>console.log("[SohbetApp v5.0] :"+PORT))).catch(e=>{console.error(e);process.exit(1)});
