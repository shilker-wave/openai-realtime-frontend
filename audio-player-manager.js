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
                console.warn('Received empty audio data, skipping playback');
                return;
            }
            
            // Add to queue
            this.audioQueue.push(audioBase64);
            
            // Start processing queue if not already playing
            if (!this.isPlaying) {
                this.processQueue();
            }
            
        } catch (error) {
            console.error('Failed to play audio:', error);
        }
    }
    
    async processQueue() {
        if (this.isPlaying || this.audioQueue.length === 0) {
            return;
        }
        
        this.isPlaying = true;
        
        // Initialize audio context if needed
        if (!this.audioContext) {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
        }

         // Initialize nextPlaybackTime
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
                // Decode base64 to ArrayBuffer
                const binaryString = atob(audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const int16Array = new Int16Array(bytes.buffer);
                
                if (int16Array.length === 0) {
                    console.warn('Audio chunk has no samples, skipping');
                    resolve();
                    return;
                }
                
                const float32Array = new Float32Array(int16Array.length);
                
                // Convert int16 to float32
                for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0;
                }
                
                const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
                audioBuffer.getChannelData(0).set(float32Array);
                
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                this.currentSource = source;
                
                source.start(this.nextPlaybackTime);
                this.nextPlaybackTime += audioBuffer.duration;
                
                source.onended = () => {
                    this.currentSource = null;
                    resolve();
                };
                
                
            } catch (error) {
                console.error('Failed to play audio chunk:', error);
                reject(error);
            }
        });
    }
    
    stop() {
        console.log('Stopping audio playback due to interruption');
        
        // Stop current audio source if playing
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource = null;
            } catch (error) {
                console.error('Error stopping audio source:', error);
            }
        }
        
        // Clear the audio queue
        this.audioQueue = [];
        this.nextPlaybackTime = null
        
        // Reset playback state
        this.isPlaying = false;
        
        console.log('Audio playback stopped and queue cleared');
    }
}