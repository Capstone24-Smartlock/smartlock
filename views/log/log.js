var events = document.getElementById("events")

fetch("/events").then(function(res) {
    return res.json()
}).then(function(data) {
    for (i = data.date.length - 1; i >= 0; i--) {
        let row = document.createElement("tr")
        let items = [data.date[i], data.time[i], data.event[i]]
        for (let s = 0; s < 3; s++) {
            let elem = document.createElement("td")
            elem.innerHTML = items[s]
            row.appendChild(elem)
        }
        events.appendChild(row)
    }
})