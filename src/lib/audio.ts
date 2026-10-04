export function playNotificationTone(toneType: string) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (toneType === "urgent") {
      // Siren
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.3);
      osc.frequency.linearRampToValueAtTime(400, now + 0.6);
      osc.frequency.linearRampToValueAtTime(800, now + 0.9);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (toneType === "alert") {
      // Double beep
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.setValueAtTime(0, now + 0.15);
      gainNode.gain.setValueAtTime(0.3, now + 0.3);
      gainNode.gain.setValueAtTime(0, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (toneType === "chime") {
      // Friendly chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.setValueAtTime(0.5, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Default single ping
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now); // A4
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.error("Audio playback failed", err);
  }
}
