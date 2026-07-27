import type { EffectInstance } from "./effect.types";
import type { VisualEffectEvent } from "./effectEvents";

export class EffectManager {
  private instances: EffectInstance[] = [];
  private lastEventByType = new Map<string, number>();

  emit(event: VisualEffectEvent, now = performance.now()) {
    const key = `${event.type}:${"handId" in event ? event.handId : "global"}`;
    const lastAt = this.lastEventByType.get(key) ?? 0;
    if (now - lastAt < 80) return;
    this.lastEventByType.set(key, now);
  }

  update(now = performance.now()) {
    this.instances = this.instances.filter((instance) => {
      instance.progress = Math.min((now - instance.startTime) / instance.duration, 1);
      instance.completed = instance.progress >= 1;
      return !instance.completed;
    });
  }

  getActiveInstances() {
    return this.instances;
  }
}
