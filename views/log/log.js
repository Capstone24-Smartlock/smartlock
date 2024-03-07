var events = document.getElementById("events")

class LogEvent {
    constructor(date, time, event) {
        this.date = date
        this.time = time
        this.event = event
    }

    get message() {
        switch (this.event) {
            case 0:
                return "Lock was locked"
            case 1:
                return "Lock was unlocked"
            case 2:
                return "Break in attempt detected"
        }
    }

    get color() {
        let colors = {
            black: [1],
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

    get row() {
        let row = document.createElement("tr")
        let items = [this.date, this.time, this.message]
        for (let i = 0; i < items.length; i++) {
            let elem = document.createElement("td")
            elem.style.color = this.color
            elem.innerHTML = items[i]
            row.appendChild(elem)
        }
        return row
    }
}

var eve = []

fetch("/events").then(function(res) {
    return res.json()
}).then(function(data) {
    for (i = data.date.length - 1; i >= 0; i--) {
        let event = new LogEvent(data.date[i], data.time[i], data.event[i])
        eve.push(event)
        events.appendChild(event.row)
    }
})