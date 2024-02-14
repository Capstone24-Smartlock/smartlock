const rpio = require("rpio")

var motor = rpio.open(25, rpio.OUTPUT, rpio.LOW)

var on = true

setInterval(function() {
    if (on) {
        rpio.write(25, rpio.HIGH)
    } else {
        rpio.write(25, rpio.LOW)
    }
    on = !on
    console.log("Run")
}, 1000)