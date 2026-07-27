import { effectConfig } from "../effects/effectConfig";
import { clamp, distance3, lerp } from "../utils/math";
import type { StableTrackedHand, TwoHandEffectAnchor, WorldPoint } from "../tracking/tracking.types";
const damp=(a:number,b:number,l:number,dt:number)=>lerp(a,b,1-Math.exp(-l*dt));
const inv=(a:number,b:number,v:number)=>clamp((v-a)/Math.max(b-a,.0001),0,1);
const sub=(a:WorldPoint,b:WorldPoint):WorldPoint=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const norm=(v:WorldPoint):WorldPoint=>{const n=Math.max(Math.hypot(v.x,v.y,v.z),.0001);return{x:v.x/n,y:v.y/n,z:v.z/n};};
const mid=(a:WorldPoint,b:WorldPoint):WorldPoint=>({x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,z:(a.z+b.z)*.5});
const dampPoint=(a:WorldPoint,b:WorldPoint,l:number,dt:number):WorldPoint=>({x:damp(a.x,b.x,l,dt),y:damp(a.y,b.y,l,dt),z:damp(a.z,b.z,l,dt)});
const wristWorld=(hand:StableTrackedHand):WorldPoint=>{const wrist=hand.landmarks[0];if(!wrist)return hand.palmWorld;return{x:hand.palmWorld.x+(wrist.x-hand.palmNormalized.x),y:hand.palmWorld.y-(wrist.y-hand.palmNormalized.y),z:hand.palmWorld.z+(wrist.z-hand.palmNormalized.z)};};
export const createTwoHandAnchor=(hands:StableTrackedHand[],previous:TwoHandEffectAnchor|null,deltaTime:number):TwoHandEffectAnchor|null=>{
 const visible=hands.filter(h=>h.trackingConfidence>.2);if(visible.length<2)return null;const sorted=[...visible].sort((a,b)=>a.palmScreen.x-b.palmScreen.x);const left=sorted[0],right=sorted[sorted.length-1];
 const rawMid=mid(left.palmWorld,right.palmWorld),rawDistance=distance3(left.palmWorld,right.palmWorld),cfg=effectConfig.twoHandAnchor,same=previous?.leftHandId===left.id&&previous?.rightHandId===right.id;
 const smoothedMid=same?dampPoint(previous!.smoothedMidpoint,rawMid,cfg.midpointDamping,deltaTime):rawMid;const smoothedDistance=same?damp(previous!.smoothedDistance,rawDistance,cfg.distanceDamping,deltaTime):rawDistance;
 const rawVelocity=previous?(rawDistance-previous.distance)/Math.max(deltaTime,.001):0;const velocity=damp(previous?.distanceVelocity??0,rawVelocity,cfg.velocityDamping,deltaTime);const dead=Math.abs(velocity)<cfg.movementDeadZone?0:velocity;
 const wristsDistance=distance3(wristWorld(left),wristWorld(right));const outwardVelocity=clamp(Math.abs(dead)/1.5,0,1);const expansionMetric=rawDistance*cfg.palmDistanceWeight+wristsDistance*cfg.wristDistanceWeight+outwardVelocity*cfg.velocityWeight;const normalizedExpansion=inv(cfg.minimumExpansionMetric,cfg.maximumExpansionMetric,expansionMetric);const expansionCurve=Math.pow(normalizedExpansion,cfg.expansionCurveExponent);
 const targetVisualRadius=lerp(cfg.minimumOrbRadius,cfg.maximumOrbRadius,expansionCurve)*lerp(1,cfg.expansionGain,expansionCurve);const visualRadius=same?damp(previous?.visualRadius??targetVisualRadius,targetVisualRadius,cfg.radiusDamping,deltaTime):targetVisualRadius;
 const targetRadius=lerp(42,170,inv(cfg.minHandDistance,cfg.maxHandDistance,smoothedDistance));const radius=same?damp(previous?.radius??targetRadius,targetRadius,cfg.radiusDamping,deltaTime):targetRadius;const direction=norm(sub(right.palmWorld,left.palmWorld));const angle=Math.atan2(direction.y,direction.x);
 const stability=clamp(1-Math.abs(dead)/1.8,0,1),facing=Math.max(left.palmFacingScore,right.palmFacingScore,.55),tracking=Math.min(left.trackingConfidence,right.trackingConfidence);
 return {leftHandId:left.id,rightHandId:right.id,leftPalm:left.palmWorld,rightPalm:right.palmWorld,midpoint:rawMid,smoothedMidpoint:smoothedMid,direction,distance:rawDistance,smoothedDistance,normalizedDistance:inv(cfg.minHandDistance,cfg.maxHandDistance,smoothedDistance),angle,distanceVelocity:dead,closingSpeed:Math.max(0,-dead),openingSpeed:Math.max(0,dead),radius,targetRadius,facingConfidence:facing,stabilityConfidence:stability,overallConfidence:clamp(tracking*stability*facing,0,1),wristDistance:wristsDistance,expansionMetric,normalizedExpansion,expansionCurve,targetVisualRadius,visualRadius,stretchX:Math.min(cfg.maximumStretchX,1+expansionCurve*1.4),stretchY:Math.max(cfg.minimumStretchY,1-expansionCurve*.25),stretchZ:Math.min(cfg.maximumStretchZ,1+Math.min(1,Math.abs(dead)/2.5)*.5),axisAngle:angle,turbulence:.04+expansionCurve*.08};
};

