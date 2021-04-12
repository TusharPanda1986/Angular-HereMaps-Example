import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { Constants } from '../Constants';
import { Coordinate } from '../Coordinate';
import { RouteCoordinate } from '../RouteCoordinate';
declare var H: any;

@Component({
  selector: 'app-playback',
  templateUrl: './playback.component.html',
  styleUrls: ['./playback.component.scss']
})
export class PlaybackComponent implements OnInit, AfterViewInit, OnDestroy {
  private playButton: any;
  private pauseButton: any;
  private slider: any;
  private sliderEnd: any;
  private sliderStart: any;
  private statusLabel: any;

  @ViewChild('map') mapElement!: ElementRef;

  private platform: any;
  private localUi: any;
  private map: any;
  private trackPoints: RouteCoordinate[] = [];
  private timeToCoordMap = new Map();
  private coordToTimeMap = new Map<string, number[]>();
  private EXECUTION_TYPE = {
    PLAY: 'play',
    PAUSE: 'pause',
    NEXT: 'next',
    PREV: 'prev'
  };
  private currentExecutionType = this.EXECUTION_TYPE.PAUSE;
  private svg = `<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" width="10px" height="10px">
  <circle cx="5" cy="5" r="4" fill="rgb(250, 127, 0)" stroke-width="1" stroke="black" opacity="1"/>
  </svg>`;
  private icon = new H.map.DomIcon(this.svg);
  private points: Coordinate[] = [];
  private allPoints: Coordinate[] = [];
  private currentTimeStamp = 0;
  private currentCoordinate: Coordinate;
  private initPoint: RouteCoordinate;
  private startCoord: RouteCoordinate;
  private imageMarker: any;
  private index = 0;
  private initValue = 0;
  private totalDistance = 0;
  private totalTime = 0;
  private totalTimeBasedOnInput: number;
  private timeToSkip: number;
  private totalPoints = 0;
  private calculate: any;
  private timerId: any;
  private processMarkerTimeOut: any;
  private previousTimeStamp = 0;


  constructor() {
    this.trackPoints = Constants.coords;
    this.currentCoordinate = new Coordinate(this.trackPoints[0].lat, this.trackPoints[0].lng);
    this.initPoint = this.trackPoints[0];
    this.startCoord = this.trackPoints[0];
    this.trackPoints.forEach(i =>
      this.addValueToCoordToTimeMap(i.lat.toPrecision(7) + ',' + i.lng.toPrecision(7),
        i.positionDateTime - this.initPoint.positionDateTime));
    this.totalTimeBasedOnInput = this.trackPoints[this.trackPoints.length - 1].positionDateTime - this.trackPoints[0].positionDateTime;
    this.timeToSkip = Math.floor(0.1 * this.totalTimeBasedOnInput);
    this.imageMarker = new H.map.DomMarker(this.startCoord, { icon: this.icon });
    this.imageMarker.$id = 'marker';
  }

  addValueToCoordToTimeMap = (ipTextCoordinate: string, ipTime: number) => {
    const arrayReceived = this.coordToTimeMap.get(ipTextCoordinate);
    if (arrayReceived) {
      arrayReceived?.push(ipTime);
    } else {
      this.coordToTimeMap.set(ipTextCoordinate, [ipTime]);
    }
  }

  ngOnInit(): void {
    this.platform = new H.service.Platform({
      apikey: 'A4mAGN4zDl4qA41HXQFQNtdkIf3WVocj1tN2rNCjSZM'
    });
  }

  public ngAfterViewInit(): void {
    this.playButton = document.getElementById('play') as HTMLElement;
    this.pauseButton = document.getElementById('pause') as HTMLElement;
    this.slider = document.getElementById('id_range') as HTMLElement;
    this.sliderEnd = document.getElementById('slider_end') as HTMLElement;
    this.sliderStart = document.getElementById('slider_start') as HTMLElement;
    this.statusLabel = document.getElementById('statusLabel') as HTMLElement;
    this.pauseButton.hidden = true;
    this.sliderStart.innerHTML = this.toHHMMSS('0');

    this.slider.oninput = (e: any) => {
      this.sliderStart.innerHTML = this.toHHMMSS(e.value);
    };

    this.drawMap();
    this.calculateInitialRoute();
    this.map.addObject(this.imageMarker);
  }

  public calculateInitialRoute(): any {
    const viaArray: string[] = [];
    this.trackPoints.slice(1, this.trackPoints.length - 1).forEach((i) => viaArray.push(i.lat + ',' + i.lng));
    const router = this.platform.getRoutingService(null, 8);
    const routeRequestParams = {
      transportMode: 'truck',
      origin: this.trackPoints[0].lat + ',' + this.trackPoints[0].lng,
      destination: this.trackPoints[this.trackPoints.length - 1].lat + ',' + this.trackPoints[this.trackPoints.length - 1].lng,
      via: new H.service.Url.MultiValueQueryParameter(viaArray),
      return: 'polyline,travelSummary'
    };
    router.calculateRoute(
      routeRequestParams,
      this.onInitialSuccess.bind(this),
      this.onError
    );
  }

  public onInitialSuccess(result: any): void {
    const route = result.routes[0];
    this.addSummaryToPanel(route);
    let pointNumber = 0;
    let sectionId = -1;

    route.sections.forEach((section: any) => {
      sectionId++;
      // decode LineString from the flexible polyline
      const linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);
      const current = this.trackPoints[sectionId].positionDateTime;

      this.timeToCoordMap.set(current - this.initPoint.positionDateTime,
        { lat: this.trackPoints[sectionId].lat, lng: this.trackPoints[sectionId].lng });
      this.allPoints.push({ lat: this.trackPoints[sectionId].lat, lng: this.trackPoints[sectionId].lng });
      const next = this.trackPoints[sectionId + 1].positionDateTime;

      this.timeToCoordMap.set(next - this.initPoint.positionDateTime,
        { lat: this.trackPoints[sectionId + 1].lat, lng: this.trackPoints[sectionId + 1].lng });
      const tempCoords: { lat: number, lng: number }[] = [];
      for (let i = 0; i < linestring.X.length - 1; i++) {
        if (linestring.X[i] !== 0 && linestring.X[i + 1] !== 0) {
          pointNumber++;
          const currentCoord = { lat: linestring.X[i], lng: linestring.X[i + 1] };
          this.allPoints.push(currentCoord);
          tempCoords.push(currentCoord);
        }
      }
      const timeGap = Math.floor((next - current) / (tempCoords.length + 2));
      let addedTime = current - this.initPoint.positionDateTime;
      tempCoords.forEach(tempCoord => {
        addedTime += timeGap;
        this.addValueToCoordToTimeMap(tempCoord.lat.toPrecision(7) + ',' + tempCoord.lng.toPrecision(7), addedTime);
        // this.coordToTimeMap.set(tempCoord.lat + ',' + tempCoord.lng, addedTime);
        this.timeToCoordMap.set(addedTime, tempCoord);
      });


      // Create a polyline to display the route:
      const polyline = new H.map.Polyline(linestring, {
        style: {
          lineWidth: 4,
          strokeColor: 'rgba(0, 158, 162, 0.7)'
        }
      });

      this.allPoints.push({
        lat: this.trackPoints[sectionId + 1].lat,
        lng: this.trackPoints[sectionId + 1].lng
      });
      // Add the polyline to the map
      this.map.addObject(polyline);

    });
    this.map.addObject(new H.map.Marker({
      lat: this.trackPoints[this.trackPoints.length - 1].lat,
      lng: this.trackPoints[this.trackPoints.length - 1].lng
    }));
  }

  public onError(error: any): void {
    alert('Can\'t reach the remote server because of error: ' + error);
  }

  addSummaryToPanel = (route: any): void => {
    this.totalTime = 0;
    this.totalDistance = 0;

    route.sections.forEach((section: any) => {
      this.totalDistance += section.travelSummary.length;
      this.totalTime += section.travelSummary.duration;
    });
    const diff = this.trackPoints[this.trackPoints.length - 1].positionDateTime - this.trackPoints[0].positionDateTime;
    this.slider.setAttribute('max', diff.toString());
    const maxTimer = this.trackPoints[this.trackPoints.length - 1].positionDateTime - this.trackPoints[0].positionDateTime;
    this.sliderEnd.innerHTML = this.toHHMMSS(maxTimer.toString());

  }

  // this function is required to calculate the waypoints between the start coordinate and the end coordinate
  public calculateRouteFromAtoB(start: Coordinate, end: Coordinate, viaCoords: string[] = []): any {
    const router = this.platform.getRoutingService(null, 8);
    const routeRequestParams = {
      routingMode: 'fast',
      transportMode: 'car',
      origin: start.lat + ',' + start.lng,
      via: new H.service.Url.MultiValueQueryParameter(viaCoords),
      destination: end.lat + ',' + end.lng,
      return: 'polyline'
    };
    router.calculateRoute(
      routeRequestParams,
      this.onSuccess.bind(this),
      this.onError
    );
  }

  public onSuccess(result: any): void {
    this.addRouteShapeToMap(result.routes[0]);
  }

  public addRouteShapeToMap(route: any): void {
    // clear the points array to store
    this.points.splice(0, this.points.length);
    route.sections.forEach((section: any) => {
      // decode LineString from the flexible polyline
      const linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);

      switch (this.currentExecutionType) {
        case this.EXECUTION_TYPE.NEXT:
          this.map.addObject(new H.map.Polyline(linestring, {
            style: {
              lineWidth: 4,
              strokeColor: 'rgba(0, 128, 255, 0.7)'
            }
          }));
          break;
        case this.EXECUTION_TYPE.PAUSE:
          break;
        case this.EXECUTION_TYPE.PLAY:
          for (let i = 0; i < linestring.X.length - 1; i++) {
            if (linestring.X[i] !== 0 && linestring.X[i + 1] !== 0) {
              this.points.push(new H.geo.Point(linestring.X[i], linestring.X[i + 1]));
              this.totalPoints++;
            }
          }

          break;
        case this.EXECUTION_TYPE.PREV:
          const polyLine = new H.map.Polyline(linestring, {
            style: {
              lineWidth: 4,
              strokeColor: 'rgba(0, 158, 162, 0.7)'
            }
          });
          this.map.addObject(polyLine);
          break;
      }
    });
  }


  public drawMap(): void {
    const defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this.mapElement.nativeElement,
      defaultLayers.raster.normal.map,
      {
        zoom: 12,
        engineType: H.map.render.RenderEngine.EngineType.P2D,
        pixelRatio: window.devicePixelRatio || 1,
        center: { lat: 14.542562, lng: 78.748737 }
      }
    );

    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    behavior.disable(H.mapevents.Behavior.Feature.FRACTIONAL_ZOOM);
    this.localUi = H.ui.UI.createDefault(this.map, defaultLayers);

    this.map.addEventListener('mapviewchangeend', () => {
    });

    window.addEventListener('resize', () => {
      this.map.getViewPort().resize();
    });
  }

  public ngOnDestroy(): void {
    this.map.removeObjects(this.map.getObjects());
  }

  public _start(): void {
    this.currentExecutionType = this.EXECUTION_TYPE.PLAY;
    this.pauseButton.hidden = false;
    this.playButton.hidden = true;

    this.cancelTimeouts();
    // Update start coordinate to the last evaluated coordinate
    this.startCoord = this.trackPoints[this.index];
    // increment index to point at the next coordinate
    this.index = this.index + 1;

    this.plotPath(this.imageMarker.getGeometry(), this.trackPoints[this.index]);
  }

  public _prev(): void {
    const state = this.currentExecutionType;
    this.currentExecutionType = this.EXECUTION_TYPE.PREV;
    this.cancelTimeouts();
    this.currentTimeStamp -= this.timeToSkip;
    if (this.currentTimeStamp < 0) {
      this.currentTimeStamp = 0;
    }
    while (!this.timeToCoordMap.has(this.currentTimeStamp) && this.currentTimeStamp <= this.totalTimeBasedOnInput) {
      this.currentTimeStamp--;
    }
    const coordinateShiftTo = this.timeToCoordMap.get(this.currentTimeStamp);
    const endIndex = this.allPoints.findIndex(coordiante =>
      coordiante.lng === this.currentCoordinate.lng && coordiante.lat === this.currentCoordinate.lat);
    const beginIndex = this.allPoints.findIndex(coordiante =>
      coordiante.lng === coordinateShiftTo.lng && coordiante.lat === coordinateShiftTo.lat);

    const viaCoordinates = this.allPoints.slice(beginIndex, endIndex);
    for (let i = 0; i < viaCoordinates.length - 1; i += 30) {
      const collected = viaCoordinates.slice(i, i + 30);
      const viaArray: string[] = [];
      collected.forEach((j) => viaArray.push(j.lat + ',' + j.lng));
      this.calculateRouteFromAtoB(collected[0], collected[collected.length - 1], viaArray);
    }

    this.imageMarker.setGeometry(coordinateShiftTo);
    this.slider.value = this.currentTimeStamp.toString();

    if (this.EXECUTION_TYPE.PLAY === state) {
      this._start();
    }
  }

  public _next(): void {
    const state = this.currentExecutionType;
    this.currentExecutionType = this.EXECUTION_TYPE.NEXT;
    this.cancelTimeouts();
    this.currentTimeStamp += this.timeToSkip;
    if (this.currentTimeStamp >= this.totalTimeBasedOnInput) {
      this.currentTimeStamp = this.totalTimeBasedOnInput;
    }
    while (!this.timeToCoordMap.has(this.currentTimeStamp) && this.currentTimeStamp <= this.totalTimeBasedOnInput) {
      this.currentTimeStamp++;
    }
    const coordinateShiftTo = this.timeToCoordMap.get(this.currentTimeStamp);
    const beginIndex = this.allPoints.findIndex(coordiante =>
      coordiante.lng === this.currentCoordinate.lng && coordiante.lat === this.currentCoordinate.lat);
    const endIndex = this.allPoints.findIndex(coordiante =>
      coordiante.lng === coordinateShiftTo.lng && coordiante.lat === coordinateShiftTo.lat);

    const viaCoordinates = this.allPoints.slice(beginIndex, endIndex);

    for (let i = 0; i < viaCoordinates.length - 1; i += 30) {
      const collected = viaCoordinates.slice(i, i + 30);
      const viaArray: string[] = [];
      collected.forEach((j) => viaArray.push(j.lat + ',' + j.lng));
      this.calculateRouteFromAtoB(collected[0], collected[collected.length - 1], viaArray);
    }

    this.imageMarker.setGeometry(coordinateShiftTo);
    this.slider.value = this.currentTimeStamp.toString();

    if (this.EXECUTION_TYPE.PLAY === state) {
      this._start();
    }
  }


  public cancelTimeouts(): void {
    if (this.calculate) {
      clearTimeout(this.calculate);
    }
    if (this.processMarkerTimeOut) {
      clearTimeout(this.processMarkerTimeOut);
    }
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  public _pause(): void {
    this.currentExecutionType = this.EXECUTION_TYPE.PAUSE;
    this.pauseButton.hidden = true;
    this.playButton.hidden = false;
    this.cancelTimeouts();
  }


  public plotPath(start: Coordinate, end: Coordinate): void {
    if (start && end) {
      this.calculate = setTimeout(this.calculateRouteFromAtoB(start, end), 500);
      this.initValue = 1;

      this.sleep(500).then(() => {
        this.timerId = setInterval(() => this.processMarkers(), 100);
        this.processMarkerTimeOut = setTimeout(() => clearInterval(this.timerId), 100 * this.points.length);
      });
    }
  }

  public processMarkers(): void {
    if (this.points[this.initValue]) {
      const polylineGeometry = [this.points[this.initValue - 1].lat
        , this.points[this.initValue - 1].lng
        , this.points[this.initValue].lat
        , this.points[this.initValue].lng];

      // Create a polyline to display the route:
      this.map.addObject(new H.map.Polyline(new H.geo.LineString.fromLatLngArray(polylineGeometry), {
        style: {
          lineWidth: 4,
          strokeColor: 'rgba(0, 128, 255, 0.7)'
        }
      }));
      const timeStampIss = { lat: this.points[this.initValue].lat, lng: this.points[this.initValue].lng };
      const coordinateText = timeStampIss.lat.toPrecision(7) + ',' + timeStampIss.lng.toPrecision(7);
      const timeStampReceivedArray = this.coordToTimeMap.get(coordinateText);
      this.currentCoordinate = timeStampIss;
      const timeStampReceived = timeStampReceivedArray?.shift();
      if (timeStampReceived && this.previousTimeStamp <= timeStampReceived) {
        this.previousTimeStamp = timeStampReceived;
        this.slider.value = timeStampReceived;
        this.currentTimeStamp = timeStampReceived;
        this.statusLabel.innerHTML = 'Current location: ' + coordinateText + ' at time : ' + this.toHHMMSS(timeStampReceived.toString());
      }
      this.ease(
        this.points[this.initValue - 1],
        this.points[this.initValue],
        100,
        (coord: any) => {
          this.imageMarker.setGeometry(coord);
          this.map.setCenter(coord);
        }
      );

      if (this.initValue < this.points.length) {
        this.initValue++;
      }
    } else {
      this._start();
    }
  }

  public toHHMMSS(num: string): string {
    const secNum = parseInt(num, 10);
    const hours = Math.floor(secNum / 3600);
    const minutes = Math.floor(secNum / 60) % 60;
    const seconds = secNum % 60;

    return [hours, minutes, seconds]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  }

  public ease(
    startCoord = { lat: 0, lng: 0 },
    endCoord = { lat: 1, lng: 1 },
    durationMs = 200,
    onStep = console.log,
    onComplete = () => { },
  ): void {

    const timeoutFunction = (f: any) => window.setTimeout(f, 16);
    const raf = window.requestAnimationFrame || timeoutFunction;
    const stepCount = durationMs / 16;
    const valueIncrementLat = (endCoord.lat - startCoord.lat) / stepCount;
    const valueIncrementLng = (endCoord.lng - startCoord.lng) / stepCount;
    const sinValueIncrement = Math.PI / stepCount;
    let currentValueLat = startCoord.lat;
    let currentValueLng = startCoord.lng;
    let currentSinValue = 0;

    const step = () => {
      currentSinValue += sinValueIncrement;
      currentValueLat += valueIncrementLat * (Math.sin(currentSinValue) ** 2) * 2;
      currentValueLng += valueIncrementLng * (Math.sin(currentSinValue) ** 2) * 2;

      if (currentSinValue < Math.PI) {
        onStep({ lat: currentValueLat, lng: currentValueLng });
        raf(step);
      } else {
        onStep(endCoord);
        onComplete();
      }
    };

    raf(step);
  }

  public sleep(time: number): any {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

}
