const r=require("express").Router(),bc=require("bcryptjs"),jwt=require("jsonwebtoken"),{getDB}=require("../database"),{auth}=require("../middleware/auth");
const S=process.env.JWT_SECRET||"sohbet_secret_2024";

r.post("/register",(req,res)=>{
  try{const{username,password,displayName}=req.body;if(!username||!password)return res.status(400).json({error:"Eksik"});
  const db=getDB();const ex=db.exec("SELECT id FROM users WHERE username=?",[username.toLowerCase()]);
  if(ex.length&&ex[0].values.length)return res.status(400).json({error:"Alinmis"});
  db.run("INSERT INTO users (username,password,displayName) VALUES (?,?,?)",[username.toLowerCase(),bc.hashSync(password,10),displayName||username]);
  const id=db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  const token=jwt.sign({id,username:username.toLowerCase(),role:"user"},S,{expiresIn:"30d"});
  res.json({token,user:{id,username:username.toLowerCase(),displayName:displayName||username,role:"user",avatar:null,bio:"",showOnline:1,showLastSeen:1}});
  }catch(e){res.status(500).json({error:"Hata"})}
});

r.post("/login",(req,res)=>{
  try{const{username,password}=req.body;const db=getDB();
  const result=db.exec("SELECT id,username,password,displayName,avatar,bio,role,isBlocked,showOnline,showLastSeen FROM users WHERE username=?",[username.toLowerCase()]);
  if(!result.length||!result[0].values.length)return res.status(401).json({error:"Bulunamadi"});
  const[id,un,hash,dn,av,bio,role,blocked,so,sl]=result[0].values[0];
  if(blocked)return res.status(403).json({error:"Engelli"});
  if(!bc.compareSync(password,hash))return res.status(401).json({error:"Sifre hatali"});
  const token=jwt.sign({id,username:un,role},S,{expiresIn:"30d"});
  res.json({token,user:{id,username:un,displayName:dn,avatar:av,bio,role,showOnline:so,showLastSeen:sl}});
  }catch(e){res.status(500).json({error:"Hata"})}
});

r.get("/me",auth,(req,res)=>{
  try{const db=getDB();const r2=db.exec("SELECT id,username,displayName,avatar,bio,role,showOnline,showLastSeen FROM users WHERE id=?",[req.user.id]);
  if(!r2.length)return res.status(404).json({error:"Yok"});
  const[id,un,dn,av,bio,role,so,sl]=r2[0].values[0];
  res.json({user:{id,username:un,displayName:dn,avatar:av,bio,role,showOnline:so,showLastSeen:sl}});
  }catch(e){res.status(500).json({error:"Hata"})}
});

r.put("/profile",auth,(req,res)=>{
  try{const db=getDB();const{displayName,bio,avatar,showOnline,showLastSeen}=req.body;
  if(displayName!==undefined)db.run("UPDATE users SET displayName=? WHERE id=?",[displayName,req.user.id]);
  if(bio!==undefined)db.run("UPDATE users SET bio=? WHERE id=?",[bio,req.user.id]);
  if(avatar!==undefined)db.run("UPDATE users SET avatar=? WHERE id=?",[avatar,req.user.id]);
  if(showOnline!==undefined)db.run("UPDATE users SET showOnline=? WHERE id=?",[showOnline?1:0,req.user.id]);
  if(showLastSeen!==undefined)db.run("UPDATE users SET showLastSeen=? WHERE id=?",[showLastSeen?1:0,req.user.id]);
  const r2=db.exec("SELECT id,username,displayName,avatar,bio,role,showOnline,showLastSeen FROM users WHERE id=?",[req.user.id]);
  const[id,un,dn,av,b,role,so,sl]=r2[0].values[0];
  res.json({user:{id,username:un,displayName:dn,avatar:av,bio:b,role,showOnline:so,showLastSeen:sl}});
  }catch(e){res.status(500).json({error:"Hata"})}
});

module.exports=r;
