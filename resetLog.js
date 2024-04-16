//Resets the log.json file
const fs = require("fs")

fs.writeFileSync("./log.json", '{"date":[],"time":[],"event":[]}')