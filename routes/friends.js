const r=require("express").Router(),{getDB}=require("../database"),{auth}=require("../middleware/auth");

r.post("/request/:id",auth,(req,res)=>{
  try{const db=getDB();const fid=parseInt(req.params.id);if(fid===req.user.id)return res.status(400).json({error:"Kendinize olmaz"});
  const ex=db.exec("SELECT id,status FROM friends WHERE (userId=? AND friendId=?) OR (userId=? AND friendId=?)",[req.user.id,fid,fid,req.user.id]);
  if(ex.length&&ex[0].values.length){const st=ex[0].values[0][1];if(st==="accepted")return res.status(400).json({error:"Zaten arkadas"});if(st==="pending")return res.status(400).json({error:"Istek var"});}
  db.run("INSERT INTO friends (userId,friendId,status) VALUES (?,?,'pending')",[req.user.id,fid]);
  const io=req.app.get("io"),online=req.app.get("onlineUsers"),target=online.get(fid);
  if(target){const u=db.exec("SELECT displayName,avatar FROM users WHERE id=?",[req.user.id]);io.to(target.socketId).emit("friendRequest",{fromId:req.user.id,fromName:u.length?u[0].values[0][0]:"",fromAvatar:u.length?u[0].values[0][1]:""});}
  res.json({ok:true});}catch(e){res.status(500).json({error:"Hata"})}
});

r.put("/accept/:id",auth,(req,res)=>{try{const db=getDB();const fid=parseInt(req.params.id);db.run("UPDATE friends SET status='accepted' WHERE userId=? AND friendId=?",[fid,req.user.id]);const io=req.app.get("io"),online=req.app.get("onlineUsers"),t=online.get(fid);if(t)io.to(t.socketId).emit("friendAccepted",{userId:req.user.id});res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.put("/reject/:id",auth,(req,res)=>{try{const db=getDB();db.run("DELETE FROM friends WHERE userId=? AND friendId=? AND status='pending'",[parseInt(req.params.id),req.user.id]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.delete("/:id",auth,(req,res)=>{try{const db=getDB();const fid=parseInt(req.params.id);db.run("DELETE FROM friends WHERE (userId=? AND friendId=?) OR (userId=? AND friendId=?)",[req.user.id,fid,fid,req.user.id]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});

r.get("/",auth,(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT u.id,u.username,u.displayName,u.avatar,u.bio,u.status,u.lastSeen FROM friends f JOIN users u ON (CASE WHEN f.userId=? THEN f.friendId ELSE f.userId END)=u.id WHERE (f.userId=? OR f.friendId=?) AND f.status='accepted'",[req.user.id,req.user.id,req.user.id]);
  const friends=result.length?result[0].values.map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3],bio:u[4],status:u[5],lastSeen:u[6]})):[];
  res.json({friends});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/requests",auth,(req,res)=>{
  try{const db=getDB();
  const inc=db.exec("SELECT u.id,u.username,u.displayName,u.avatar FROM friends f JOIN users u ON f.userId=u.id WHERE f.friendId=? AND f.status='pending'",[req.user.id]);
  const out=db.exec("SELECT u.id,u.username,u.displayName,u.avatar FROM friends f JOIN users u ON f.friendId=u.id WHERE f.userId=? AND f.status='pending'",[req.user.id]);
  res.json({incoming:inc.length?inc[0].values.map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3]})):[],outgoing:out.length?out[0].values.map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3]})):[]});}catch(e){res.status(500).json({error:"Hata"})}
});

module.exports=r;
