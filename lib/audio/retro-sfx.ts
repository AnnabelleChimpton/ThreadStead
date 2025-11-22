// lib/audio/retro-sfx.ts

/**
 * Retro Sound Effects Generator
 * Uses Web Audio API to create procedural chiptune sounds
 */

class RetroSFX {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    constructor() {
        // Initialize lazily on first interaction to comply with browser autoplay policies
    }

    private init() {
        if (typeof window === 'undefined') return;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.3; // Default volume
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setVolume(volume: number) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (!this.enabled || !this.audioContext || !this.masterGain) {
            this.init();
            if (!this.enabled || !this.audioContext || !this.masterGain) return;
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + startTime);

        // Envelope to avoid clicking
        gain.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioContext.currentTime + startTime);
        osc.stop(this.audioContext.currentTime + startTime + duration);
    }

    public playMessageIn() {
        // High-pitched "Ding!" (Coin-like)
        this.playTone(1200, 'square', 0.1);
        this.playTone(1800, 'square', 0.2, 0.05);
    }

    public playMessageOut() {
        // Low "Blip"
        this.playTone(440, 'triangle', 0.1);
    }

    public playJoin() {
        // Rising Arpeggio
        this.playTone(523.25, 'sine', 0.1, 0);    // C5
        this.playTone(659.25, 'sine', 0.1, 0.05); // E5
        this.playTone(783.99, 'sine', 0.2, 0.1);  // G5
    }

    public playLeave() {
        // Falling Arpeggio
        this.playTone(783.99, 'sine', 0.1, 0);    // G5
        this.playTone(659.25, 'sine', 0.1, 0.05); // E5
        this.playTone(523.25, 'sine', 0.2, 0.1);  // C5
    }

    public playError() {
        // Buzz
        this.playTone(150, 'sawtooth', 0.2);
    }
}

// Singleton instance
export const retroSFX = new RetroSFX();
