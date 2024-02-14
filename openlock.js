const rpio = require("rpio")

var motor = rpio.open(22, rpio.OUTPUT, rpio.LOW)

setInterval(function() {
    console.log("Working?")
    rpio.write(22, rpio.HIGH)
}, 1000)