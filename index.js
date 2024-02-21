const path = require("path")
const net = require("net")
const express = require('express')
const app = express()

const battery = new net.Socket()
battery.connect(8423, "127.0.0.1", function() {
  console.log("Battery connected")
  battery.write("get battery")
})
battery.on("data", function(data) {
  console.log(data)
})
battery.on("close", function() {
  console.log("Battery connection closed")
})

app.use(express.static("views"))
app.use(express.json())

app.get("^/$|/index(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "/views/index.html"))
})

app.get("/log(.html)?", function(req, res) {
  res.sendFile(path.join(__dirname, "views/log/log.html"))
})

app.post("^/$|/index(.html)?", function(req, res) {
  console.log(req.body)
})

app.listen(8080, function() {
  console.log("Let's go")
})