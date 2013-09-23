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
