const Gpio = require("pigpio").Gpio

const speaker = new Gpio(25, {mode: Gpio.OUTPUT})

console.log("Frequency: " + speaker.getPwmFrequency())
console.log("Range: " + speaker.getPwmRange())

speaker.pwmWrite(0)