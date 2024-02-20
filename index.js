const path = require("path")
const express = require('express')
const app = express()

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