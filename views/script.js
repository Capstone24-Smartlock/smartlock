const s = "http://www.w3.org/2000/svg"
const x = "http://www.w3.org/1999/xlink"

const unlock = document.getElementById("unlock")
const shaft = document.getElementById("shaft")

const burger = document.getElementById("burger")
const sidepanel = document.getElementById("sidepanel")
const coverpanel = document.getElementById("coverpanel")

const power = document.getElementById("power")
const powertext = document.getElementById("powertext")
const chargingIcon = document.getElementById("chargingIcon")

const alarmButton = document.getElementById("alarm")

class Lock {
    static #locked = true

    static get locked() {
        return this.#locked
    }

    static set locked(val) {
        if (val && !this.#locked) {
            shaft.querySelectorAll("animateMotion")[1].beginElement()
        } else if (!val && this.#locked) {
            shaft.querySelectorAll("animateMotion")[0].beginElement()
            fetch("/", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    req: val ? "lock" : "unlock",
                })
            })
        }
        this.#locked = val
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

unlock.addEventListener("click", async function() {
    Lock.locked = false
})

const buttonSocket = new WebSocket(`${location.origin.replace("http://", "ws://").replace("https://", "wss://")}/button`)

buttonSocket.addEventListener("message", async function(event) {
    console.log(event.message)
    switch (event.message) {
        case "locked":
            Lock.locked = true
            break
        case "alarm":
            alarmButton.style.visibility = "visible"
            break
    }
})

alarmButton.addEventListener("click", async function() {
    await fetch("/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            req: "alarm stopped",
        })
    })

    alarmButton.style.visibility = "hidden"
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

function setPower(percentage, charging=false) {
    let circumference = 2*Math.PI*parseInt(power.getAttributeNS(null, "r"))

    power.style.strokeDasharray = `${Math.floor(circumference*percentage)} ${Math.floor(circumference*(1-percentage))}`

    percentage = Math.round(percentage*100)
    powertext.innerHTML = `${percentage}%`
    if (percentage > 60 || charging) {
        power.style.stroke = "#5BC236"
    } else if (percentage <= 20) {
        power.style.stroke = "#FF0000"
    } else {
        power.style.stroke = "#ffe200"
    }
}

function isCharging(bool) {
    if (bool) {
        chargingIcon.setAttributeNS(null, "y", "-250")
    } else {
        chargingIcon.setAttributeNS(null, "y", "-2000")
    }
}

async function getPowerLevel() {
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
    setPower(Math.floor(battery.level*100)/100, battery.isCharging)
    isCharging(battery.isCharging)
}

async function getData() {
    let data = await fetch("/data").then(function(res) {
        return res.json()
    }).then(function(json) {
        return json
    })

    Lock.locked = data.locked
    alarmButton.style.visibility = data.alarmOn ? "visible" : "hidden"
    console.log(data.alarmOn)
}

window.addEventListener("load", function() {
    console.log("load")
    getData()
    getPowerLevel()
})

setInterval(function() {
    getPowerLevel()
}, 10000)