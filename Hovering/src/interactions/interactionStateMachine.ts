import type { StableTrackedHand, TwoHandEffectAnchor } from "../tracking/tracking.types";
import { effectConfig } from "../effects/effectConfig";
import type { InteractionFrame, InteractionState, OrbReadiness } from "./interaction.types";

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const finitePoint=(p:{x:number;y:number;z:number})=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);

export class InteractionRuntime {
  state: InteractionState = "idle";
  candidateStartedAt:number|null=null;
  readyStartedAt:number|null=null;
  stateEnteredAt=0;
  releaseStartedAt:number|null=null;
  cooldownUntil=0;
  chargingStartedAt:number|null=null;
  charge=0;
  maximumCharge=0;
  releaseAnchor:{x:number;y:number;z:number}|null=null;
  lastValidTwoHandTimestamp=0;
  lastEvent:string|null=null;

  update(hands:StableTrackedHand[], anchor:TwoHandEffectAnchor|null, now:number):InteractionFrame {
    const validHands=hands.filter(h=>h.trackingConfidence>=effectConfig.interaction.minimumTrackingConfidence);
    const hasTwo=validHands.length>=2 && !!anchor;
    const validDistance=!!anchor && anchor.smoothedDistance>=effectConfig.interaction.minimumHandDistance && anchor.smoothedDistance<=effectConfig.interaction.maximumHandDistance;
    const validStability=!!anchor && anchor.stabilityConfidence>=effectConfig.interaction.minimumStabilityConfidence;
    const validFacing=!!anchor && anchor.facingConfidence>=effectConfig.interaction.minimumFacingConfidence;
    const finite=!!anchor && finitePoint(anchor.smoothedMidpoint);
    const overallScore=anchor ? clamp(Math.min(anchor.overallConfidence, anchor.stabilityConfidence, anchor.facingConfidence)) : 0;
    const ready=hasTwo&&validDistance&&validStability&&finite&&(validFacing||effectConfig.interaction.allowRelaxedFacing);
    const readiness:OrbReadiness={hasTwoHands:hasTwo,validTrackingConfidence:hasTwo,validDistance,validStability,validFacing,overallScore};
    if(ready) this.lastValidTwoHandTimestamp=now;

    if(this.state==="cooldown") {
      if(now>=this.cooldownUntil) this.transition(ready?"two-hand-candidate":"idle",now);
    } else if(this.state==="orb-released") {
      if(this.releaseStartedAt!==null && now-this.releaseStartedAt>=effectConfig.interaction.releaseDurationMs) { this.cooldownUntil=now+effectConfig.interaction.cooldownDurationMs; this.transition("cooldown",now); }
    } else if(["orb-forming","orb-stable","orb-compressing","orb-expanding","orb-charging"].includes(this.state) && !hasTwo) {
      if(now-this.lastValidTwoHandTimestamp>effectConfig.interaction.trackingLossGraceMs) this.transition("orb-fading",now);
    } else if(this.state==="orb-fading") {
      if(hasTwo&&ready) this.transition("orb-stable",now);
      else if(now-this.stateEnteredAt>=effectConfig.interaction.trackingFadeDurationMs) this.transition("idle",now);
    } else if(hasTwo && ready) {
      if(this.state==="idle"||this.state==="one-hand") { this.candidateStartedAt ??= now; this.transition("two-hand-candidate",now); }
      else if(this.state==="two-hand-ready") { this.readyStartedAt ??= now; if(now-this.readyStartedAt>=effectConfig.interaction.readyDurationMs) this.transition("orb-forming",now); }
      else if(this.state==="two-hand-candidate") { this.candidateStartedAt ??= now; if(now-this.candidateStartedAt>=effectConfig.interaction.candidateDurationMs) this.transition("two-hand-ready",now); }
    } else if(!hasTwo && !["orb-fading","orb-released","cooldown"].includes(this.state)) {
      this.candidateStartedAt=null; this.readyStartedAt=null; if(this.state!=="idle") this.transition(validHands.length===1?"one-hand":"idle",now);
    }

    if(this.state==="orb-forming" && now-this.stateEnteredAt>=effectConfig.interaction.formationDurationMs) this.transition("orb-stable",now);
    const closing=anchor?.closingSpeed??0, opening=anchor?.openingSpeed??0;
    if(["orb-stable","orb-compressing","orb-expanding","orb-charging"].includes(this.state) && anchor) {
      if(closing>effectConfig.interaction.movementDeadZone) { this.transition(this.charge>=effectConfig.interaction.chargingThreshold?"orb-charging":"orb-compressing",now); if(this.chargingStartedAt===null)this.chargingStartedAt=now; const distanceFactor=clamp(1-(anchor.smoothedDistance-effectConfig.interaction.minimumChargeDistance)/(effectConfig.interaction.chargeStartDistance-effectConfig.interaction.minimumChargeDistance)); const speedFactor=clamp(closing/effectConfig.interaction.maximumClosingSpeed); this.charge+=(clamp(distanceFactor*.65+speedFactor*.35)-this.charge)*Math.min(1,.12); this.maximumCharge=Math.max(this.maximumCharge,this.charge); }
      else if(opening>effectConfig.interaction.movementDeadZone) {
        if(this.maximumCharge>=effectConfig.interaction.minimumReleaseCharge&&opening>=effectConfig.interaction.releaseSpeedThreshold&&this.chargingStartedAt!==null&&now-this.chargingStartedAt>=effectConfig.interaction.minimumChargingDurationMs){this.releaseAnchor={...anchor.smoothedMidpoint};this.releaseStartedAt=now;this.lastEvent="ORB_RELEASED";this.transition("orb-released",now);}
        else this.transition("orb-expanding",now);
        this.charge=Math.max(0,this.charge-.035);
      } else { this.transition(this.charge>=effectConfig.interaction.chargingThreshold?"orb-charging":"orb-stable",now); this.charge=Math.max(0,this.charge-.012); }
    }
    if(this.state==="orb-forming") this.charge=Math.max(0,this.charge-.004);
    const formationProgress=this.stateEnteredAt?clamp((now-this.stateEnteredAt)/effectConfig.interaction.formationDurationMs):0;
    const releaseProgress=this.releaseStartedAt===null?0:clamp((now-this.releaseStartedAt)/effectConfig.interaction.releaseDurationMs);
    return {state:this.state,hands:validHands,twoHandAnchor:anchor,primaryGesture:validHands[0]?.stableGesture??"none",chargeLevel:this.charge,maximumCharge:this.maximumCharge,releaseReady:this.maximumCharge>=effectConfig.interaction.minimumReleaseCharge,formationProgress,releaseProgress,readiness,candidateDuration: this.candidateStartedAt===null?0:now-this.candidateStartedAt,readyDuration:this.readyStartedAt===null?0:now-this.readyStartedAt,lastEvent:this.lastEvent};
  }
  private transition(next:InteractionState,now:number){if(this.state===next)return; this.state=next; this.stateEnteredAt=now; this.lastEvent=next==="orb-forming"?"ORB_FORM_STARTED":this.lastEvent; if(next!=="two-hand-candidate")this.candidateStartedAt=null; if(next!=="two-hand-ready")this.readyStartedAt=null; if(next!=="orb-charging"&&next!=="orb-compressing")this.chargingStartedAt=null; if(next==="two-hand-candidate")this.candidateStartedAt=now; if(next==="two-hand-ready")this.readyStartedAt=now; if(next==="cooldown"||next==="idle")this.releaseAnchor=null;}
  reset(){this.state="idle";this.candidateStartedAt=null;this.readyStartedAt=null;this.stateEnteredAt=0;this.releaseStartedAt=null;this.cooldownUntil=0;this.chargingStartedAt=null;this.charge=0;this.maximumCharge=0;this.releaseAnchor=null;this.lastValidTwoHandTimestamp=0;this.lastEvent=null;}
}

export const resolveInteractionFrame=(hands:StableTrackedHand[],anchor:TwoHandEffectAnchor|null,previousState:InteractionState):InteractionFrame=>{const runtime=new InteractionRuntime();runtime.state=previousState;return runtime.update(hands,anchor,performance.now());};







