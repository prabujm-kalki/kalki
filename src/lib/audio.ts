// Active playing audio instance for stop/override control
let currentPlayingAudio: HTMLAudioElement | null = null;

export function stopNotificationTone() {
  if (currentPlayingAudio) {
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch (e) {
      // Ignore
    }
    currentPlayingAudio = null;
  }
}

/**
 * Maps tone type or priority level to its studio sound asset URL.
 */
export function getSoundUrlForTone(toneType: string): string {
  const normalized = String(toneType || "").toLowerCase().trim();

  if (normalized.includes("5") || normalized === "urgent") {
    return "/sounds/urgent_siren.wav";
  }
  if (normalized.includes("4")) {
    return "/sounds/alarm_horn.wav";
  }
  if (normalized.includes("3") || normalized === "chime") {
    return "/sounds/soft_chime.wav";
  }
  if (normalized.includes("2") || normalized === "alert") {
    return "/sounds/double_beep.wav";
  }
  // Level 1 or default
  return "/sounds/bell_classic.wav";
}

/**
 * Plays the full high-fidelity studio alarm audio file (15-second alarm loop).
 * Falls back to WebAudio oscillator only if HTMLAudioElement fails.
 */
export function playNotificationTone(toneType: string, customSoundUrl?: string | null) {
  try {
    stopNotificationTone();

    const soundUrl = customSoundUrl || getSoundUrlForTone(toneType);
    const audio = new Audio(soundUrl);
    currentPlayingAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("[Audio] HTMLAudio autoplay blocked or failed, falling back to WebAudio:", err);
        fallbackWebAudio(toneType);
      });
    }
  } catch (err) {
    console.warn("[Audio] Failed to instantiate HTML Audio, falling back:", err);
    fallbackWebAudio(toneType);
  }
}

function fallbackWebAudio(toneType: string) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    const normalized = String(toneType || "").toLowerCase();

    if (normalized.includes("5") || normalized.includes("urgent")) {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.3);
      osc.frequency.linearRampToValueAtTime(400, now + 0.6);
      osc.frequency.linearRampToValueAtTime(800, now + 0.9);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (normalized.includes("4") || normalized.includes("2") || normalized.includes("alert")) {
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.setValueAtTime(0, now + 0.15);
      gainNode.gain.setValueAtTime(0.3, now + 0.3);
      gainNode.gain.setValueAtTime(0, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch (err) {
    console.error("[Audio] WebAudio fallback failed:", err);
  }
}
