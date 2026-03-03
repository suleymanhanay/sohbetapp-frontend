const r=require("express").Router(),{getDB}=require("../database"),{auth}=require("../middleware/auth");

r.get("/",auth,(req,res)=>{
  try{const db=getDB();
  const blocked=db.exec("SELECT blockedId FROM blocked_users WHERE userId=?",[req.user.id]);
  const bids=blocked.length?blocked[0].values.map(r=>r[0]):[];
  const result=db.exec("SELECT id,username,displayName,avatar,bio,status,lastSeen,showOnline,showLastSeen FROM users WHERE id!=? AND isBlocked=0",[req.user.id]);
  if(!result.length)return res.json({users:[]});
  const users=result[0].values.filter(u=>!bids.includes(u[0])).map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3],bio:u[4],status:u[7]?u[5]:"hidden",lastSeen:u[8]?u[6]:null}));
  res.json({users});}catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/search",auth,(req,res)=>{
  try{const db=getDB();const q="%"+(req.query.q||"")+"%";
  const result=db.exec("SELECT id,username,displayName,avatar,bio FROM users WHERE (username LIKE ? OR displayName LIKE ?) AND id!=? AND isBlocked=0 LIMIT 20",[q,q,req.user.id]);
  const users=result.length?result[0].values.map(u=>({id:u[0],username:u[1],displayName:u[2],avatar:u[3],bio:u[4]})):[];
  res.json({users});}catch(e){res.status(500).json({error:"Hata"})}
});

r.post("/block/:id",auth,(req,res)=>{
  try{const db=getDB();const tid=parseInt(req.params.id);
  const ex=db.exec("SELECT id FROM blocked_users WHERE userId=? AND blockedId=?",[req.user.id,tid]);
  if(ex.length&&ex[0].values.length){db.run("DELETE FROM blocked_users WHERE userId=? AND blockedId=?",[req.user.id,tid]);res.json({blocked:false})}
  else{db.run("INSERT INTO blocked_users (userId,blockedId) VALUES (?,?)",[req.user.id,tid]);res.json({blocked:true})}
  }catch(e){res.status(500).json({error:"Hata"})}
});

module.exports=r;
