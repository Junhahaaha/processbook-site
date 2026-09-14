// Semi-implicit Euler spring-damper step, used for anything that should
// settle with momentum/inertia instead of snapping (turntable rotation,
// per-book tilt lean). Lower damping relative to stiffness -> more overshoot/
// wobble before rest; higher damping -> smoother, non-oscillating settle.
export function springStep(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number
): { value: number; velocity: number } {
  const accel = (target - value) * stiffness - velocity * damping;
  const nextVelocity = velocity + accel * dt;
  const nextValue = value + nextVelocity * dt;
  return { value: nextValue, velocity: nextVelocity };
}
