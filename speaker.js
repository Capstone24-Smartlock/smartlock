const Gpio = require('onoff').Gpio
const speaker = new Gpio(25, "out")

setInterval(function() {
    if (speaker.readSync == 0) {
        speaker.writeSync(1)
    } else {
        speaker.writeSync(0)
    }
})