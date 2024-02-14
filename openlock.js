const rpio = require("rpio")

var motor = rpio.open(22, rpio.OUTPUT, 0)

setInterval(function() {
    console.log("Working?")
    rpio.write(22, 1)
}, 1000)