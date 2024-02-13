const Gpio = require("onoff").Gpio

var motor = new Gpio(25, "output")

motor.writeSync(1)