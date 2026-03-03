export function formatTime(d){if(!d)return"";return new Date(d).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
export function formatDate(d){if(!d)return"";const date=new Date(d);const now=new Date();const m=Math.floor((now-date)/60000);if(m<1)return"simdi";if(m<60)return`${m}dk`;const h=Math.floor(m/60);if(h<24)return`${h}sa`;const dy=Math.floor(h/24);if(dy<7)return`${dy}g`;return date.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}
export function formatFullDate(d){if(!d)return"";return new Date(d).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
export function getInitials(n){if(!n)return"?";return n.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2)}
export function truncate(s,l=40){if(!s)return"";return s.length>l?s.slice(0,l)+"...":s}
export function fileToBase64(f){return new Promise((res,rej)=>{const r=new FileReader();r.readAsDataURL(f);r.onload=()=>res(r.result);r.onerror=e=>rej(e)})}
