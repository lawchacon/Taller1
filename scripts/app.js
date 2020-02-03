(function () {
    'use strict';
    var app = {
        isLoading: true,
        visibleCards: {},
        selectedTimetables: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container')
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

     document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the metro stations
        app.updateSchedules();
    });

     document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new station dialog
        app.toggleAddDialog(true);
    });

     document.getElementById('butAddCity').addEventListener('click', function () {
        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        var db;
        var estacion = {
            key: key,
            label: label,
            created: new Date(),
            schedules: [
            {
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
            ]
        };
        if (!window.indexedDB) {
          console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
      }
      else{
          console.log("Works");
      }
      var request = indexedDB.open("HorariosDB");
      request.onerror = function(event) {
          console.log("Why didn't you allow my web app to use IndexedDB?!");
      };
      request.onsuccess =function(event) {
          db = event.target.result;
          console.log(db);
          var transaction = db.transaction(["estaciones"], "readwrite");
          transaction.onerror = function(event) {
            console.log("error insertando");
        };
        var objectStore = transaction.objectStore("estaciones");
        var req = objectStore.add(estacion);
        req.onsuccess = function(event) {
            console.log(event.target.result);
            
        };
    };
    if (!app.selectedTimetables) {
        app.selectedTimetables = [];
    }
    app.getScheduleFromNetwork(key, label);
    app.selectedTimetables.push({key: key, label: label});
    app.toggleAddDialog(false);
});

     document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new station dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new station dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a timestation card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.

    app.updateTimetableCard = function (data) {
        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];
        
        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        }
        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for(var i = 0; i<4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if(schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/
     app.openDB = function(){
      var initialStationTimetable = {
        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: new Date(),
        schedules: [
        {
            message: '0 mn'
        },
        {
            message: '2 mn'
        },
        {
            message: '5 mn'
        }
        ]
    };
    var db;
    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
    }
    else{
        console.log("Works");
    }
    var request = indexedDB.open("HorariosDB");
    request.onerror = function(event) {
        console.log("Why didn't you allow my web app to use IndexedDB?!");
    };
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log(db);
        var transaction = db.transaction(["estaciones"]);
        var objectStore = transaction.objectStore("estaciones");
        objectStore.openCursor().onsuccess =  function(event) {
          var cursor =  event.target.result;
          if (cursor) {
            var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + cursor.value.key;
            var requestAPI = new XMLHttpRequest();
            requestAPI.onreadystatechange = function () {
              if (requestAPI.readyState === XMLHttpRequest.DONE) {
                if (requestAPI.status === 200) {
                  var response = JSON.parse(requestAPI.response);
                  var result = {};
                  result.key = cursor.value.key;
                  result.label = cursor.value.label;
                  result.created = response._metadata.date;
                  result.schedules = response.result.schedules;
                  app.updateTimetableCard(result);
                  
              }
          }
      };
      requestAPI.open('GET', url);
      requestAPI.send();
      cursor.continue();
  }
};
};
request.onupgradeneeded =function(event) { 
    console.log("Nueva");
    db = event.target.result;
    var objectStore = db.createObjectStore("estaciones", { keyPath: "key" });
    objectStore.createIndex("key", "key", { unique: true });
    objectStore.transaction.oncomplete = function(event) {
      var customerObjectStore = db.transaction("estaciones", "readwrite").objectStore("estaciones");
      customerObjectStore.add(initialStationTimetable);
  }
};
};

app.getScheduleFromCache = function (key,label) {
  if (!('caches' in window)) {
    return null;
}
const url = `${window.location.origin}/${key}`;
return caches.match(url)
.then((response) => {
    if (response) {
      var resp = JSON.parse(response.json());
      var result = {};
      result.key = key;
      result.label = label;
      result.created = resp._metadata.date;
      result.schedules = resp.result.schedules;
      app.updateTimetableCard(result);
  }
})
.catch((err) => {
    console.error('Error getting data from cache', err);
    return null;
});
};

app.getScheduleFromNetwork = function (key, label) {
    var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;

    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 200) {
                var response = JSON.parse(request.response);
                var result = {};
                result.key = key;
                result.label = label;
                result.created = response._metadata.date;
                result.schedules = response.result.schedules;
                app.updateTimetableCard(result);
            }
        } 
    };
    request.open('GET', url);
    request.send();
};

    // Iterate all of the cards and attempt to get the latest timetable data
    app.updateSchedules = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getScheduleFromNetwork(key);
            app.getScheduleFromCache(key);
        });
    };

    
    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/
     app.openDB()    
 })();
