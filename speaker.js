const Gpio = require('onoff').Gpio
const speaker = new Gpio(25, "out")

setInterval(function() {
    let speakerValue = speaker.readSync()
    if (speakerValue == 0) {
        speaker.writeSync(1)
    } else {
        speaker.writeSync(0)
    }
    console.log(speakerValue)
}, 1000)