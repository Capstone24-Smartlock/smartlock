const rpio = require("rpio")

var motor = rpio.open(22, rpio.OUTPUT, rpio.LOW)

rpio.write(22, rpio.HIGH)

setInterval(function() {}, 1000)