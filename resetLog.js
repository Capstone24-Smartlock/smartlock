const mysql = require("mysql")

let connection = mysql.createConnection({
    host: "localhost",
    user: "dylan",
    password: "capstone24",
    database: "smartlock_log"
})

connection.connect()

connection.query("DELETE FROM events")
connection.query("ALTER TABLE events AUTO_INCREMENT = 0")

connection.end()