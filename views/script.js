const s = "http://www.w3.org/2000/svg"
const x = "http://www.w3.org/1999/xlink"

const unlock = document.getElementById("unlock")
const shaft = document.getElementById("shaft")

const burger = document.getElementById("burger")
const sidepanel = document.getElementById("sidepanel")
const coverpanel = document.getElementById("coverpanel")

const power = document.getElementById("power")
const powertext = document.getElementById("powertext")

var locked = true

unlock.addEventListener("click", function() {
    if (locked) {
        shaft.querySelectorAll("animateMotion")[0].beginElement()

        fetch("/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                req: "unlock"
            })
        }).then(function(res) {
            console.log(res.json())
        }).catch(function(err) {
            console.log(err)
        })
    } else {
        shaft.querySelectorAll("animateMotion")[1].beginElement()
    }
    locked = !locked
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

function setPower(percentage) {
    let circumference = 2*Math.PI*parseInt(power.getAttributeNS(null, "r"))

    power.style.strokeDasharray = `${Math.floor(circumference*percentage)} ${Math.floor(circumference*(1-percentage))}`

    percentage = Math.round(percentage*100)
    powertext.innerHTML = `${percentage}%`
    if (percentage > 60) {
        power.style.stroke = "#5BC236"
    } else if (percentage <= 20) {
        power.style.stroke = "#FF0000"
    } else {
        power.style.stroke = "#ffe200"
    }
}

function getPowerLevel() {
    fetch("/battery").then(function(res) {
        return res.text()
    }).then(function(text) {
        setPower(Math.floor(parseFloat(text)*100)/100)
        return
    })
}

window.addEventListener("load", function() {
    getPowerLevel()
})

setInterval(function() {
    getPowerLevel()
}, 10000)