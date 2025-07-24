// Testklasse, damit es auch in Firefox funktioniert. Hat aber andere Probleme gemacht.
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      // Post Float32Array to main thread
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);