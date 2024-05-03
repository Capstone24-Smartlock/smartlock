//Battery HTTP port: 8421
//Imports all the required packages for this project.
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
const mysql = require("mysql")

//This creates the class that allows the server code to communicate with the front end through a WebSocket, allowing for real-time updates to occur on the front end. For example, when the lock is closed, the lock button will update to show a locked lock, or when the alarm is triggered, the “stop alarm” button will appear.
class WebSocketAPI {
  clients = []

  constructor() {
    this.socket = new WebSocket.Server({port: 7000})

    let clientList = this.clients
    this.socket.on("connection", function(ws) {
      //Removes all closed clients from the client list
      ws.on("close", function() {
        clientList.splice(clientList.indexOf(ws))
      })

      //Adds newly connected clients to the client list
      clientList.push(ws)
    })
  }

  //Sends a message to all open clients connected to the WebSocket.
  send(message) {
    this.clients.forEach(function(client) {
      client.send(message)
    })
  }
}

//This class defines all the basic electronic compontents so they are easier to control and manage.
class Electronics {
  static motor = new pwm.SoftPWM(5)
  static beeper = new gpio.DigitalOutput(1)
  static button = new gpio.DigitalInput({
    pin: 26,
    pullResistor: gpio.PULL_UP,
  })

  //This method defines the 2 quick beeps the beepers does when the lock is unlocked.
  static async beep() {
    for (let i = 0; i < 2; i++) {
      Electronics.beeper.write(1)
      await sleep(100)
      Electronics.beeper.write(0)
      await sleep(100)
    }
  }
}

//Makes sure the beeper is off when the program starts.
Electronics.beeper.write(0)

//This class defines all the methods and attrivutes used to control the locking and unlocking mechanisms of the lock.
class Lock {
  static #locked = true
  //Defines the PWM duty cycles the servo is calibrated in order to move to the correct position when opening and closing.
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

//Camera class to easily manage the Camera.
class Camera {
  //Takes a picture and stores it in a JSON file called images.json as a dataURL.
  static async snap() {
    await libcamera.still({
      config: {
        output: path.join(__dirname, "tmp.png"),
        width: 480,
        height: 640,
      }
    })

    let img = fs.readFileSync(path.join(__dirname, "tmp.png"))
    img = img.toString("base64")
    img = `data:image/png;base64,${img}`
    
    return img
  }
}

//Class to manage how the alarm will function. If a certain number of button presses are detected within a certain time interval of each other, then the alarm will go off. This is used to check lock rattling.
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
      Event.log(2, Camera.snap())

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

//Manages Event logging. Everytime an action is made with the lock, the event logger will store the data in a json file.
class Event {
  static connection = mysql.createConnection({
    host: "localhost",
    user: "dylan",
    password: "capstone24",
    database: "smartlock_log"
  })

  static async log(event, image=null, date=new Date()) {
    Event.connection.query(`INSERT INTO events (date, event${image === null ? "" : ", image"}) VALUES (${date.getTime()}, ${event}${image === null ? "" : `, ${await image}`})`)
  }
}
Event.connection.connect()

Event.log(0, Camera.snap())

// Event.connection.query("SELECT * FROM events", function(err, results) {
//   console.log(results)
// })

//Manages the battery. Makes TCP requests to the PI Sugar API to get the power level and whether or not the battery is charging.
class Battery {
  static async properties(req) {
    const battery = new net.Socket()
    battery.connect(8423, "127.0.0.1", function() {
      battery.write(req)
    })
    return await new Promise(function(resolve, reject) {
      battery.on("data", function(data) {
        let text = data.toString()
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

//Sends current lock status on client reload.
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

//Creates a WebSocketAPI that will send messages when certain button presses occur.
const buttonSocket = new WebSocketAPI()

//Event listener for buttons to lock the lock, activate the alarm, and send WebSocket requests.
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

//Takes incoming requests for the lock to do something and runs the necessary code to make that happen.
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

//Turns off beeper in case of program termination (currently unfunctional)
process.on("exit", function() {
  Electronics.beeper.write(0)
})