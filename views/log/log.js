//Creates a display for all the events stored on the PI. Does not refresh in real-time, page refresh required.
class LogEvent {
    static events = []
    static log
    static eventsPerLoad = 50
    static max

    static eventTable = document.getElementById("events")
    static loadButton = document.getElementById("load")

    //Only loads 50 events at a time to prevent the page from being overloaded.
    static async *updateGen() {
        if (LogEvent.max > 50) {
            LogEvent.loadButton.style.visibility = "visible"
        }
        
        let current = LogEvent.max

        while (current >= 0) {
            if (current != LogEvent.max) {
                yield
            }

            let events = await fetch("/events", {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify({
                    start: current - LogEvent.eventsPerLoad + 1,
                    end: current,
                })
            }).then(function(res) {
                return res.json()
            }).then(function(data) {
                return data
            })
            
            events.forEach(function(e) {
                let event = new LogEvent(e.date, e.event, e.image)
                LogEvent.events.push(event)
                event.createRow()
            })

            current -= LogEvent.eventsPerLoad
        }

        this.loadButton.style.visibility = "hidden"
        return true
    }

    static update = this.updateGen()

    static async run() {
        LogEvent.max = await fetch("/max").then(function(res) {
            return res.json()
        }).then(function(data) {
            return data
        })

        LogEvent.update.next()
    }

    constructor(date, event, image=null) {
        let eventDate = new Date()
        eventDate.setTime(date)

        this.date = eventDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        this.time = eventDate.toLocaleTimeString("en-US")
        this.event = event
        this.image = image !== null ? (new TextDecoder()).decode(Uint8Array.from(image.data)) : null

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

    //Creates the event as a table row.
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

        if (this.image !== null) {
            let img = document.createElement("img")
            img.style.width = "100%"
            img.setAttribute("src", this.image)
            LogEvent.eventTable.appendChild(img)
        }
    }
}

LogEvent.run()

LogEvent.loadButton.addEventListener("click", function() {
    LogEvent.update.next()
})