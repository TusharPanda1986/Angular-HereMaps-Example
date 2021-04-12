import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy, OnChanges, SimpleChanges, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Constants } from '../Constants';
import { Coord } from '../coord';
import { GeoCoordinate } from '../GeoCoordinate';

declare var H: any;

@Component({
  selector: 'app-holder',
  templateUrl: './holder.component.html',
  styleUrls: ['./holder.component.scss']
})
export class HolderComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  title = 'here-project';
  private platform: any;
  private localUi: any;
  page = 4;
  coords: Coord[] = [];

  private lat: string | undefined;
  private lng: string | undefined;

  @ViewChild('map')
  mapElement!: ElementRef;

  @ViewChild('latInput') latInput !: ElementRef;
  @ViewChild('lngInput') lngInput !: ElementRef;


  private map: any;
  private result: any[] = [];

  @Input()
  public latitude!: string;

  @Input()
  public longitude!: string;

  private noiseMarkerIcon = '../assets/truckGreen.png';
  private clusterMarkerIcon = '../assets/truckGrey.png';

  public htmlContent = '';

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {
  }

  ngOnInit(): void {
    this.platform = new H.service.Platform({
      apikey: '' // get key from https://developer.here.com/projects
    });

    this.coords = Constants.airports;
  }

  public ngAfterViewInit(): void {
    this.drawMap();

  }

  public ngOnDestroy(): void {
    this.map.removeObjects(this.map.getObjects());
  }

  public drawMap(): void {
    const defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this.mapElement.nativeElement,
      defaultLayers.raster.normal.map,
      {
        zoom: 7,
        engineType: H.map.render.RenderEngine.EngineType.P2D,
        pixelRatio: window.devicePixelRatio || 1,
        center: { lat: 76.531203, lng: -68.703161 }
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

    this.map.addLayer(this.startClustering(this.coords));
    this.map.setZoom(3);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ((changes.latitude && !changes.latitude.isFirstChange()) || (changes.longitude && !changes.longitude.isFirstChange())) {
      this.map.setCenter(new H.geo.Point(changes.latitude.currentValue, changes.longitude.currentValue));
    }
  }

  public startClustering(coords: Coord[]): any {
    const dataPoints = coords.map(i => new H.clustering.DataPoint(i.latitude, i.longitude, 1, ('data: ' + i.latitude + i.longitude)));
    const themeInstance = {
      getClusterPresentation: (cluster: any) => {
        const icon = `
        <div class="tms-cluster">
            <span>${cluster.getWeight()}</span>
        </div>
    `;
        const clusterMarker = new H.map.DomMarker(cluster.getPosition(), {
          icon: new H.map.DomIcon(icon, {
            size: { w: 50, h: 50 },
            anchor: { x: 25, y: 25 }
          }),
          min: cluster.getMinZoom(),
          max: cluster.getMaxZoom()
        });
        clusterMarker.setData(cluster);
        return clusterMarker;
      },
      getNoisePresentation: (noisePoint: any) => {
        const data = noisePoint.getData();
        const noiseMarker = new H.map.Marker(noisePoint.getPosition(), {
          icon: new H.map.Icon(this.noiseMarkerIcon, {
            size: { w: 50, h: 50 },
            anchor: { x: 25, y: 25 }
          }),
          min: noisePoint.getMinZoom()
        });
        noiseMarker.setData(data);
        return noiseMarker;
      }
    };

    const clusteredDataProvider = new H.clustering.Provider(dataPoints, {
      clusteringOptions: {
        eps: 64,
        minWeight: 2
      },
      theme: themeInstance
    });

    clusteredDataProvider.addEventListener('tap', (event: { target: { b: GeoCoordinate; getData: () => any; }; }) => {
      this.result.splice(0, this.result.length);
      const data = event.target.getData();
      if (data.a) {
        this.recursiveEvaluation(data.a);
      } else {
        this.result.push(data);
      }

      this.map.setCenter(event.target.b);
      const bubble = new H.ui.InfoBubble(event.target.b, {
        content: [
          JSON.stringify(this.result)
        ].join('')
      });
      this.localUi.getBubbles().forEach((i: any) => {
        i.close();
      });

      this.localUi.addBubble(bubble);
      //console.log(bubble.getElement());
    }, true);
    return new H.map.layer.ObjectLayer(clusteredDataProvider);
  }

  public recursiveEvaluation(ip: any): void {
    const arr: any[] = Object.entries(ip)
      .filter(i => (i[0] !== 'parent') && typeof (i[1]) !== 'number')
      .map(j => j[1]);
    if (arr.length === 1 && arr[0].constructor.name === 'Array') {
      this.result.push(arr[0][0].data);
    } else {
      arr.forEach(z => this.recursiveEvaluation(z));
    }
  }

  public startClusteringAgain(): void {
    this.onClear();
    this.map.addLayer(this.startClustering(this.coords));
    this.map.setZoom(3);
  }

  public onClear(): void {
    const layers = this.map.getLayers();
    const length = this.map.getLayers().getLength();
    for (let i = length - 1; i > 0; i--) {
      const layerInst = layers.get(i);
      layerInst.dispose();
      layers.remove(layerInst);
    }
  }

  public addMarker(): void {
    this.onClear();
    this.map.addObject(new H.map.Marker({ lat: 48.8567, lng: 2.3508 }));
    this.map.setCenter({ lat: 48.8567, lng: 2.3508 });
  }


  public onSubmit(): void {
    this.lat = this.latInput.nativeElement.value;
    if (this.lat && this.lat.indexOf(',') !== -1) {
      const arr = this.lat.split(',');
      this.lat = arr[0].trim();
      this.lng = arr[1].trim();
      this.latInput.nativeElement.value = this.lat;
      this.lngInput.nativeElement.value = this.lng;
    } else {
      this.lng = this.lngInput.nativeElement.value;
    }

    this.map.setCenter({ lat: this.lat, lng: this.lng });
  }

}
