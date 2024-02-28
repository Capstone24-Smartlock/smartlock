const raspi = require("raspi")
const pwm = require("raspi-soft-pwm")

class gpio {
    static motor = new pwm.SoftPWM(5)

    static open() {
        gpio.motor.write(0.05)
    }

    static close() {
        gpio.motor.write(0.1)
    }
}

module.exports = {gpio}