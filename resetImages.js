//Deletes all images from PI.
const fs = require("fs")

fs.writeFileSync("./images.json", '[]')