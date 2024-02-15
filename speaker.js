const Gpio = require("onoff").Gpio

const speaker = new Gpio(25, "out")

speaker.writeSync(1)

while (true) {}