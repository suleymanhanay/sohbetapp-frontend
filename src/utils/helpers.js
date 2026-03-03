export function formatTime(d){if(!d)return"";return new Date(d).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
export function getInitials(n){if(!n)return"?";return n.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2)}
export function truncate(s,l=40){if(!s)return"";return s.length>l?s.slice(0,l)+"...":s}
export function fileToBase64(f){return new Promise((res,rej)=>{const r=new FileReader();r.readAsDataURL(f);r.onload=()=>res(r.result);r.onerror=e=>rej(e)})}