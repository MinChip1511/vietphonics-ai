// Web Audio API Audio Resampler for VietPhonics AI
// Converts any browser recorded audio (WebM, MP4, OGG) to 16kHz, 16-bit Mono PCM WAV

/**
 * Resamples an audio Blob to 16kHz, 1-channel (mono), 16-bit PCM WAV Blob.
 * @param {Blob} inputBlob - Raw audio blob from MediaRecorder
 * @returns {Promise<Blob>} - 16kHz Mono WAV Blob
 */
export async function convertBlobTo16kHzMonoWav(inputBlob) {
  if (!inputBlob || inputBlob.size === 0) {
    return inputBlob;
  }

  // If AudioContext or Web Audio API is not available, fallback to raw blob
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return inputBlob;
  }

  try {
    const arrayBuffer = await inputBlob.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return inputBlob;
    }

    // Decode audio into an AudioBuffer using a temporary AudioContext
    const tempCtx = new AudioContextClass();
    let decodedBuffer;
    try {
      decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    } finally {
      if (tempCtx.state !== "closed") {
        await tempCtx.close();
      }
    }

    const TARGET_SAMPLE_RATE = 16000;
    const targetLength = Math.max(1, Math.round(decodedBuffer.duration * TARGET_SAMPLE_RATE));

    // OfflineAudioContext for fast, hardware-accelerated non-realtime resampling
    const OfflineAudioCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineAudioCtxClass(1, targetLength, TARGET_SAMPLE_RATE);

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampledBuffer = await offlineCtx.startRendering();
    const monoSamples = resampledBuffer.getChannelData(0);

    // Encode Float32 PCM [-1.0, 1.0] to 16-bit Linear PCM WAV
    const wavBlob = encodeFloat32ToWav(monoSamples, TARGET_SAMPLE_RATE);
    return wavBlob;
  } catch (err) {
    console.warn("Lỗi chuẩn hóa Web Audio Resampler, dùng raw blob dự phòng:", err);
    return inputBlob;
  }
}

/**
 * Encodes Float32Array PCM samples into standard 16-bit WAV binary format.
 * @param {Float32Array} samples - Single-channel PCM audio samples
 * @param {number} sampleRate - Target sample rate (e.g. 16000)
 * @returns {Blob} - audio/wav Blob
 */
function encodeFloat32ToWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // 1. "RIFF" chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true); // ChunkSize
  writeString(view, 8, "WAVE");

  // 2. "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (16000)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // 3. "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true); // Subchunk2Size

  // Write 16-bit PCM integer samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert to 16-bit signed integer [-32768, 32767]
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
