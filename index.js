const express = require('express')
const app = express()

console.log("The start of something beautiful")

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.listen(3000)
