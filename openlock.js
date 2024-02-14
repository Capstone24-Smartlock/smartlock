const rpio = require("rpio")

var motor = rpio.open(22, rpio.OUTPUT, rpio.LOW)

var on = true

setInterval(function() {
    if (on) {
        rpio.write(22, rpio.HIGH)
    } else {
        rpio.write(22, rpio.LOW)
    }
    on = !on
    console.log("Run")
}, 1000)