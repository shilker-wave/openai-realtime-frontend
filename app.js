import { UIManager } from './ui-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { AudioCaptureManager } from './audio-capture-manager.js';
import { AudioPlayerManager } from './audio-player-manager.js';

class RealtimeFrontend {
    constructor() {
        this.isConnected = false;
        this.isMuted = false;
        this.isCapturing = false;
        this.sessionId = this.generateSessionId();
        
        this.audioPlayer = new AudioPlayerManager();

        this.audioCapture = new AudioCaptureManager({
            workletUrl: 'processor.js',
            onAudioFrame: (buffer, rate) => {
                if (this.wsManager.isOpen()) {
                    this.wsManager.send({
                        type: 'audio',
                        data: Array.from(buffer),
                    });
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
        this.audioPlayer.stop();
        this.stopContinuousCapture();
    }

    
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audioCapture.setMuted(this.isMuted)
        this.ui.updateMuteState(this.isMuted, this.isCapturing);
    }
    
    
    async startContinuousCapture() {
        try {
            await this.audioCapture.start();

            // Notify backend of sample rate
            const rate = this.audioCapture.getSampleRate();
            if (this.wsManager.isOpen()) {
                this.wsManager.send({ type: 'sample_rate', rate });
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
                this.audioPlayer.play(event.audio);
                break;
            case 'audio_interrupted':
                this.audioPlayer.stop();
                break;
            case 'history_updated':
                this.updateMessagesFromHistory(event.history);
                break;
        }
    }
    
    
    updateMessagesFromHistory(history) {
        console.log('updateMessagesFromHistory called with:', history);
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
    
}


document.addEventListener('DOMContentLoaded', () => {
    new RealtimeFrontend();
});