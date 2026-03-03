const r=require("express").Router(),{getDB}=require("../database"),{auth,admin}=require("../middleware/auth");
r.use(auth,admin);

r.get("/stats",(req,res)=>{
  try{const db=getDB();const on=req.app.get("onlineUsers")?.size||0;
  res.json({stats:{totalUsers:db.exec("SELECT COUNT(*) FROM users")[0].values[0][0],onlineUsers:on,totalMessages:db.exec("SELECT COUNT(*) FROM messages")[0].values[0][0],todayMessages:db.exec("SELECT COUNT(*) FROM messages WHERE date(createdAt)=date('now')")[0].values[0][0],totalGroups:db.exec("SELECT COUNT(*) FROM groups_table")[0].values[0][0],totalStories:db.exec("SELECT COUNT(*) FROM stories WHERE expiresAt>datetime('now')")[0].values[0][0]}});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/users",(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT id,username,displayName,avatar,role,status,isBlocked,createdAt,lastSeen FROM users ORDER BY createdAt DESC");
  const users=result.length?result[0].values.map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3],role:u[4],status:u[5],isBlocked:u[6],createdAt:u[7],lastSeen:u[8]})):[];
  res.json({users});}catch(e){res.status(500).json({error:"Hata"})}
});

r.put("/users/:id/block",(req,res)=>{try{const db=getDB();const uid=parseInt(req.params.id);const cur=db.exec("SELECT isBlocked FROM users WHERE id=?",[uid]);const nv=cur[0].values[0][0]?0:1;db.run("UPDATE users SET isBlocked=? WHERE id=?",[nv,uid]);res.json({isBlocked:nv})}catch(e){res.status(500).json({error:"Hata"})}});
r.put("/users/:id/role",(req,res)=>{try{const db=getDB();db.run("UPDATE users SET role=? WHERE id=?",[req.body.role,parseInt(req.params.id)]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.delete("/users/:id",(req,res)=>{try{const db=getDB();const uid=parseInt(req.params.id);if(uid===req.user.id)return res.status(400).json({error:"Kendinizi silemezsiniz"});db.run("DELETE FROM messages WHERE senderId=?",[uid]);db.run("DELETE FROM group_members WHERE userId=?",[uid]);db.run("DELETE FROM friends WHERE userId=? OR friendId=?",[uid,uid]);db.run("DELETE FROM users WHERE id=?",[uid]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});

module.exports=r;
