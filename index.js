const path = require("path")
const dgram = require("dgram")
const express = require('express')
const app = express()

const battery = dgram.createSocket("udp4")
battery.send("get battery", 8421, "127.0.0.1", function(err, bytes) {
  if (err) {
    console.log(err)
  }
  console.log(bytes)
  battery.close()
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