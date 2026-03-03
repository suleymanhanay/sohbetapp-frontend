const r=require("express").Router(),{getDB}=require("../database"),{auth}=require("../middleware/auth");

function loadReactions(db,msgId){const rx=db.exec("SELECT r.emoji,r.userId,u.displayName FROM reactions r JOIN users u ON r.userId=u.id WHERE r.messageId=?",[msgId]);return rx.length?rx[0].values.map(r=>({emoji:r[0],userId:r[1],displayName:r[2]})):[];}
function loadReply(db,rid){if(!rid)return null;const r=db.exec("SELECT m.id,m.content,m.type,m.senderId,u.displayName FROM messages m JOIN users u ON m.senderId=u.id WHERE m.id=?",[rid]);return r.length?{id:r[0].values[0][0],content:r[0].values[0][1],type:r[0].values[0][2],senderId:r[0].values[0][3],senderName:r[0].values[0][4]}:null;}

r.get("/room/:roomId",auth,(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT m.id,m.senderId,m.content,m.type,m.mediaData,m.fileName,m.replyToId,m.forwardedFrom,m.isPinned,m.deletedForAll,m.createdAt,u.username,u.displayName,u.avatar FROM messages m JOIN users u ON m.senderId=u.id WHERE m.roomId=? AND m.groupId IS NULL ORDER BY m.createdAt ASC LIMIT 500",[req.params.roomId]);
  if(!result.length)return res.json({messages:[]});
  const messages=result[0].values.map(m=>({id:m[0],senderId:m[1],content:m[2],type:m[3],mediaData:m[4],fileName:m[5],replyToId:m[6],forwardedFrom:m[7],isPinned:m[8],deletedForAll:m[9],createdAt:m[10],senderName:m[11],senderDisplayName:m[12],senderAvatar:m[13],reactions:loadReactions(db,m[0]),replyTo:loadReply(db,m[6])}));
  res.json({messages});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/private/:userId",auth,(req,res)=>{
  try{const db=getDB();const oid=parseInt(req.params.userId);
  const result=db.exec("SELECT m.id,m.senderId,m.receiverId,m.content,m.type,m.mediaData,m.fileName,m.replyToId,m.forwardedFrom,m.isPinned,m.isRead,m.readAt,m.deletedForAll,m.createdAt,u.username,u.displayName,u.avatar FROM messages m JOIN users u ON m.senderId=u.id WHERE m.groupId IS NULL AND m.roomId IS NULL AND ((m.senderId=? AND m.receiverId=?) OR (m.senderId=? AND m.receiverId=?)) ORDER BY m.createdAt ASC LIMIT 500",[req.user.id,oid,oid,req.user.id]);
  if(!result.length)return res.json({messages:[]});
  const messages=result[0].values.map(m=>({id:m[0],senderId:m[1],receiverId:m[2],content:m[3],type:m[4],mediaData:m[5],fileName:m[6],replyToId:m[7],forwardedFrom:m[8],isPinned:m[9],isRead:m[10],readAt:m[11],deletedForAll:m[12],createdAt:m[13],senderName:m[14],senderDisplayName:m[15],senderAvatar:m[16],reactions:loadReactions(db,m[0]),replyTo:loadReply(db,m[7])}));
  res.json({messages});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/group/:groupId",auth,(req,res)=>{
  try{const db=getDB();const gid=parseInt(req.params.groupId);
  const result=db.exec("SELECT m.id,m.senderId,m.content,m.type,m.mediaData,m.fileName,m.replyToId,m.forwardedFrom,m.isPinned,m.deletedForAll,m.createdAt,u.username,u.displayName,u.avatar FROM messages m JOIN users u ON m.senderId=u.id WHERE m.groupId=? ORDER BY m.createdAt ASC LIMIT 500",[gid]);
  if(!result.length)return res.json({messages:[]});
  const messages=result[0].values.map(m=>({id:m[0],senderId:m[1],content:m[2],type:m[3],mediaData:m[4],fileName:m[5],replyToId:m[6],forwardedFrom:m[7],isPinned:m[8],deletedForAll:m[9],createdAt:m[10],senderName:m[11],senderDisplayName:m[12],senderAvatar:m[13],reactions:loadReactions(db,m[0])}));
  res.json({messages});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/search",auth,(req,res)=>{
  try{const db=getDB();const q="%"+(req.query.q||"")+"%";
  const result=db.exec("SELECT m.id,m.senderId,m.content,m.type,m.createdAt,u.displayName,m.roomId,m.receiverId,m.groupId FROM messages m JOIN users u ON m.senderId=u.id WHERE m.content LIKE ? AND m.deletedForAll=0 AND (m.roomId='general' OR m.senderId=? OR m.receiverId=?) ORDER BY m.createdAt DESC LIMIT 50",[q,req.user.id,req.user.id]);
  const msgs=result.length?result[0].values.map(m=>({id:m[0],senderId:m[1],content:m[2],type:m[3],createdAt:m[4],senderDisplayName:m[5],roomId:m[6],receiverId:m[7],groupId:m[8]})):[];
  res.json({messages:msgs});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/unread/counts",auth,(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT senderId,COUNT(*) FROM messages WHERE receiverId=? AND isRead=0 AND deletedForAll=0 GROUP BY senderId",[req.user.id]);
  const c={};if(result.length)result[0].values.forEach(r=>{c[r[0]]=r[1]});res.json({unreadCounts:c});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/last-messages",auth,(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT DISTINCT CASE WHEN senderId=? THEN receiverId ELSE senderId END as oid,content,type,createdAt,senderId FROM messages WHERE (senderId=? OR receiverId=?) AND groupId IS NULL AND roomId IS NULL AND deletedForAll=0 ORDER BY createdAt DESC",[req.user.id,req.user.id,req.user.id]);
  const lm={};if(result.length)result[0].values.forEach(r=>{if(!lm[r[0]])lm[r[0]]={content:r[1],type:r[2],createdAt:r[3],senderId:r[4]}});
  res.json({lastMessages:lm});}catch(e){res.status(500).json({error:"Hata"})}
});

module.exports=r;
