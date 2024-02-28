//Battery HTTP port: 8421
const gpio = require("./gpio.js").gpio
const path = require("path")
const net = require("net")
const express = require('express')
const app = express()

async function test() {
  for (let i = 0; i < 5; i++) {
    gpio.open()
    await sleep(1000)
    gpio.close()
    await sleep(1000)
  }
}

var open = true
setInterval(function() {
  if (open) {
    gpio.open()
  } else {
    gpio.close()
  }
}, 1000)

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
      console.log("Lock")
      open = false
    case "unlock":
      console.log("Unlock")
      open = true
  }
})

app.listen(8080, function() {
  console.log("Let's go")
})