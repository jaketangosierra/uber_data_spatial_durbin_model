/*
get the required configuration information
*/
var config = require('./config.json');

if (config.debug) {
  start_time = new Date().getTime()
}

/*
* define some helper functions
*/
function make_centroid(feature) {
  c = centroid(feature);
  c.properties=feature.properties;
  return c;
}

/*
* import libraries
*/
var request = require('request');
var shp = require('shp');
var fs = require('fs');
var centroid = require('@turf/centroid');
var helpers = require('@turf/helpers');

/*
* setup sqlite, to account for debugging purposes
*/
if (config.debug) {
  var sqlite3 = require('sqlite3').verbose();
} else {
  sqlite3 = require('sqlite3');
}

var db = new sqlite3.Database('./uber.db', (error, success) => {
  if(error != null) {
    console.log("Something went wrong opening the database.");
    return;
  }
});
db.serialize(() => {
  console.log('Building SQLite table if needed.')
  db.run("CREATE TABLE IF NOT EXISTS uberx (unix_timestamp NUMERIC, poly_id TEXT, eta NUMERIC);");

  /*
  * This helps SQLite be faster - https://www.sqlite.org/wal.html
  */
  console.log('')
  db.run("PRAGMA journal_mode=WAL;");
});

var polygons = shp.readFileSync(config.shapefile_path);
var centroids = helpers.featureCollection(polygons.features.map(make_centroid));
var features = centroids.features;

if(features.length > 2000) {
  console.log("Your shapefile contains more than 2000 features, which will cause you to run into rate-limiting, most likely. Consider breaking up your query area across multiple API end-points.");
  return;
}
/*
* run the first set of calls once
*/
setImmediate(make_requests);

/*
* schedule the calls to happen every hour
*/
timer = setInterval(make_requests, 250000);
// timer = setInterval(make_requests, 3600000)


/*
* make queries every hour, every day for X weeks (default to 1)
*/
// var end = 24 * (7 * config.weeks_to_run) - 1
var end = 2

function make_requests() {
  /*
  * logic for stopping running goes here
  */
  end -= 1
  if (end === 0){
    clearInterval(timer);
  }

  console.log('Starting a run of queries');
  for (var x in features) {
    var coords = features[x].geometry.coordinates;

    var latitude = 'start_latitude='+coords[1];
    var longitude = '&start_longitude='+coords[0];
    var path = '/v1.2/estimates/time?'+latitude+longitude;
    var url = 'http://sandbox-api.uber.com'+path;

    /*
    * you should only need 1 API key
    */
    var opts = {
      uri: url,
      method: 'GET',
      headers: {
        "Authorization": "Token " + config.api_key,
        "Accept-Language": "en_US",
        "Content-Type": "application/json"
      }
    }

    setTimeout(fetch, ((parseInt(x)+1)*1000), [features[x].properties[config.shapefile_polygon_id], opts]);
  }
}

if (config.debug) {
  end_time = new Date().getTime()
  delta = end_time - start_time
  console.log(delta/1000 + ' seconds')
}

// db.close((error, success) => {
//   if(error !== null) {
//     console.log("Something went wrong closing the database.");
//     return;
//   }
//   console.log(error)
//   console.log(success)
// });

function fetch(args) {
  id = args[0];
  opts = args[1];
  request(opts, (error, response, body) => {
    var input = JSON.parse(body);
    if(error) {
      throw error;
    }

    for(var j in input.times) {
      data = input.times[j];
      if(data.display_name == "uberX") {
        // console.log(new Date().getTime() + ',' + id + ',' + data.estimate)
        db.serialize(() => {
          db.run('INSERT INTO uberx VALUES(?, ?, ?);', [new Date().getTime(), id, data.estimate]);
        })
        // console.log(id + "- timestamp: " + new Date().getTime() + " ETA: " + data.estimate)
      }
      // var cur = new Date().toUTCString() + "," + id + "," + input.times[j].display_name + "," + input.times[j].estimate + "," + JSON.stringify(body) + "\r\n";
    }
  });
}
