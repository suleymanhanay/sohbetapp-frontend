const r=require("express").Router(),{getDB}=require("../database"),{auth}=require("../middleware/auth");

r.post("/",auth,(req,res)=>{
  try{const db=getDB();const{name,description,memberIds}=req.body;if(!name)return res.status(400).json({error:"Ad gerekli"});
  db.run("INSERT INTO groups_table (name,description,createdBy) VALUES (?,?,?)",[name,description||"",req.user.id]);
  const gid=db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  db.run("INSERT INTO group_members (groupId,userId,role) VALUES (?,?,'admin')",[gid,req.user.id]);
  if(memberIds&&Array.isArray(memberIds))memberIds.forEach(mid=>{if(mid!==req.user.id)try{db.run("INSERT INTO group_members (groupId,userId) VALUES (?,?)",[gid,mid])}catch{}});
  res.json({group:{id:gid,name,description:description||"",createdBy:req.user.id}});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/",auth,(req,res)=>{
  try{const db=getDB();const result=db.exec("SELECT g.id,g.name,g.description,g.avatar,g.createdBy,g.createdAt,gm.role FROM groups_table g JOIN group_members gm ON g.id=gm.groupId WHERE gm.userId=?",[req.user.id]);
  if(!result.length)return res.json({groups:[]});
  const groups=result[0].values.map(g=>{const mc=db.exec("SELECT COUNT(*) FROM group_members WHERE groupId=?",[g[0]]);const lm=db.exec("SELECT m.content,m.type,m.createdAt,u.displayName FROM messages m JOIN users u ON m.senderId=u.id WHERE m.groupId=? ORDER BY m.createdAt DESC LIMIT 1",[g[0]]);
  return{id:g[0],name:g[1],description:g[2],avatar:g[3],createdBy:g[4],createdAt:g[5],myRole:g[6],memberCount:mc[0].values[0][0],lastMessage:lm.length?{content:lm[0].values[0][0],type:lm[0].values[0][1],createdAt:lm[0].values[0][2],senderName:lm[0].values[0][3]}:null}});
  res.json({groups});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/:id",auth,(req,res)=>{
  try{const db=getDB();const gid=parseInt(req.params.id);
  const g=db.exec("SELECT id,name,description,avatar,createdBy FROM groups_table WHERE id=?",[gid]);if(!g.length)return res.status(404).json({error:"Yok"});
  const members=db.exec("SELECT u.id,u.username,u.displayName,u.avatar,gm.role FROM group_members gm JOIN users u ON gm.userId=u.id WHERE gm.groupId=?",[gid]);
  const ml=members.length?members[0].values.map(m=>({id:m[0],username:m[1],displayName:m[2],avatar:m[3],role:m[4]})):[];
  const[id,name,desc,av,cb]=g[0].values[0];
  res.json({group:{id,name,description:desc,avatar:av,createdBy:cb,members:ml}});}catch(e){res.status(500).json({error:"Hata"})}
});

r.post("/:id/members",auth,(req,res)=>{try{const db=getDB();db.run("INSERT OR IGNORE INTO group_members (groupId,userId) VALUES (?,?)",[parseInt(req.params.id),req.body.userId]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.delete("/:id/members/:uid",auth,(req,res)=>{try{const db=getDB();db.run("DELETE FROM group_members WHERE groupId=? AND userId=?",[parseInt(req.params.id),parseInt(req.params.uid)]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.delete("/:id",auth,(req,res)=>{try{const db=getDB();const gid=parseInt(req.params.id);db.run("DELETE FROM group_members WHERE groupId=?",[gid]);db.run("DELETE FROM messages WHERE groupId=?",[gid]);db.run("DELETE FROM groups_table WHERE id=?",[gid]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});

module.exports=r;
