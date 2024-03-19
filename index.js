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

class Electronics {
  static motor = new pwm.SoftPWM(5)
  static beeper = new gpio.DigitalOutput(1)
  static button = new gpio.DigitalInput({
    pin: 26,
    pullResistor: gpio.PULL_UP,
  })

  static async beep() {
    for (let i = 0; i < 2; i++) {
      Electronics.beeper.write(1)
      await sleep(100)
      Electronics.beeper.write(0)
      await sleep(100)
    }
  }
}

Electronics.beeper.write(0)

class Lock {
  static #locked = true
  static #opened = 0.03
  static #closed = 0.07

  static get locked() {
    return Lock.#locked
  }

  static set locked(val) {
    if (val && !Lock.#locked) {
      Electronics.motor.write(Lock.#closed)
    } else if (!val && Lock.#locked) {
      Electronics.motor.write(Lock.#opened)
      Electronics.beep()
    }
    Lock.#locked = val
  }
}

class Alarm {
  static timer = 0
  static timerList = [0]
  static length = 10
  static distance = 1000

  static #on = false
  static #interval

  static get on() {
    return Alarm.#on
  }

  static set on(val) {
    if (val && !Alarm.#on) {
      let date = new Date()
      (new Event(date, 2)).log()

      Alarm.#interval = setInterval(async function() {
        Electronics.beeper.write(1)
        await sleep(1000)
        Electronics.beeper.write(0)
        await sleep(100)
      }, 1100)
    } else if (!val && Alarm.#on) {
      Alarm.timer = 0
      Alarm.timerList = [0]
      clearInterval(Alarm.#interval)
      Electronics.beeper.write(0)
    }

    Alarm.#on = val
  }

  static tick() {
    Alarm.timerList.push(Alarm.timer)
    Alarm.timer = 0
  }

  static check() {
    if (Alarm.timerList.length >= Alarm.length) {
      if (Alarm.timerList.slice(-1*Alarm.length).every(function(e) {
        return e <= Alarm.distance
      })) {
        return true
      }
    }
    return false
  }
}

setInterval(function() {
  Alarm.timer += 10
  if (Alarm.timerList.length > Alarm.length + 5) {
    Alarm.timerList = Alarm.timerList.slice(-1*(Alarm.length + 5))
  }
}, 10)

class Event {
  constructor(date, event) {
    let d = new Date(date)
    this.date = d.toLocaleDateString()
    this.time = d.toLocaleTimeString()
    this.event = event
  }

  async log() {
    let log = fs.readFileSync("./log.json").toString()
    log = await JSON.parse(log)
    log.date.push(this.date)
    log.time.push(this.time)
    log.event.push(this.event)
    fs.writeFileSync("./log.json", JSON.stringify(log))
  }
}

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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
      text = data.toString()
      if (text.split("").slice(0,-1).join("").valueOf() === "Invalid request.".valueOf()) {
        reject()
      }
      resolve(text)
    })
  }).then(function(data) {
    return data.split(" ")[1].split("").slice(0, -1).join("")
  }).catch(function() {
    return null
  })
}

async function batteryData() {
  if (await batteryProperties("get battery") === null) {
    return null
  }
  return {
    level: parseFloat(await batteryProperties("get battery"))/100,
    isCharging: (await batteryProperties("get battery_power_plugged")).valueOf() === "true".valueOf(),
  }
}

app.get("/battery", async function(req, res) {
  res.send(JSON.stringify(await batteryData()))
})

app.ws("/lock", function(ws, req) {
  Electronics.button.on("change", function(val) {
    if (val == 0 && !Lock.locked) {
      Lock.locked = true
      ws.send("locked")
    }
  })
})

app.ws("/alarm", function(ws, req) {
  Electronics.button.on("change", function(val) {
    if (val == 1 && Lock.locked && !Alarm.on) {
      Alarm.tick()
      if (Alarm.check()) {
        Alarm.on = true
        ws.send("alarm")
      }
    }
  })
})

app.get("/events(.html)?", function(req, res) {
  res.send(fs.readFileSync("./log.json").toString())
})

app.post("^/$|/index(.html)?", function(req, res) {
  let data = req.body
  if (typeof data.date !== "undefined") {
    let date = new Date(data.date)
    (new Event(date, data.event)).log()
  }
  switch (data.req) {
    case "lock":
      Lock.locked = true
      break
    case "unlock":
      Lock.locked = false
      break
    case "test":
      Electronics.motor.write(data.value)
      break
    case "alarm stopped":
      Alarm.on = false
  }
  res.send("Success")
})

app.listen(8080, function() {
  console.log("App Ready")
})

process.on("exit", function() {
  Electronics.beeper.write(0)
})