export class RouteCoordinate {
    lng: number;
    lat: number;
    totalDistance: number;
    positionDateTime: number;

    public constructor(lng: number, lat: number, totalDistance: number, positionDateTime: number){
        this.lat = lat;
        this.lng = lng;
        this.totalDistance = totalDistance;
        this.positionDateTime = positionDateTime;
    }
}
