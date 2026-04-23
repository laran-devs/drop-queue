import MusicTempo from "music-tempo";

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
}


/**
 * Key detection based on Pitch Class Profiles (PCP)
 * Analyzes the frequency content to determine the musical key.
 */
async function detectKey(buffer: AudioBuffer): Promise<string> {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  
  // 1. Setup FFT using OfflineAudioContext for analysis
  const offlineCtx = new OfflineAudioContext(1, buffer.length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Float32Array(bufferLength);

  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  // We process a few segments of the song to get a better overall profile
  const segments = 10;
  const segmentLength = Math.floor(buffer.length / segments);
  const pcp = new Array(12).fill(0);

  for (let i = 0; i < segments; i++) {
    const time = (i * segmentLength) / sampleRate;
    // Note: OfflineAudioContext doesn't support getByteFrequencyData in real-time easily without suspend/resume
    // but we can slice the buffer and do a manual calculation or just sample specific parts.
    
    // Simpler approach for this environment: 
    // Use the raw PCM data and a simplified DFT for the frequencies corresponding to the 12 semitones.
    const start = i * segmentLength;
    const end = start + analyser.fftSize;
    if (end > data.length) break;

    const segment = data.slice(start, end);
    const segmentPCP = calculatePCP(segment, sampleRate);
    for (let j = 0; j < 12; j++) pcp[j] += segmentPCP[j];
  }

  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  // Prof. Krumhansl - Schmuckler Key Profiles (Simplified)
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestKey = "";
  let maxCorrelation = -Infinity;
  let isMinor = false;

  for (let shift = 0; shift < 12; shift++) {
    const shiftedPCP = [...pcp.slice(shift), ...pcp.slice(0, shift)];
    
    const majorCorr = correlate(shiftedPCP, majorProfile);
    if (majorCorr > maxCorrelation) {
      maxCorrelation = majorCorr;
      bestKey = keys[shift];
      isMinor = false;
    }

    const minorCorr = correlate(shiftedPCP, minorProfile);
    if (minorCorr > maxCorrelation) {
      maxCorrelation = minorCorr;
      bestKey = keys[shift];
      isMinor = true;
    }
  }

  return bestKey + (isMinor ? "m" : "");
}

function calculatePCP(pcmData: Float32Array, sampleRate: number): number[] {
  const pcp = new Array(12).fill(0);
  const fftSize = pcmData.length;
  
  // Note: For real FFT we'd need a library. 
  // We'll use a simplified Goertzel-like approach for the frequencies of the 12 semitones across several octaves.
  const baseFreq = 440; // A4
  for (let note = 0; note < 12; note++) {
    // Check multiple octaves
    for (let octave = -2; octave <= 2; octave++) {
      const freq = baseFreq * Math.pow(2, (note - 9) / 12 + octave);
      pcp[note] += getMagnitudeAtFreq(pcmData, freq, sampleRate);
    }
  }
  return pcp;
}

function getMagnitudeAtFreq(pcmData: Float32Array, targetFreq: number, sampleRate: number): number {
  let real = 0;
  let imag = 0;
  const n = pcmData.length;
  const angle = (2 * Math.PI * targetFreq) / sampleRate;
  
  for (let i = 0; i < n; i++) {
    real += pcmData[i] * Math.cos(angle * i);
    imag -= pcmData[i] * Math.sin(angle * i);
  }
  return Math.sqrt(real * real + imag * imag);
}

function correlate(a: number[], b: number[]): number {
  const avgA = a.reduce((sum, v) => sum + v, 0) / a.length;
  const avgB = b.reduce((sum, v) => sum + v, 0) / b.length;
  
  let num = 0;
  let denA = 0;
  let denB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const diffA = a[i] - avgA;
    const diffB = b[i] - avgB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }
  
  return num / Math.sqrt(denA * denB);
}

export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();

      try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // 1. BPM Detection using music-tempo
        const bpm = detectBPM(audioBuffer);
        
        // 2. Key Detection using real analysis
        const key = await detectKey(audioBuffer);

        resolve({ bpm, key });
      } catch (err) {
        reject(err);
      } finally {
        audioCtx.close();
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function detectBPM(buffer: AudioBuffer): number {
  let data = buffer.getChannelData(0);
  const mt = new MusicTempo(data);
  return Math.round(mt.tempo);
}
