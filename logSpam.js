const fs = require("fs")

class Event {
    static async log(event, date=new Date()) {
        let log = fs.readFileSync("./log.json").toString()
        log = JSON.parse(log)
        log.date = [date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        }), ...log.date]
        log.time = [date.toLocaleTimeString("en-US"), ...log.time]
        log.event = [event, ...log.event]
        fs.writeFileSync("./log.json", JSON.stringify(log))
    }
}

for (let i = 0; i<100; i++) {
    Event.log(0)
}

