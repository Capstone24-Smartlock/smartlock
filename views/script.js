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
    static lockedVar = true

    static get locked() {
        return Lock.lockedVar
    }

    static set locked(val) {
        if (val) {
            shaft.querySelectorAll("animateMotion")[1].beginElement()
        } else {
            shaft.querySelectorAll("animateMotion")[0].beginElement()
        }
        let date = new Date()
        fetch("/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                req: val ? "lock" : "unlock",
                date: getDate(date),
                time: getTime(date),
                event: val ? 0 : 1
            })
        })
        Lock.lockedVar = val
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
    if (Lock.locked) {
        Lock.locked = false
    }
})

const lockSocket = new WebSocket(`${location.origin.replace("http://", "ws://").replace("https://", "wss://")}/lock`)

lockSocket.addEventListener("message", async function(event) {
    console.log(event.data, event.data.toString())
    switch (event.data.toString()) {
        case "closed":
            if (!Lock.locked) {
                Lock.locked = true
            }
            break
        case "alarm":
            console.log("Cooking")
            alarmButton.style.opacity = 1
            break
    }
})

alarmButton.addEventListener("click", async function() {
    let date = new Date()
    
    await fetch("/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            req: "alarm stopped",
            date: getDate(date),
            time: getTime(date),
            event: 3
        })
    })

    alarmButton.style.opacity = 0
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

function getPowerLevel() {
    fetch("/battery").then(function(res) {
        return res.json()
    }).then(function(json) {
        setPower(Math.floor(json.level*100)/100, json.isCharging)
        isCharging(json.isCharging)
        return
    })
}

function getDate(d) {
    return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear()
}

function getTime(d) {
    let hour = d.getHours()
    let morning = hour < 11
    if (hour == 0) {
        hour = 12
    } else if (hour >= 13) {
        hour -= 12
    }

    return hour + ":" + d.getMinutes().toString().padStart(2, "0") + ":" + d.getSeconds().toString().padStart(2, "0") + " " + (morning ? "AM" : "PM")
}

window.addEventListener("load", function() {
    getPowerLevel()
})

setInterval(function() {
    getPowerLevel()
}, 10000)