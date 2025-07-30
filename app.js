import { UIManager } from './ui-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { AudioCaptureManager } from './audio-capture-manager.js';

class RealtimeDemo {
    constructor() {
        this.isConnected = false;
        this.isMuted = false;
        this.isCapturing = false;
        this.audioContext = null;
        this.processor = null;
        this.stream = null;
        this.sessionId = this.generateSessionId();
        
        // Audio playback queue
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.playbackAudioContext = null;
        this.currentAudioSource = null;

        this.audioCapture = new AudioCaptureManager({
            workletUrl: 'processor.js',
            onAudioFrame: (buffer, rate) => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'audio',
                        data: Array.from(buffer),
                    }));
                }
            }
        });

        this.ui = new UIManager();
        this.ui.onConnectClick(() => {
            this.isConnected ? this.disconnect() : this.connect();
        });
        this.ui.onMuteClick(() => {
            this.toggleMute();
        });

        this.wsManager = new WebSocketManager(this.sessionId, {
            onOpen: () => {
                this.isConnected = true;
                this.ui.updateConnectionState(true);
                this.startContinuousCapture();
            },
            onClose: () => {
                this.isConnected = false;
                this.ui.updateConnectionState(false);
            },
            onError: (err) => {
                console.error('WebSocket error:', err);
            },
            onMessage: (data) => {
                this.handleRealtimeEvent(data);
            }
        });

    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }
    
    async connect() {
        try {
            await this.wsManager.connect();
        } catch (err) {
            console.error('Failed to connect:', err);
        }
    }

    
    disconnect() {
        this.wsManager.disconnect();
        this.stopAudioPlayback();
        this.stopContinuousCapture();
    }

    
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audioCapture.setMuted(this.isMuted);
        this.ui.updateMuteState(this.isMuted, this.isCapturing);
    }
    
    
    async startContinuousCapture() {
        try {
            await this.audioCapture.start();

            // Notify backend of sample rate
            const rate = this.audioCapture.getSampleRate();
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'sample_rate', rate }));
            }

            this.isCapturing = true;
            this.ui.updateMuteState(this.isMuted, this.isCapturing);
        } catch (error) {
            console.error('Audio capture error:', error);
        }
    }
    
    stopContinuousCapture() {
        this.audioCapture.stop();
        this.isCapturing = false;
        this.ui.updateMuteState(this.isMuted, this.isCapturing);
    }
    
    handleRealtimeEvent(event) {
        // Add to raw events pane
        this.ui.addRawEvent(event);
        
        // Add to tools panel if it's a tool or handoff event
        if (event.type === 'tool_start' || event.type === 'tool_end' || event.type === 'handoff') {
            this.ui.addToolEvent(event);
        }
        
        // Handle specific event types
        switch (event.type) {
            case 'audio':
                this.playAudio(event.audio);
                break;
            case 'audio_interrupted':
                this.stopAudioPlayback();
                break;
            case 'history_updated':
                this.updateMessagesFromHistory(event.history);
                break;
        }
    }
    
    
    updateMessagesFromHistory(history) {
        console.log('updateMessagesFromHistory called with:', history);
        
        // Clear all existing messages
        this.ui.clearMessages();
        
        // Add messages from history
        if (history && Array.isArray(history)) {
            console.log('Processing history array with', history.length, 'items');
            history.forEach((item, index) => {
                console.log(`History item ${index}:`, item);
                if (item.type === 'message') {
                    const role = item.role;
                    let content = '';
                    
                    console.log(`Message item - role: ${role}, content:`, item.content);
                    
                    if (item.content && Array.isArray(item.content)) {
                        // Extract text from content array
                        item.content.forEach(contentPart => {
                            console.log('Content part:', contentPart);
                            if (contentPart.type === 'text' && contentPart.text) {
                                content += contentPart.text;
                            } else if (contentPart.type === 'input_text' && contentPart.text) {
                                content += contentPart.text;
                            } else if (contentPart.type === 'input_audio' && contentPart.transcript) {
                                content += contentPart.transcript;
                            } else if (contentPart.type === 'audio' && contentPart.transcript) {
                                content += contentPart.transcript;
                            }
                        });
                    }
                    
                    console.log(`Final content for ${role}:`, content);
                    
                    if (content.trim()) {
                        this.ui.addMessage(role, content);
                        console.log(`Added message: ${role} - ${content.trim()}`);
                    }
                } else {
                    console.log(`Skipping non-message item of type: ${item.type}`);
                }
            });
        } else {
            console.log('History is not an array or is null/undefined');
        }
        
        this.ui.scrollMessagesToBottom();
    }
    
    
    
    async playAudio(audioBase64) {
        try {
            if (!audioBase64 || audioBase64.length === 0) {
                console.warn('Received empty audio data, skipping playback');
                return;
            }
            
            // Add to queue
            this.audioQueue.push(audioBase64);
            
            // Start processing queue if not already playing
            if (!this.isPlayingAudio) {
                this.processAudioQueue();
            }
            
        } catch (error) {
            console.error('Failed to play audio:', error);
        }
    }
    
    async processAudioQueue() {
        if (this.isPlayingAudio || this.audioQueue.length === 0) {
            return;
        }
        
        this.isPlayingAudio = true;
        
        // Initialize audio context if needed
        if (!this.playbackAudioContext) {
            this.playbackAudioContext = new AudioContext({ sampleRate: 24000 });
        }
        
        while (this.audioQueue.length > 0) {
            const audioBase64 = this.audioQueue.shift();
            await this.playAudioChunk(audioBase64);
        }
        
        this.isPlayingAudio = false;
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
                
                const audioBuffer = this.playbackAudioContext.createBuffer(1, float32Array.length, 24000);
                audioBuffer.getChannelData(0).set(float32Array);
                
                const source = this.playbackAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.playbackAudioContext.destination);
                
                // Store reference to current source
                this.currentAudioSource = source;
                
                source.onended = () => {
                    this.currentAudioSource = null;
                    resolve();
                };
                source.start();
                
            } catch (error) {
                console.error('Failed to play audio chunk:', error);
                reject(error);
            }
        });
    }
    
    stopAudioPlayback() {
        console.log('Stopping audio playback due to interruption');
        
        // Stop current audio source if playing
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                this.currentAudioSource = null;
            } catch (error) {
                console.error('Error stopping audio source:', error);
            }
        }
        
        // Clear the audio queue
        this.audioQueue = [];
        
        // Reset playback state
        this.isPlayingAudio = false;
        
        console.log('Audio playback stopped and queue cleared');
    }
    
}


document.addEventListener('DOMContentLoaded', () => {
    new RealtimeDemo();
});