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
}

Electronics.beeper.write(0)

class Lock {
  static #locked = true
  static #opened = 0.03
  static #closed = 0.07

  static get locked() {
    return this.#locked
  }

  static set locked(val) {
    if (val && !this.#locked) {
      Electronics.motor.write(this.#closed)
    } else if (!val && this.#locked) {
      Electronics.motor.write(this.#opened)
      beep()
    }
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
    return this.#on
  }

  static set on(val) {
    if (val && !this.#on) {
      let date = new Date()
      logEvent(getDate(date), getTime(date), 2)

      this.#interval = setInterval(async function() {
        Electronics.motor.write(1)
        await sleep(1000)
        Electronics.motor.write(0)
        await sleep(100)
      }, 1100)
    } else if (!val && this.#on) {
      this.timer = 0
      this.timerList = [0]
      clearInterval(this.#interval)
      Electronics.beeper.write(0)
    }

    this.#on = val
  }

  static tick() {
    this.timerList.push(this.timer)
    this.timer = 0
    if (this.timerList.slice(-10).every(function(e) {
      return e <= 1000
    })) {
      this.on = true
    }
  }

  static check() {
    if (Alarm.timerList.length >= this.length && !Alarm.#on) {
      if (this.timerList.slice(-1*this.length).every(function(e) {
        return e <= this.distance
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
    Electronics.beeper.write(1)
    await sleep(100)
    Electronics.beeper.write(0)
    await sleep(100)
  }
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
    if (!Lock.locked) {
      if (val == 0) {
        close()
        ws.send("closed")
      }
    }
  })
})

app.ws("/alarm", function(ws, req) {
  Electronics.button.on("change", function(val) {
    if (Lock.locked) {
      if (val == 1) {
        Alarm.tick()
        if (Alarm.check()) {
          Alarm.on = true
          ws.send("alarm")
        }
      }
    }
  })
})

app.get("/events(.html)?", function(req, res) {
  res.send(fs.readFileSync("./log.json").toString())
})

app.post("^/$|/index(.html)?", function(req, res) {
  let data = req.body
  switch (data.req) {
    case "lock":
      logEvent(data.date, data.time, data.event)
      Lock.locked = true
      break
    case "unlock":
      logEvent(data.date, data.time, data.event)
      Lock.locked = false
      break
    case "test":
      Electronics.motor.write(data.value)
      break
    case "alarm stopped":
      logEvent(data.date, data.time, data.event)
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