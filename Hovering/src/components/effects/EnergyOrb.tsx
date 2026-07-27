import { useEffect, useRef } from "react";
import { useTrackingStore } from "../../stores/useTrackingStore";

const ORB_STATES=new Set(["orb-forming","orb-stable","orb-compressing","orb-expanding","orb-charging","orb-released","orb-fading"]);
const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const ease=(v:number)=>1-Math.pow(1-clamp(v),3);
export const EnergyOrb=()=>{
 const canvasRef=useRef<HTMLCanvasElement|null>(null); const snapshot=useTrackingStore();
 const lifecycle=ORB_STATES.has(snapshot.interactionState); const anchor=snapshot.twoHandAnchor; const release=snapshot.releaseAnchor;
 useEffect(()=>{ const canvas=canvasRef.current;if(!canvas)return; let raf=0; const ctx=canvas.getContext("2d");if(!ctx)return; const particles=Array.from({length:72},(_,i)=>({a:i*.618,r:(i%9)/9,v:.4+(i%5)*.12}));
  const draw=(time:number)=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==rect.width*dpr||canvas.height!==rect.height*dpr){canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);if(!lifecycle){raf=requestAnimationFrame(draw);return;} const p=release?release:(anchor?.smoothedMidpoint??{x:0,y:0,z:0}); const x=(p.x+1)*.5*rect.width,y=(1-p.y)*.5*rect.height; const forming=snapshot.interactionState==="orb-forming"?ease(snapshot.formationProgress):1; const rel=snapshot.interactionState==="orb-released"?snapshot.releaseProgress:0; const fade=snapshot.interactionState==="orb-fading"?.55:1; const intensity=(.55+snapshot.charge*1.8)*forming*(1-rel*.45)*fade; const base=Math.max(18, (anchor?.radius??70)*.0065)*(.35+.65*forming)*(1+snapshot.charge*.28); const shock=rel>0?base+(ease(rel)*Math.max(rect.width,rect.height)*.32):0;
   ctx.save();ctx.globalCompositeOperation="lighter"; if(shock){ctx.strokeStyle=`rgba(117,229,255,${Math.pow(1-rel,1.5)*.75})`;ctx.lineWidth=2+4*(1-rel);ctx.beginPath();ctx.arc(x,y,shock,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=`rgba(234,255,255,${Math.pow(1-rel,2)*.55})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,shock*.82,0,Math.PI*2);ctx.stroke();}
   const glow=ctx.createRadialGradient(x,y,0,x,y,base*3.8);glow.addColorStop(0,`rgba(235,255,255,${.9*intensity})`);glow.addColorStop(.18,`rgba(87,218,255,${.65*intensity})`);glow.addColorStop(.55,`rgba(61,117,255,${.18*intensity})`);glow.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,base*3.8,0,Math.PI*2);ctx.fill();
   for(let i=0;i<3;i++){const rr=base*(1.25+i*.32)*(1+snapshot.charge*.25+rel*2);ctx.strokeStyle=`rgba(${i===1?130:90},${i===1?240:190},255,${(.28-i*.05)*intensity*(1-rel)})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(x,y,rr,rr*(.5+i*.12),time*.00025*(i%2?-1:1)+i,0,Math.PI*2);ctx.stroke();}
   particles.forEach((q)=>{const angle=q.a+time*.001*q.v*(1+snapshot.charge*3);const outward=rel*base*8;const rr=base*(1.3+q.r*2)+outward*q.r;ctx.fillStyle=`rgba(162,238,255,${.55*(1-rel)*intensity})`;ctx.fillRect(x+Math.cos(angle)*rr-1,y+Math.sin(angle)*rr-1,2,2);});
   const core=ctx.createRadialGradient(x-base*.2,y-base*.25,0,x,y,base);core.addColorStop(0,"#ffffff");core.addColorStop(.22,`rgba(177,250,255,${.98*intensity})`);core.addColorStop(.68,`rgba(47,152,255,${.72*intensity})`);core.addColorStop(1,"rgba(39,81,220,0)");ctx.fillStyle=core;ctx.beginPath();ctx.arc(x,y,base*(1-rel*.32),0,Math.PI*2);ctx.fill();
   if(snapshot.interactionState==="orb-released"&&rel<.22){ctx.fillStyle=`rgba(255,255,255,${(1-rel/.22)*.65})`;ctx.beginPath();ctx.arc(x,y,base*2.4,0,Math.PI*2);ctx.fill();}ctx.restore();raf=requestAnimationFrame(draw);}; raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
 },[lifecycle,anchor,snapshot.interactionState,snapshot.charge,snapshot.formationProgress,snapshot.releaseProgress,release,snapshot.candidateDuration]);
 return <canvas ref={canvasRef} className="energy-orb" aria-label="Two-hand energy orb"/>;
};


