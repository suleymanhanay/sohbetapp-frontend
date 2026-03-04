export const formatTime = d => d ? new Date(d).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}) : "";
export const formatDate = d => {
  if(!d) return "";
  const date = new Date(d), now = new Date(), m = Math.floor((now-date)/60000);
  if(m < 1) return "şimdi";
  if(m < 60) return m + "dk";
  const h = Math.floor(m/60);
  if(h < 24) return h + "sa";
  return date.toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
};
export const getInitials = n => n ? n.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2) : "?";
export const truncate = (s, l=36) => s ? (s.length > l ? s.slice(0,l) + "…" : s) : "";
export const fileToBase64 = f => new Promise((res,rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); r.onerror = e => rej(e); });

export const playNotif = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.1);
  } catch {}
};

export const playCallSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.setValueAtTime(660, ctx.currentTime + t);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
    });
  } catch {}
};

export const EMOJIS = ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤔","🤯","😮","😢","😡","🥺","👍","👎","❤️","🔥","🎉","💯","👏","🙏","💪","✨","🚀","💰","📈","📉","💎","⚡","🏦","💵","📊","🎯","💼","🤝"];
export const QUICK_REACTIONS = ["🔥","📈","💰","❤️","😂","👍"];
export const STORY_BG = ["#10B981","#3B82F6","#8B5CF6","#F43F5E","#F59E0B","#06B6D4","#EC4899","#18181B"];
