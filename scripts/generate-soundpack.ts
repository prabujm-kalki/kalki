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

const sounds: Record<string, { duration: number; gen: (t: number) => number }> = {
  // 1. Classic Desk Bell (crystal clear resonant ding)
  bell_classic: {
    duration: 1.2,
    gen: (t) => {
      const e = Math.exp(-t * 4.5);
      return (
        e *
        (0.6 * Math.sin(2 * Math.PI * 1760 * t) +
          0.3 * Math.sin(2 * Math.PI * 3520 * t) +
          0.1 * Math.sin(2 * Math.PI * 5280 * t))
      );
    },
  },

  // 2. Soft Chime (gentle ascending arpeggio)
  soft_chime: {
    duration: 1.4,
    gen: (t) => {
      let s = 0;
      if (t >= 0) s += Math.exp(-(t - 0) * 5) * 0.4 * Math.sin(2 * Math.PI * 659.25 * t); // E5
      if (t >= 0.15) s += Math.exp(-(t - 0.15) * 5) * 0.4 * Math.sin(2 * Math.PI * 880.0 * (t - 0.15)); // A5
      if (t >= 0.3) s += Math.exp(-(t - 0.3) * 4) * 0.5 * Math.sin(2 * Math.PI * 1318.51 * (t - 0.3)); // E6
      return s;
    },
  },

  // 3. Ding Dong (warm two-tone welcome chime)
  ding_dong: {
    duration: 1.6,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.5) s += Math.exp(-t * 4) * 0.6 * Math.sin(2 * Math.PI * 784 * t); // G5
      if (t >= 0.45) s += Math.exp(-(t - 0.45) * 3) * 0.6 * Math.sin(2 * Math.PI * 659.25 * (t - 0.45)); // E5
      return s;
    },
  },

  // 4. Marimba (warm organic percussive strike)
  marimba: {
    duration: 1.2,
    gen: (t) => {
      let s = 0;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((f, idx) => {
        const offset = idx * 0.1;
        if (t >= offset) {
          const dt = t - offset;
          const e = Math.exp(-dt * 9);
          s += e * 0.3 * Math.sin(2 * Math.PI * f * dt);
        }
      });
      return s;
    },
  },

  // 5. Digital Blip (clean crisp POS confirmation tone)
  digital_blip: {
    duration: 0.5,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.12) s += Math.sin(2 * Math.PI * 1500 * t) * 0.5;
      if (t >= 0.12 && t < 0.28) s += Math.sin(2 * Math.PI * 2200 * t) * 0.6;
      return s * Math.exp(-t * 4);
    },
  },

  // 6. Double Beep (distinct electronic task beep)
  double_beep: {
    duration: 0.6,
    gen: (t) => {
      let s = 0;
      if (t >= 0 && t < 0.12) s += Math.sin(2 * Math.PI * 1200 * t) * 0.5;
      if (t >= 0.18 && t < 0.3) s += Math.sin(2 * Math.PI * 1400 * t) * 0.5;
      return s;
    },
  },

  // 7. Cash Register (metallic cheerful checkout bell)
  cash_register: {
    duration: 1.1,
    gen: (t) => {
      let s = 0;
      // Mechanical ratchet snap
      if (t < 0.08) s += (Math.random() * 2 - 1) * 0.4 * Math.exp(-t * 20);
      // High bright metallic bell
      if (t >= 0.06) {
        const dt = t - 0.06;
        s += Math.exp(-dt * 5) * (0.5 * Math.sin(2 * Math.PI * 2637 * dt) + 0.3 * Math.sin(2 * Math.PI * 4186 * dt));
      }
      return s;
    },
  },

  // 8. Radar Pulse (subtle sonic sonar pulse)
  radar_pulse: {
    duration: 0.9,
    gen: (t) => {
      const f = 900 + 400 * Math.sin(2 * Math.PI * 4 * t);
      const e = Math.sin(Math.PI * (t / 0.9));
      return Math.sin(2 * Math.PI * f * t) * e * 0.5;
    },
  },

  // 9. Alert Horn (authoritative klaxon for high priority)
  alarm_horn: {
    duration: 1.3,
    gen: (t) => {
      let s = 0;
      // 2 bursts
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

  // 10. Urgent Siren (critical rising-falling warning siren)
  urgent_siren: {
    duration: 1.8,
    gen: (t) => {
      const sweep = 700 + 600 * Math.sin(2 * Math.PI * 2 * t);
      const saw = 2 * ((sweep * t) % 1) - 1; // sawtooth
      return saw * 0.35 * (t < 1.6 ? 1 : Math.exp(-(t - 1.6) * 15));
    },
  },

  // 11. Emergency Pulsar (rapid pulsing emergency dispatch alarm)
  emergency_pulsar: {
    duration: 1.6,
    gen: (t) => {
      const pulse = Math.sin(2 * Math.PI * 8 * t) > 0 ? 1 : 0;
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
  const wavBuffer = createWav(sampleRate, sound.duration, sound.gen);

  // Write to web public directory: public/sounds/<name>.wav
  const webPath = path.join(webSoundsDir, `${name}.wav`);
  fs.writeFileSync(webPath, wavBuffer);

  // Write to Android raw resources: res/raw/<name>.wav
  const androidPath = path.join(androidRawDir, `${name}.wav`);
  fs.writeFileSync(androidPath, wavBuffer);

  console.log(`Generated: ${name}.wav (${wavBuffer.length} bytes)`);
}

console.log("Successfully generated all 11 soundpack files!");
process.exit(0);
