//Battery HTTP port: 8421
const Gpio = require('onoff').Gpio
const path = require("path")
const net = require("net")
const express = require('express')
const app = express()

const beeper = new Gpio(18, "out")
function shortBeep() {
  let count = 0
  const beep = setInterval(function() {
    beeper.writeSync(beeper.readSync() ^ 1)
    count += 1
    if (count == 4) {
      clearInterval(beep)
    }
  }, 250)
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
    let level = Math.ceil(parseFloat(data.toString().split(" ")[1])).toString()
    res.send(level)
    battery.destroy()
  })
})

app.post("^/$|/index(.html)?", function(req, res) {
  if (req.body.req == "unlock") {
    shortBeep()
  }
})

app.listen(8080, function() {
  console.log("Let's go")
})