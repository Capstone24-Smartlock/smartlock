const s = "http://www.w3.org/2000/svg"
const x = "http://www.w3.org/1999/xlink"

const burger = document.getElementById("burger")
const sidepanel = document.getElementById("sidepanel")
const coverpanel = document.getElementById("coverpanel")

class Lock {
    static #locked = true

    static button = document.getElementById("unlock")
    static shaft = document.getElementById("shaft")

    static get locked() {
        return this.#locked
    }

    static set locked(val) {
        if (val && !this.#locked) {
            this.shaft.querySelectorAll("animateMotion")[1].beginElement()
        } else if (!val && this.#locked) {
            this.shaft.querySelectorAll("animateMotion")[0].beginElement()
            fetch("/", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    req: "unlock",
                })
            })
        }
        this.#locked = val
    }
}

Lock.button.addEventListener("click", async function() {
    Lock.locked = false
})

class Alarm {
    static #on = false

    static button = document.getElementById("alarm")

    static get on() {
        return this.#on
    }

    static set on(val) {
        if (val && !this.#on) {
            this.button.style.visibility = "visible"
        } else if (!val && this.#on) {
            fetch("/", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    req: "alarm stopped",
                })
            })

            this.button.style.visibility = "hidden"
        }
        this.#on = val
    }
}

Alarm.button.addEventListener("click", async function() {
    Alarm.on = false
})

class Battery {
    static power = document.getElementById("power")
    static powertext = document.getElementById("powertext")
    static chargingIcon = document.getElementById("chargingIcon")

    static setPower(percentage, charging=false) {
        let circumference = 2*Math.PI*parseInt(this.power.getAttributeNS(null, "r"))
    
        this.power.style.strokeDasharray = `${Math.floor(circumference*percentage)} ${Math.floor(circumference*(1-percentage))}`
    
        percentage = Math.round(percentage*100)
        this.powertext.innerHTML = `${percentage}%`
        if (percentage > 60 || charging) {
            this.power.style.stroke = "#5BC236"
        } else if (percentage <= 20) {
            this.power.style.stroke = "#FF0000"
        } else {
            this.power.style.stroke = "#ffe200"
        }

        if (charging) {
            this.chargingIcon.setAttributeNS(null, "y", "-250")
        } else {
            this.chargingIcon.setAttributeNS(null, "y", "-2000")
        }
    }

    static async update() {
        let battery = await fetch("/battery").then(function(res) {
            return res.json()
        }).then(function(json) {
            if (json === null) {
                json = {
                    level: 1,
                    isCharging: false,
                }
            }
            return json
        })
        this.setPower(Math.floor(battery.level*100)/100, battery.isCharging)
    }
}

async function setMotor(val) {
    await fetch("/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            req: "test",
            value: val,
        })
    })
}

const buttonSocket = new WebSocket(`${location.origin.replace("http://", "ws://").replace("https://", "wss://")}/button`)

buttonSocket.addEventListener("message", async function(event) {
    console.log(event.data)
    switch (event.data) {
        case "locked":
            Lock.locked = true
            break
        case "alarm":
            Alarm.on = true
            break
    }
    buttonSocket.send("Success")
})

buttonSocket.addEventListener("open", function() {
    console.log("Web Socket successfully opened")
})

buttonSocket.addEventListener("error", function(error) {
    console.log(error)
})

window.addEventListener("unload", function() {
    console.log("Unload")
    buttonSocket.addEventListener("close", function() {})
    buttonSocket.close()
})

burger.addEventListener("click", function() {
    sidepanel.style.width = "250px"
    coverpanel.style.width = "100%"
    coverpanel.style.height = "100%"
})

coverpanel.addEventListener("click", function() {
    sidepanel.style.width = "0"
    coverpanel.style.width = "0"
    coverpanel.style.height = "0"
})

async function getData() {
    let data = await fetch("/data").then(function(res) {
        return res.json()
    }).then(function(json) {
        return json
    })

    Lock.locked = data.locked
    Alarm.on = data.alarmOn
}

window.addEventListener("load", function() {
    console.log("load")
    getData()
    Battery.update()
})

setInterval(function() {
    Battery.update()
}, 10000)