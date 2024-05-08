const mysql = require("mysql")

let connection = mysql.createConnection({
    host: "localhost",
    user: "dylan",
    password: "capstone24",
    database: "smartlock_log"
})

connection.connect()

for (let i = 0; i < 500; i++) {
    connection.query("INSERT INTO events (date, event) values (0, 0)")
}

connection.end()