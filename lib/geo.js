var Terraformer = require('Terraformer');

function toRad(num){
  return num * Math.PI / 180;
}

function gc_distance(point1, point2) {
  var R = 6371000; // m
  var dLat = toRad(point2.coordinates[1]-point1.coordinates[1]);
  var dLon = toRad(point2.coordinates[0]-point1.coordinates[0]);
  var lat1 = toRad(point1.coordinates[1]);
  var lat2 = toRad(point2.coordinates[1]);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

exports.gc_distance = gc_distance;

function create_polygon_from_geo_condition(geo, user_location) {
  response = {
    polygon: false,
    distance: false
  }

  if(geo.geojson) {
    response.polygon = new Terraformer.Polygon(geo.geojson);

    if(user_location) {
      if(user_location.within(response.polygon)) {
        response.distance = 0;
      } else {
        response.distance = 1000000;
        // Find the closest point
        for(var i=0; i<response.polygon.coordinates[0].length; i++) {
          var new_distance = Math.round(gc_distance(user_location, new Terraformer.Point([response.polygon.coordinates[0][i][0], response.polygon.coordinates[0][i][1]])));
          if(new_distance < response.distance) {
            response.distance = new_distance;
          }
        }
      }
    }
  } else if(geo.distance) {
    response.polygon = new Terraformer.Circle([geo.longitude, geo.latitude], geo.distance, 32);

    if(user_location) {
      if(user_location.within(response.polygon)) {
        response.distance = 0;
      } else {
        response.distance = Math.round(gc_distance(user_location, new Terraformer.Point([geo.longitude, geo.latitude])));
      }
    }
  }

  return response;
}

exports.create_polygon_from_geo_condition = create_polygon_from_geo_condition;
