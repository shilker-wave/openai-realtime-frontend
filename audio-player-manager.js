export class AudioPlayerManager {
  constructor() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.audioContext = null;
    this.currentSource = null;
    this.nextPlaybackTime = null;
  }

  async play(audioBase64) {
    try {
      if (!audioBase64 || audioBase64.length === 0) {
        console.warn("Received empty audio data, skipping playback");
        return;
      }

      this.audioQueue.push(audioBase64);

      if (!this.isPlaying) {
        this.processQueue();
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  }

  async processQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    this.isPlaying = true;

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    if (!this.nextPlaybackTime) {
      this.nextPlaybackTime = this.audioContext.currentTime;
    }

    while (this.audioQueue.length > 0) {
      const audioBase64 = this.audioQueue.shift();
      await this.playAudioChunk(audioBase64);
    }

    this.isPlaying = false;
  }

  async playAudioChunk(audioBase64) {
    return new Promise((resolve, reject) => {
      try {
        const floatData = this.decodeBase64ToFloat32(audioBase64);

        if (floatData.length === 0) {
          console.warn("Audio chunk has no samples, skipping");
          return resolve();
        }

        const buffer = this.audioContext.createBuffer(
          1,
          floatData.length,
          24000
        );
        buffer.getChannelData(0).set(floatData);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        source.start(this.nextPlaybackTime);
        this.nextPlaybackTime += buffer.duration;

        this.currentSource = source;
        source.onended = () => {
          this.currentSource = null;
          resolve();
        };
      } catch (error) {
        console.error("Failed to play audio chunk:", error);
        reject(error);
      }
    });
  }

  decodeBase64ToFloat32(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    return float32;
  }

  stop() {
    console.log("Stopping audio playback due to interruption");

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        console.error("Error stopping audio source:", error);
      }
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.nextPlaybackTime = null;
    this.isPlaying = false;

    console.log("Audio playback stopped and queue cleared");
  }
}
