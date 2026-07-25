import { useEffect, useState } from "react";

const STEPS = [
  "Hold one open hand in view.",
  "Move your hand slowly across the frame.",
  "Pinch your thumb and index finger.",
];

interface CalibrationGuideProps {
  onComplete: () => void;
}

export const CalibrationGuide = ({ onComplete }: CalibrationGuideProps) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= STEPS.length - 1) {
          window.clearInterval(timer);
          window.setTimeout(onComplete, 700);
          return current;
        }
        return current + 1;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [onComplete]);

  return (
    <section className="calibration-guide">
      <div className="calibration-guide__orbit" aria-hidden="true">
        <span />
        <i />
      </div>
      <p className="eyebrow">ALIGNMENT SEQUENCE / {step + 1} OF 3</p>
      <h2>{STEPS[step]}</h2>
      <div className="calibration-guide__progress">
        {STEPS.map((_, index) => (
          <span className={index <= step ? "is-complete" : ""} key={index} />
        ))}
      </div>
      <button type="button" onClick={onComplete}>
        SKIP CALIBRATION
      </button>
    </section>
  );
};
