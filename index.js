//Battery HTTP port: 8421
//const raspi = require("raspi")
const pwm = require("raspi-soft-pwm")
const gpio = require("raspi-gpio")
const fs = require("fs")
const path = require("path")
const net = require("net")
const express = require("express")
const { Socket } = require("dgram")
const app = express()
const WebSocket = require("ws")
const libcamera = require("libcamera").libcamera

class WebSocketAPI {
  clients = []

  constructor() {
    this.socket = new WebSocket.Server({port: 7000})

    let clientList = this.clients
    this.socket.on("connection", function(ws) {
      ws.on("close", function() {
        clientList.splice(clientList.indexOf(ws))
      })

      clientList.push(ws)
    })
  }

  send(message) {
    this.clients.forEach(function(client) {
      client.send(message)
    })
  }
}

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
      Event.log(0)
    } else if (!val && Lock.#locked) {
      Electronics.motor.write(Lock.#opened)
      Electronics.beep()
      Event.log(1)
    }
    Lock.#locked = val
  }
}

class Camera {
  static async snap() {
    const date = new Date()

    let img = await libcamera.still({
      config: {
        output: path.join(__dirname, "test.png"),
        width: 480,
        height: 640,
      }
    }).then(function(result) {
      return result
    })
  }
}

Camera.snap()

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
      Event.log(2)

      Alarm.#interval = setInterval(async function() {
        Electronics.beeper.write(1)
        await sleep(1000)
        Electronics.beeper.write(0)
        await sleep(100)
      }, 1100)

    } else if (!val && Alarm.#on) {
      Event.log(3)
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
  static async log(event, date=new Date()) {
    let log = Event.file
    log = JSON.parse(log)
    log.date = [date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }), ...log.date]
    log.time = [date.toLocaleTimeString("en-US"), ...log.time]
    log.event = [event, ...log.event]
    Event.file = JSON.stringify(log)
  }

  static get file() {
    return fs.readFileSync(path.join(__dirname, "/log.json")).toString()
  }

  static set file(val) {
    fs.writeFileSync(path.join(__dirname, "/log.json"), val)
  }
}

class Battery {
  static async properties(req) {
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

  static async data() {
    if (await Battery.properties("get battery") === null) {
      return null
    }
    return {
      level: parseFloat(await Battery.properties("get battery"))/100,
      isCharging: (await Battery.properties("get battery_power_plugged")).valueOf() === "true".valueOf(),
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

app.listen(8080, function() {
  console.log("App Ready")
})

app.use(express.static(path.join(__dirname, "/views")))
app.use(express.json())

app.get("^/$|/index(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "/views/index.html"))
})

app.get("/data", function(req, res) {
  res.send(JSON.stringify({
    locked: Lock.locked,
    alarmOn: Alarm.on,
  }))
})

app.get("/log(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "/views/log/log.html"))
})

app.get("/battery", async function(req, res) {
  res.send(JSON.stringify(await Battery.data()))
})

const buttonSocket = new WebSocketAPI()

Electronics.button.on("change", function(val) {
  if (val == 0 && !Lock.locked) {
    Lock.locked = true
    buttonSocket.send("lock")
  } else if (val == 1 && Lock.locked && !Alarm.on) {
    Alarm.tick()
    if (Alarm.check()) {
      Alarm.on = true
      buttonSocket.send("alarm")
    }
  }
})

app.get("/events(.html)?", function(req, res) {
  res.send(Event.file)
})

app.post("^/$|/index(.html)?", function(req, res) {
  let data = req.body
  switch (data.req) {
    case "lock":
      Lock.locked = true
      break
    case "unlock":
      Lock.locked = false
      buttonSocket.send("unlock")
      break
    case "test":
      Electronics.motor.write(data.value)
      break
    case "alarm stopped":
      Alarm.on = false
      buttonSocket.send("alarm stopped")
      break
  }
  res.send("Success")
})

process.on("exit", function() {
  Electronics.beeper.write(0)
})