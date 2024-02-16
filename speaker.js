const Gpio = require("onoff").Gpio

const speaker = new Gpio(25, "out")

setInterval(function() {
    if (speaker.readSync() != 1) {
        speaker.writeSync(1)
    }
}, 1000)