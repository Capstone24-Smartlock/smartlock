class LogEvent {
    static events = []
    static log
    static eventsPerLoad = 20

    static eventTable = document.getElementById("events")
    static loadButton = document.getElementById("load")

    static *updateGen() {
        console.log("Run")
        this.loadButton.style.visibility = "visible"
        for (let i = 0; i < Math.ceil(LogEvent.log.date.length/LogEvent.eventsPerLoad); i++) {
            for (let event = 0; event < LogEvent.eventsPerLoad; event++) {
                try {
                    let index = i*LogEvent.eventsPerLoad + event
                    let eve = new LogEvent(LogEvent.log.date[index], LogEvent.log.time[index], LogEvent.log.event[index])
                    eve.createRow()
                } catch {
                    this.loadButton.style.visibility = "hidden"
                    return
                }
            }
            yield
        }
        this.loadButton.style.visibility = "hidden"
        return true
    }

    static update = this.updateGen()

    constructor(date, time, event) {
        this.date = date
        this.time = time
        this.event = event

        LogEvent.events.push(this)
    }

    get message() {
        switch (this.event) {
            case 0:
                return "Lock was locked"
            case 1:
                return "Lock was unlocked"
            case 2:
                return "Break in attempt detected"
            case 3:
                return "Alarm stopped"
        }
    }

    get color() {
        let colors = {
            black: [1, 3],
            green: [0],
            red: [2],
        }
        let colorList = Object.keys(colors)
        for (let i = 0; i < colorList.length; i++) {
            if (colors[colorList[i]].includes(this.event)) {
                return colorList[i]
            }
        }
    }

    createRow() {
        let row = document.createElement("tr")
        let items = [this.date, this.time, this.message]
        for (let i = 0; i < items.length; i++) {
            let elem = document.createElement("td")
            elem.style.color = this.color
            elem.innerHTML = items[i]
            row.appendChild(elem)
        }
        LogEvent.eventTable.appendChild(row)
    }
}
//asdasd
window.addEventListener("load", async function() {
    LogEvent.log = await fetch("/events").then(function(res) {
        return res.json()
    }).then(function(data) {
        return data
    })

    LogEvent.update.next()
})

LogEvent.loadButton.addEventListener("click", function() {
    LogEvent.update.next()
})