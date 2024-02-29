//Battery HTTP port: 8421
//const raspi = require("raspi")
const pwm = require("raspi-soft-pwm")
const gpio = require("raspi-gpio")
const fs = require("fs")
const path = require("path")
const net = require("net")
const express = require('express')
const app = express()

global.motor = new pwm.SoftPWM(5)
global.beeper = new gpio.DigitalOutput(1)

console.log((new Date()).getDate())

async function logEvent(date, time, event) {
  //stupid
  let log = await JSON.parse(fs.readFileSync("./log.json").toString())
  log.date.push(date)
  log.time.push(time)
  log.event.push(event)
  fs.writeFileSync("./log.json", JSON.stringify(log))
  console.log("File Write Complete")
}

logEvent("1", "2", "3")

async function beep () {
  for (let i = 0; i < 2; i++) {
    global.beeper.write(1)
    await sleep(100)
    global.beeper.write(0)
    await sleep(100)
  }
}

function open() {
  global.motor.write(0.05)
}

function close() {
  global.motor.write(0.1)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

app.use(express.static("views"))
app.use(express.json())

app.get("^/$|/index(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "/views/index.html"))
})

app.get("/log(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "views/log/log.html"))
})

app.get("/battery", function(req, res) {
  const battery = new net.Socket()
  battery.connect(8423, "127.0.0.1", function() {
    battery.write("get battery")
  })
  battery.on("data", function(data) {
    let level = (parseFloat(data.toString().split(" ")[1])/100).toString()
    res.send(level)
    battery.destroy()
  })
})

app.post("^/$|/index(.html)?", function(req, res) {
  switch (req.body.req) {
    case "lock":
      global.motor.write(0.05)
      break
    case "unlock":
      global.motor.write(0.1)
      beep()
      break
  }
  res.send("Success")
})

app.listen(8080, function() {
  console.log("Let's go")
})