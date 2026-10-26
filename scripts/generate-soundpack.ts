import fs from "fs";
import path from "path";

// Function to generate a clean mono 16-bit PCM WAV buffer
function createWav(sampleRate: number, durationSec: number, generateSample: (t: number) => number): Buffer {
  const numSamples = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2; // 16-bit
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = generateSample(t);
    // Clamp to [-1, 1]
    sample = Math.max(-1, Math.min(1, sample));
    // Scale to 16-bit integer
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// Envelope helper: attack and decay
function env(t: number, attack: number, decay: number): number {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) * decay);
}

// Target alert duration: 15 seconds
const TARGET_ALERT_DURATION = 15.0;

const sounds: Record<string, { interval: number; gen: (t: number) => number }> = {
  // 1. Classic Desk Bell (crystal clear resonant ding repeating every 2.5 seconds)
  bell_classic: {
    interval: 2.5,
    gen: (t) => {
      const e = Math.exp(-t * 3.5);
      return (
        e *
        (0.6 * Math.sin(2 * Math.PI * 1760 * t) +
          0.3 * Math.sin(2 * Math.PI * 3520 * t) +
          0.1 * Math.sin(2 * Math.PI * 5280 * t))
      );
    },
  },

  // 2. Soft Chime (gentle ascending arpeggio repeating every 2.8 seconds)
  soft_chime: {
    interval: 2.8,
    gen: (t) => {
      let s = 0;
      if (t >= 0) s += Math.exp(-(t - 0) * 4) * 0.4 * Math.sin(2 * Math.PI * 659.25 * t); // E5
      if (t >= 0.18) s += Math.exp(-(t - 0.18) * 4) * 0.4 * Math.sin(2 * Math.PI * 880.0 * (t - 0.18)); // A5
      if (t >= 0.36) s += Math.exp(-(t - 0.36) * 3) * 0.5 * Math.sin(2 * Math.PI * 1318.51 * (t - 0.36)); // E6
      return s;
    },
  },

  // 3. Ding Dong (warm two-tone welcome chime repeating every 2.5 seconds)
  ding_dong: {
    interval: 2.5,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.6) s += Math.exp(-t * 3) * 0.6 * Math.sin(2 * Math.PI * 784 * t); // G5
      if (t >= 0.45) s += Math.exp(-(t - 0.45) * 2.5) * 0.6 * Math.sin(2 * Math.PI * 659.25 * (t - 0.45)); // E5
      return s;
    },
  },

  // 4. Marimba (warm organic percussive strike repeating every 2.2 seconds)
  marimba: {
    interval: 2.2,
    gen: (t) => {
      let s = 0;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((f, idx) => {
        const offset = idx * 0.12;
        if (t >= offset) {
          const dt = t - offset;
          const e = Math.exp(-dt * 7);
          s += e * 0.3 * Math.sin(2 * Math.PI * f * dt);
        }
      });
      return s;
    },
  },

  // 5. Digital Blip (clean crisp POS confirmation tone repeating every 1.8 seconds)
  digital_blip: {
    interval: 1.8,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.15) s += Math.sin(2 * Math.PI * 1500 * t) * 0.5;
      if (t >= 0.15 && t < 0.32) s += Math.sin(2 * Math.PI * 2200 * t) * 0.6;
      return s * Math.exp(-t * 3.5);
    },
  },

  // 6. Double Beep (distinct electronic task beep repeating every 2.0 seconds)
  double_beep: {
    interval: 2.0,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.14) s += Math.sin(2 * Math.PI * 1200 * t) * 0.5;
      if (t >= 0.22 && t < 0.36) s += Math.sin(2 * Math.PI * 1400 * t) * 0.5;
      return s;
    },
  },

  // 7. Cash Register (metallic cheerful checkout bell repeating every 2.5 seconds)
  cash_register: {
    interval: 2.5,
    gen: (t) => {
      let s = 0;
      if (t < 0.1) s += (Math.random() * 2 - 1) * 0.4 * Math.exp(-t * 18);
      if (t >= 0.08) {
        const dt = t - 0.08;
        s += Math.exp(-dt * 4) * (0.5 * Math.sin(2 * Math.PI * 2637 * dt) + 0.3 * Math.sin(2 * Math.PI * 4186 * dt));
      }
      return s;
    },
  },

  // 8. Radar Pulse (subtle sonic sonar pulse repeating every 2.2 seconds)
  radar_pulse: {
    interval: 2.2,
    gen: (t) => {
      if (t > 1.2) return 0;
      const f = 900 + 400 * Math.sin(2 * Math.PI * 4 * t);
      const e = Math.sin(Math.PI * (t / 1.2));
      return Math.sin(2 * Math.PI * f * t) * e * 0.5;
    },
  },

  // 9. Alert Horn (authoritative klaxon for high priority repeating every 2.2 seconds)
  alarm_horn: {
    interval: 2.2,
    gen: (t) => {
      let s = 0;
      const burst1 = t >= 0 && t < 0.45;
      const burst2 = t >= 0.55 && t < 1.0;
      if (burst1 || burst2) {
        const osc1 = Math.sin(2 * Math.PI * 620 * t);
        const osc2 = Math.sin(2 * Math.PI * 740 * t);
        s = (osc1 + osc2) * 0.35;
      }
      return s;
    },
  },

  // 10. Urgent Siren (critical rising-falling warning siren continuous pattern)
  urgent_siren: {
    interval: 2.0,
    gen: (t) => {
      const sweep = 700 + 600 * Math.sin(2 * Math.PI * 1.0 * t);
      const saw = 2 * ((sweep * t) % 1) - 1; // sawtooth
      return saw * 0.35;
    },
  },

  // 11. Emergency Pulsar (rapid pulsing emergency dispatch alarm repeating cadence)
  emergency_pulsar: {
    interval: 1.5,
    gen: (t) => {
      if (t > 1.0) return 0;
      const pulse = Math.sin(2 * Math.PI * 6 * t) > 0 ? 1 : 0;
      const tone = Math.sin(2 * Math.PI * 1800 * t);
      return pulse * tone * 0.45;
    },
  },
};

const webSoundsDir = path.join(process.cwd(), "public", "sounds");
const androidRawDir = path.join(process.cwd(), "android", "app", "src", "main", "res", "raw");

fs.mkdirSync(webSoundsDir, { recursive: true });
fs.mkdirSync(androidRawDir, { recursive: true });

for (const [name, sound] of Object.entries(sounds)) {
  // Loop generator function across full 15 seconds
  const loopingGenerator = (totalT: number) => {
    const cycleT = totalT % sound.interval;
    // Fade out smoothly in the last 0.5s of the 15-second duration
    const fadeOut = totalT > TARGET_ALERT_DURATION - 0.5 ? Math.max(0, (TARGET_ALERT_DURATION - totalT) / 0.5) : 1;
    return sound.gen(cycleT) * fadeOut;
  };

  const wavBuffer = createWav(sampleRate, TARGET_ALERT_DURATION, loopingGenerator);

  // Write to web public directory: public/sounds/<name>.wav
  const webPath = path.join(webSoundsDir, `${name}.wav`);
  fs.writeFileSync(webPath, wavBuffer);

  // Write to Android raw resources: res/raw/<name>.wav
  const androidPath = path.join(androidRawDir, `${name}.wav`);
  fs.writeFileSync(androidPath, wavBuffer);

  console.log(`Generated 15s track: ${name}.wav (${wavBuffer.length} bytes)`);
}

console.log("Successfully generated all 11 extended 15-second soundpack files!");
process.exit(0);
