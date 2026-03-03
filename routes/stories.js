const r=require("express").Router(),{getDB}=require("../database"),{auth}=require("../middleware/auth");

r.post("/",auth,(req,res)=>{
  try{const db=getDB();const{content,mediaData,type,bgColor}=req.body;
  const exp=new Date(Date.now()+24*60*60*1000).toISOString();
  db.run("INSERT INTO stories (userId,content,mediaData,type,bgColor,expiresAt) VALUES (?,?,?,?,?,?)",[req.user.id,content||"",mediaData||null,type||"text",bgColor||"#6C5CE7",exp]);
  const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  res.json({story:{id,userId:req.user.id,content,mediaData,type:type||"text",bgColor:bgColor||"#6C5CE7",viewCount:0,createdAt:new Date().toISOString(),expiresAt:exp}});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/",auth,(req,res)=>{
  try{const db=getDB();db.run("DELETE FROM stories WHERE expiresAt < datetime('now')");
  const result=db.exec("SELECT s.id,s.userId,s.content,s.mediaData,s.type,s.bgColor,s.viewCount,s.createdAt,s.expiresAt,u.username,u.displayName,u.avatar FROM stories s JOIN users u ON s.userId=u.id WHERE s.expiresAt>datetime('now') ORDER BY s.createdAt DESC");
  if(!result.length)return res.json({stories:[]});
  const byUser={};result[0].values.forEach(s=>{const uid=s[1];if(!byUser[uid])byUser[uid]={userId:uid,username:s[9],displayName:s[10],avatar:s[11],stories:[]};
  const viewed=db.exec("SELECT id FROM story_views WHERE storyId=? AND viewerId=?",[s[0],req.user.id]);
  byUser[uid].stories.push({id:s[0],content:s[2],mediaData:s[3],type:s[4],bgColor:s[5],viewCount:s[6],createdAt:s[7],expiresAt:s[8],viewed:viewed.length>0&&viewed[0].values.length>0})});
  const stories=Object.values(byUser);stories.sort((a,b)=>a.userId===req.user.id?-1:b.userId===req.user.id?1:0);
  res.json({stories});}catch(e){res.status(500).json({error:"Hata"})}
});

r.post("/:id/view",auth,(req,res)=>{try{const db=getDB();const sid=parseInt(req.params.id);db.run("INSERT OR IGNORE INTO story_views (storyId,viewerId) VALUES (?,?)",[sid,req.user.id]);db.run("UPDATE stories SET viewCount=(SELECT COUNT(*) FROM story_views WHERE storyId=?) WHERE id=?",[sid,sid]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});
r.delete("/:id",auth,(req,res)=>{try{const db=getDB();const sid=parseInt(req.params.id);db.run("DELETE FROM story_views WHERE storyId=?",[sid]);db.run("DELETE FROM stories WHERE id=? AND userId=?",[sid,req.user.id]);res.json({ok:true})}catch(e){res.status(500).json({error:"Hata"})}});

module.exports=r;
