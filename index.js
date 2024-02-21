//Battery HTTP port: 8421
const Gpio = require('onoff').Gpio
const path = require("path")
const net = require("net")
const express = require('express')
const app = express()

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const beeper = new Gpio(18, "out")
async function shortBeep() {
  for(let i = 0; i < 2; i++) {
    beeper.writeSync(1)
    await sleep(100)
    beeper.writeSync(0)
    await sleep(250)
  }
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
    let level = parseFloat(data.toString().split(" ")[1])/100
    res.send(level)
    battery.destroy()
  })
})

app.post("^/$|/index(.html)?", function(req, res) {
  if (req.body.req == "unlock") {
    console.log("Beep")
    shortBeep()
  }
})

app.listen(8080, function() {
  console.log("Let's go")
})