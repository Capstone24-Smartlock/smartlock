//Battery HTTP port: 8421
//const raspi = require("raspi")
const pwm = require("raspi-soft-pwm")
const gpio = require("raspi-gpio")
const fs = require("fs")
const path = require("path")
const net = require("net")
const express = require('express')
const ws = require("express-ws")
const app = express()

global.motor = new pwm.SoftPWM(5)
global.beeper = new gpio.DigitalOutput(1)
global.button = new gpio.DigitalInput({
  pin: 26,
  pullResistor: gpio.PULL_UP,
})

// button.on("change", function(val) {
//   if (val == 0) {
//     close()
//   }
// })

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
  global.motor.write(0.03)
}

function close() {
  global.motor.write(0.07)
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

async function batteryProperties(req) {
  const battery = new net.Socket()
  battery.connect(8423, "127.0.0.1", function() {
    battery.write(req)
  })
  return await new Promise(function(resolve, reject) {
    battery.on("data", function(data) {
      resolve(data.toString())
    })
  }).then(function(data) {
    return data.split(" ")[1]
  })
}

async function batteryData() {
  return {
    level: parseFloat(await batteryProperties("get battery"))/100,
    isCharging: (await batteryProperties("get battery_power_plugged"))[0] == "t",
  }
}

app.get("/battery", async function(req, res) {
  res.send(JSON.stringify(await batteryData()))
})

app.ws('/lock', function(ws, req) {
  button.on("change", function(val) {
    if (val == 0) {
      close()
      ws.send(true)
    }
  });
});

app.get("/events(.html)?", function(req, res) {
  res.send(fs.readFileSync("./log.json").toString())
})

app.post("^/$|/index(.html)?", function(req, res) {
  let data = req.body
  switch (data.req) {
    case "lock":
      close()
      logEvent(data.date, data.time, data.event)
      break
    case "unlock":
      open()
      logEvent(data.date, data.time, data.event)
      beep()
      break
    case "test":
      global.motor.write(data.value)
      break
  }
  res.send("Success")
})

app.listen(8080, function() {
  console.log("App Ready")
})