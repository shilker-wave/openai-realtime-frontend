export class AudioCaptureManager {
  constructor({ workletUrl = "processor.js", onAudioFrame }) {
    this.audioContext = null;
    this.processor = null;
    this.stream = null;
    this.isCapturing = false;
    this.isMuted = false;
    this.onAudioFrame = onAudioFrame; // callback for sending audio data
    this.workletUrl = workletUrl;
  }

  async start() {
    if (this.isCapturing) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "getUserMedia not available. Please use HTTPS or localhost."
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);

      await this.audioContext.audioWorklet.addModule(this.workletUrl);
      this.processor = new AudioWorkletNode(
        this.audioContext,
        "audio-processor"
      );
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      const sampleRate = this.audioContext.sampleRate;

      this.processor.port.onmessage = (event) => {
        if (this.isMuted || !this.onAudioFrame) return;

        const inputBuffer = event.data;
        const int16Buffer = new Int16Array(inputBuffer.length);

        for (let i = 0; i < inputBuffer.length; i++) {
          int16Buffer[i] = Math.max(
            -32768,
            Math.min(32767, inputBuffer[i] * 32768)
          );
        }

        this.onAudioFrame(int16Buffer, sampleRate);
      };

      this.isCapturing = true;
    } catch (err) {
      console.error("Failed to start audio capture:", err);
      throw err;
    }
  }

  stop() {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  setMuted(state) {
    this.isMuted = state;
  }

  getCapturingState() {
    return this.isCapturing;
  }

  getMutedState() {
    return this.isMuted;
  }

  getSampleRate() {
    return this.audioContext?.sampleRate ?? null;
  }
}
