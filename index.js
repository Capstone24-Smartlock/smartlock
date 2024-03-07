//Battery HTTP port: 8421
//const raspi = require("raspi")
const pwm = require("raspi-soft-pwm")
const gpio = require("raspi-gpio")
const fs = require("fs")
const path = require("path")
const net = require("net")
const express = require('express')
const app = express()
const ws = require("express-ws")(app)

global.motor = new pwm.SoftPWM(5)
global.beeper = new gpio.DigitalOutput(1)
global.beeper.write(0)
global.button = new gpio.DigitalInput({
  pin: 26,
  pullResistor: gpio.PULL_UP,
})

global.locked = true

global.timer = 0
global.timerList = [0]

setInterval(function() {
  global.timer += 10
  if (global.timerList.length > 25) {
    global.timerList = global.timerList.slice(-25)
  }
}, 10)

global.alarmOn = false

async function alarm() {
  global.alarmOn = true

  let date = new Date()
  logEvent(getDate(date), getTime(date), 2)
  
  let toggle = true
  global.alarmInterval = setInterval(function() {
    global.beeper.write(toggle ? 0 : 1)
    toggle = !toggle
  }, 500)
}

// button.on("change", function(val) {
//   if (val == 0) {
//     close()
//   }
// })

function getDate(d) {
  return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear()
}

function getTime(d) {
  let hour = d.getHours()
  let morning = hour < 11
  if (hour == 0) {
      hour = 12
  } else if (hour >= 13) {
      hour -= 12
  }

  return hour + ":" + d.getMinutes().toString().padStart(2, "0") + ":" + d.getSeconds().toString().padStart(2, "0") + " " + (morning ? "AM" : "PM")
}

async function logEvent(date, time, event) {
  let log = fs.readFileSync("./log.json").toString()
  log = await JSON.parse(log)
  log.date.push(date)
  log.time.push(time)
  log.event.push(event)
  fs.writeFileSync("./log.json", JSON.stringify(log))
}

async function beep() {
  for (let i = 0; i < 2; i++) {
    global.beeper.write(1)
    await sleep(100)
    global.beeper.write(0)
    await sleep(100)
  }
}

function open() {
  global.locked = false
  global.motor.write(0.03)
}

function close() {
  global.locked = true
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
    if (!global.locked) {
      if (val == 0) {
        close()
        ws.send("closed")
      }
    } else {
      console.log(global.timerList)
      global.timerList.push(global.timer)
      global.timer = 0
      if (global.timerList.length >= 10 && !global.alarmOn) {
        if (global.timerList.slice(-10).every(function(e) {
          return e <= 1000
        })) {
          alarm()
          ws.send("alarm")
        }
      }
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
    case "alarm stopped":
      logEvent(data.date, data.time, data.event)
      clearInterval(global.alarmInterval)
      global.beeper.write(0)
  }
  res.send("Success")
})

app.listen(8080, function() {
  console.log("App Ready")
})

process.on("exit", function() {
  global.beeper.write(0)
})