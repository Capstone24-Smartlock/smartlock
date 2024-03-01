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

async function logEvent(date, time, event) {
  let log = fs.readFileSync("./log.json").toString()
  log = await JSON.parse(log)
  log.date.push(date)
  log.time.push(time)
  log.event.push(event)
  fs.writeFileSync("./log.json", JSON.stringify(log))
}

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
  res.sendFile(path.join(__dirname, "/views/log/log.html"))
})

async function getBattery(req) {
  const battery = new net.Socket()
  await new Promise(function(resolve, reject) {
    battery.connect(8423, "127.0.0.1", function() {
      battery.write(req)
      resolve()
    })
  })
  return await new Promise(function(resolve, reject) {
    battery.on("data", function(data) {
      resolve(data)
      battery.destroy()
    })
  }).then(function(data) {
    return data.toString()
  })
}

(async function() {
  console.log(await getBattery("get battery"))
})()

async function battery() {
  let data = {}
  const batteryLevel = new net.Socket()
  battery.connect(8423, "127.0.0.1", function() {
    battery.write("get battery")
  })

}

app.get("/battery", async function(req, res) {
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

app.get("/events(.html)?", function(req, res) {
  res.send(fs.readFileSync("./log.json").toString())
})

app.post("^/$|/index(.html)?", function(req, res) {
  let data = req.body
  switch (data.req) {
    case "lock":
      global.motor.write(0.05)
      logEvent(data.date, data.time, data.event)
      break
    case "unlock":
      global.motor.write(0.1)
      logEvent(data.date, data.time, data.event)
      beep()
      break
  }
  res.send("Success")
})

app.listen(8080, function() {
  console.log("Let's go")
})