import { loadModules } from "https://unpkg.com/esri-loader/dist/esm/esri-loader.js";

// Vue.component('loadModules', loadModules);

Vue.component("square", {
  props: ["info"],
  template: `
    <div class="option" v-if="info.title !== 'blank'">
        <p class="option-title">
            {{info.title}}
        </p>
        <div>
            <button v-on:click="$emit('fn', info['funcType'], info[info['funcVal']])" class="action">
                <img :src="'./assets/' + info.title.split('/').join('_') + '.png'" :alt="info.title">
            </button>
            </div>
    </div>
  `,
});

Vue.component("option-title", {
  props: ["info"],
  template: `
    <div class="option-title" v-if="info.title !== 'blank'">
        {{info.title}}
    </div>
  `,
});

Vue.component("option-button", {
  props: ["info"],
  template: `
    <div v-if="info.title !== 'blank'">
        <button v-on:click="$emit('fn', info['funcType'], info[info['funcVal']])" class="action">
            <img :src="'./assets/' + info.title.split('/').join('_') + '.png'" :alt="info.title">
        </button>
    </div>
  `,
});

Vue.component("select-profile", {
  template: "<p>{{ title }}</p>",
  props: ["options"],
});

Vue.component("pop-up", {
  props: ["popup"],
  template: '<div class="popup">{{ title }}</div>',
});

var myThis;

const router = new VueRouter({
  routes: [],
});

var vueApp = new Vue({
  el: "#app",
  router: router,
  data: {
    state: "startup",
    profile: "",
    func: {
      "select profile": function (profile) {
        vueApp.selectProfile(profile);
      },
      move: function (option) {
        router.push({ path: option });
        vueApp.selectOption(option);
      },
      result: function (val) {
        vueApp.selectResult(val);
        window.console.log("result:", val);
      },
      log: function (val) {
        window.console.log(val);
      },
      blank: function () {},
    },
    data: undefined,
    popup: undefined,
    currentLat: undefined,
    currentLon: undefined,
    currentLocation: undefined,
    destLat: undefined,
    destLon: undefined,
    selectedId: undefined,
    foundLocations: [],
    nrShown: 3,
    active: false,
    locationLayer: undefined,
    locationGraphic: undefined,
    bufferGraphic: undefined,
    defaultPopupTemplate: undefined,
    customPopupTemplate: undefined
  },
  computed: {
    console: () => console,
  },

  mounted() {
    myThis = this;
    const req = fetch("./data.json")
      .then((response) => response.json())
      .then((jsonBody) => this.setData(jsonBody.data));

    if (localStorage.getItem("profiel")) {
      this.profile = localStorage.getItem("profiel");
      this.state = "home";
    } else {
      this.state = "profiel";
    }
    this.pushState();

    loadModules(["esri/WebMap", "esri/views/MapView", "esri/widgets/Search", "esri/PopupTemplate", "esri/popup/content/CustomContent"], {
      css: true,
    }).then(([WebMap, MapView, Search, PopupTemplate, CustomContent]) => {
      // create map with the given options
      var webmap = new WebMap({
        portalItem: {
          // autocasts as new PortalItem()
          id: "02e398e2dff6474fbecaa0f8abbd1739", //"e79e52c2af4f46aaa1640d07d1ba7d68"//"02e398e2dff6474fbecaa0f8abbd1739" //"34d3bc90db544a0b9dc08179f21bd46a"//
        },
      });
      // assign map to this view
      this.view = new MapView({
        container: document.getElementById("map"),
        map: webmap,
        popup: {
          defaultPopupTemplateEnabled: true,
          dockEnabled: true,
          dockOptions: {
            buttonEnabled: false,
            breakpoint: false
          },
          collapseEnabled: false,
        }
      });

      this.searchWidget = new Search({
        view: this.view,
        popupEnabled: false,
        resultGraphicEnabled: false,
      });

      this.customPopupTemplate = new PopupTemplate({});

      // const content = new CustomContent({
      //   outFields: ["*"],
      //   creator: function () {
      //     return "Hello World";
      //   }
      // });


      this.view.when(function () {
        // this.defaultPopupTemplate = this.view.popup.popupTemplate;
        vueApp.setLayer();
        vueApp.createPopupTemplate();
      });

      // console.log("Layers: ", vueApp.view.map.layers.items);

      var popup = vueApp.view.popup;
      popup.watch("visible", function(value){
        console.log("Popup visible: ", value);
        if(value) {
          // popup.PopupTemplate = myThis.customPopupTemplate;
          // vueApp.locationLayer.popupTemplate = myThis.customPopupTemplate;
          vueApp.locationLayer.popupTemplate = vueApp.customPopupTemplate;
        } else {
          // popup.PopupTemplate = myThis.defaultPopupTemplate;
          // vueApp.locationLayer.popupTemplate = myThis.defaultPopupTemplate;
          vueApp.locationLayer.popupTemplate = vueApp.defaultPopupTemplate;
        }
      });

      // popup.viewModel.watch("selectedFeature", function(e) {
      //   if(e != null) {
      //     popup.title = "slahdieblah";
      //     console.log("SelectedFeature: ", e);
      //     console.log("OBJECTID: ", e.attributes.OBJECTID);
      //     console.log("Adres: ", e.attributes.Adres);  
      //     console.log("popup: ", popup);
      //     console.log("title: ", popup.title); 
      //   popup.content = "Click a feature on the map to view its attributes";//"<div><button>" + e.attributes.Adres + "</button></div>";
      // }
      // });


      popup.viewModel.on("trigger-action", function (event) {
        if (event.action.id === "show-route") {
          var attributes = popup.viewModel.selectedFeature.attributes;
          // Get the 'website' field attribute
          var address = attributes.Adres;
          // Make sure the 'website' field value is not null
          if (address) {
            if (vueApp.currentLat) {
              var urlParams =
                "?api=1&origin=" +
                vueApp.currentLat +
                "," +
                vueApp.currentLon +
                "&destination=" +
                address +
                "&travelmode=walking";
            } else {
              var urlParams =
                "?api=1&destination=" + address + "&travelmode=walking";
            }
            // Open up a new browser using the URL value in the 'website' field
            if (
              /* if we're on iOS, open in Apple Maps */
              navigator.platform.indexOf("iPhone") != -1 ||
              navigator.platform.indexOf("iPod") != -1 ||
              navigator.platform.indexOf("iPad") != -1
            ) {
              // window.open("maps://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
              window.open("maps://maps.google.com/maps" + urlParams);
            } /* else use Google */ else {
              //window.open("https://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
              window.open("https://www.google.com/maps/dir/" + urlParams);
            }
          }
        } else if (event.action.id === "show-information") {
          vueApp.selectedId =
            popup.viewModel.selectedFeature.attributes.OBJECTID;
          vueApp.showInformation();
        }
      });
    });
  },

  methods: {
    setData: function (data) {
      this.data = data;
    },
    runCode: function () {
      alert("Run Code");
    },
    setLayer: function () {
      // this.defaultPopupTemplate = this.view.popup.popupTemplate;
      this.view.map.layers.forEach(function (layer) {
        layer.popupEnabled = true;
        if (layer.title.includes(vueApp.profile)) {
          vueApp.locationLayer = layer;
          layer.visible = true;
        } else {
          layer.visible = false;
        }
      });

      this.defaultPopupTemplate = vueApp.locationLayer.popupTemplate;

      console.log("vueApp.locationLayer: ", vueApp.locationLayer);

      // vueApp.locationLayer.popupTemplate.actions = [
      //   {
      //     id: "show-route",
      //     image: "assets/directions.png",
      //     title: "Toon route",
      //   },
      //   {
      //     id: "show-information",
      //     image: "assets/info.png",
      //     title: "Toon informatie",
      //   },
      // ];
      if (vueApp.profile) {
        vueApp.setDefinitionExpression(null);
      }
      document.getElementById("map").style.display = "none";
    },
    createPopupTemplate: function () {
      // this.customPopupTemplate = new PopupTemplate({
        this.customPopupTemplate.outFields = ["*"],
        // title: "<a href='https://www.google.com/maps/dir/?api=1&destination={Adres}&travelmode=walking' target='_blank'>ROUTE</a> | <a href='http://maps.google.nl/{Adres}' target='_blank'>INFO</a>",
        this.customPopupTemplate.title = '{Adres}',
        this.customPopupTemplate.content = function (feature) {
          var id = feature.graphic.attributes.OBJECTID;
          // Get the 'website' field attribute
          var address = feature.graphic.attributes.Adres;
          var appUrl = "";
          var urlParams = "";
          // Make sure the 'website' field value is not null
          if (address) {
            if (vueApp.currentLat) {
              urlParams =
                "?api=1&origin=" +
                vueApp.currentLat +
                "," +
                vueApp.currentLon +
                "&destination=" +
                address +
                "&travelmode=walking";
            } else {
              urlParams =
                "?api=1&destination=" + address + "&travelmode=walking";
            }
            // Open up a new browser using the URL value in the 'website' field
            if (
              /* if we're on iOS, open in Apple Maps */
              navigator.platform.indexOf("iPhone") != -1 ||
              navigator.platform.indexOf("iPod") != -1 ||
              navigator.platform.indexOf("iPad") != -1
            ) {
              // window.open("maps://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
              // window.open("maps://maps.google.com/maps" + urlParams);
              appUrl = 'maps://maps.google.com/maps';
            } /* else use Google */ else {
              //window.open("https://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
              // window.open("https://www.google.com/maps/dir/" + urlParams);
              appUrl = 'https://www.google.com/maps/dir/';
            }
          }
          var url = encodeURI(appUrl + urlParams);   //%3Fapi%3D1%26destination%3DKoggelaan+33%2C+Zwolle%26travelmode%3Dwalking';
          var div = document.createElement("div");
          var btnRoute = document.createElement("button");
          btnRoute.innerHTML = "Route";
          btnRoute.alt = "Route";
          btnRoute.style.width = "40%";//"120px";
          btnRoute.style.height = "120px";
          btnRoute.style.margin = "5%";
          btnRoute.style.background = "#094822";
          btnRoute.style.border = "#274c8e";
          btnRoute.style.color = "white";
          btnRoute.style.borderRadius = "2px";
          btnRoute.onclick = () => window.open(url);

          var btnInfo = document.createElement("button");
          btnInfo.innerHTML = "Info";
          btnInfo.alt = "Info";
          btnInfo.style.width = "40%";//"120px";
          btnInfo.style.height = "120px";
          btnInfo.style.margin = "5%";          
          btnInfo.style.background = "#094822";
          btnInfo.style.border = "#274c8e";
          btnInfo.style.color = "white";
          btnInfo.style.borderRadius = "2px";
          vueApp.selectedId = id;
          btnInfo.onclick = () => vueApp.changeFromMapToInfo();

          div.appendChild(btnRoute);
          div.appendChild(btnInfo);
          div.className = "myClass";
          // div.innerHTML = `<input id='buttonId' class='btn btn-primary btn-block' type='button' onclick=window.open('${url}'); value='Route' title='Clickable button in popup'>
          //                   <input id="buttonId2" type="button" v-on:click="runCode()" value="Info">`;
          return div;
        }
      // });
    },
    changeFromMapToInfo: function () {
      vueApp.view.popup.close();
      vueApp.showInformation()
    },
    navigateProfile: function () {
      localStorage.removeItem("profiel");
      this.profile = "";
      this.state = "profiel";
      this.pushState();
    },
    navigateHome: function () {
      if (this.profile == "") {
        this.state = "profiel";
      } else {
        this.state = "home";
      }
      this.pushState();
    },
    navigateStart: function () {
      console.log("navigateStart");
      document.getElementById("info-menu").style.display = "none";
      document.getElementById("info").style.display = "none";
      document.getElementById("search").style.display = "none";
      document.getElementById("menu").style.display = "none";
      document.getElementById("map").style.display = "none";
      document.getElementById("list").style.display = "none";
      document.getElementById("profile").style.display = "grid";
      this.state = "home";
      this.pushState();
    },
    handleFunc: function (callback, val) {
      this.func[callback](val);
    },
    selectProfile: function (profile) {
      this.state = "home";
      this.profile = profile;
      localStorage.setItem("profiel", profile);
      this.setLayer();
      // this.setDefinitionExpression(null);
      this.pushState();
    },
    selectOption: function (option) {
      this.state = option;
      this.pushState();
    },
    selectResult: function (result) {
      // window.alert(`Gekozen profiel: ${this.profile}, gekozen optie: ${result}`);
      // this.state = result;
      // this.pushState();
      // this.selectOption(result);
      this.setDefinitionExpression(result);
      document.getElementById("profile").style.display = "none";
      document.getElementById("menu").style.display = "block";
      document.getElementById("list").style.display = "block";
      document.getElementById("list").innerHTML = "";
    },
    backToHome: function (result) {
      this.state = "home";
    },
    closePopup: function () {
      this.popup = undefined;
    },
    pushState: function () {
      if (this.$route.path === "/" + this.state) {
        return;
      }
      router.push({ path: this.state });
    },
    setDefinitionExpression: function (choice) {
      this.locationLayer.when(function () {
        var definitionExpressions = [];
        // if (vueApp.profile == "Auditieve Beperking"){
        //     // definitionExpressions.push("");
        // }
        // else if (vueApp.profile == "Visuele Beperking"){
        //     // definitionExpressions.push("");
        // }
        // else if (vueApp.profile == "Lichamelijke Beperking"){
        //     definitionExpressions.push("Gehandicaptenparkeerplaats = 'ja'");
        // }
        // else if (vueApp.profile == "Geen Keuze"){
        //     // definitionExpressions.push("");
        // }
        if (choice) {
          for (var i in vueApp.locationLayer.fields) {
            var field = vueApp.locationLayer.fields[i];
            if (field.alias == choice) {
              definitionExpressions.push(field.name + " = 'ja'");
            }
          }
          if (choice == "Bedrijfsgebouwen en Vergaderlocaties") {
            definitionExpressions.push("Bedrijfsverzamelgebouwen = 'ja'");
          }
          // loadModules(["esri/layers/FeatureLayer"], {
          //     css: true
          //   })
          //   .then(([FeatureLayer]) => {
          //     // create map with the given options
          //     var layer = new FeatureLayer({
          //         // URL to the service
          //         url: vueApp.locationLayer.url + "/" + vueApp.locationLayer.layerId
          //       });
          //     console.log(layer);
          // });
        }

        vueApp.locationLayer.definitionExpression = definitionExpressions.join(
          " AND "
        );
        console.log(vueApp.locationLayer.definitionExpression);
      });
    },
    locateUsingCurrentLocation: function () {
      this.active = true;
      console.log("locateUsingCurrentLocation");
      navigator.geolocation.getCurrentPosition(
        this.getLocationsGeolocation,
        this.geolocationError,
        {
          timeout: 500,
          enableHighAccuracy: true,
          maximumAge: 15000,
        }
      );
    },
    locateUsingAddress: function () {
      console.log("locateUsingAddress");
      this.active = true;

      var input = document.getElementById("search-input");
      this.searchWidget.search(input.value).then(function (result) {
        console.log("result: ", result);
        vueApp.currentLat =
          result.results[0].results[0].feature.geometry.latitude;
        vueApp.currentLon =
          result.results[0].results[0].feature.geometry.longitude;
        console.log(vueApp.currentLat, vueApp.currentLon);
        vueApp.getLocations();
      });

      this.goBack();
    },
    goToSearchPage: function () {
      console.log("goToSearchPage");

      document.getElementById("map").style.display = "none";
      document.getElementById("info").style.display = "none";
      document.getElementById("list").style.display = "none";
      document.getElementById("menu").style.display = "none";
      document.getElementById("contact").style.display = "none";
      document.getElementById("search").style.display = "block";
    },
    goToContactPage: function () {
      console.log("goToContactPage");

      document.getElementById("map").style.display = "none";
      document.getElementById("info").style.display = "none";
      document.getElementById("list").style.display = "none";
      document.getElementById("menu").style.display = "none";
      document.getElementById("search").style.display = "none";
      document.getElementById("contact").style.display = "block";
    },
    getLocationsGeolocation: function (geolocation) {
      this.currentLat = geolocation.coords.latitude; //52.078405;//
      this.currentLon = geolocation.coords.longitude; //4.311128;//
      console.log(this.currentLat, this.currentLon);
      this.getLocations();
    },
    getLocations: function () {
      console.log("getLocations");
      this.foundLocations = [];
      this.nrShown = 3;

      loadModules(["esri/geometry/Point", "esri/geometry/geometryEngine"], {
        css: true,
      }).then(([Point, geometryEngine]) => {
        vueApp.currentLocation = new Point({
          latitude: this.currentLat,
          longitude: this.currentLon,
          spatialReference: {
            wkid: 4326,
          },
        });
        var buffer = geometryEngine.geodesicBuffer(
          vueApp.currentLocation,
          500,
          "meters"
        );
        this.intersectBuffer(buffer);
        this.drawBuffer(buffer);
      });
    },
    drawBuffer: function (bufferGeometry) {
      loadModules(["esri/Graphic"], {
        css: true,
      }).then(([Graphic]) => {
        vueApp.view.graphics.remove(vueApp.bufferGraphic);
        vueApp.bufferGraphic = new Graphic({
          geometry: bufferGeometry,
          symbol: {
            type: "simple-fill",
            color: "rgba(0,0,0,.15)",
            outline: {
              color: "rgba(0,0,0,.5)",
              width: 1,
            },
          },
        });
        vueApp.view.graphics.add(vueApp.bufferGraphic);
      });
    },
    intersectBuffer: function (bufferGeometry) {
      console.log("intersectBuffer");

      loadModules(["esri/geometry/Polyline", "esri/geometry/geometryEngine"], {
        css: true,
      }).then(([Polyline, geometryEngine]) => {
        var query = vueApp.locationLayer.createQuery();
        query.geometry = bufferGeometry;
        query.spatialRelationship = "intersects";
        query.outSpatialReference = {
          wkid: 4326,
        };
        vueApp.locationLayer.queryFeatures(query).then(function (response) {
          for (var i in response.features) {
            var feature = response.features[i];
            var line = new Polyline({
              hasZ: false,
              hasM: false,
              paths: [
                [vueApp.currentLocation.y, vueApp.currentLocation.x],
                [feature.geometry.y, feature.geometry.x],
              ],
              spatialReference: {
                wkid: 4326,
              },
            });

            var distance = Math.round(
              geometryEngine.geodesicLength(line, "meters")
            );
            vueApp.foundLocations.push([
              feature.attributes.OBJECTID,
              distance,
              feature,
            ]);
          }
          if (document.getElementById("list").style.display == "block") {
            vueApp.showList();
          } else if (document.getElementById("map").style.display == "flex") {
            vueApp.zoomToLocation();
          }
        });
        // console.log(this.foundLocations);
      });

      // var query = toiletsLayer.createQuery();
      // query.geometry = bufferGeometry;
      // query.spatialRelationship = "intersects";
      // toiletsLayer.queryFeatures(query).then(function (response) {
      //     console.log("Response: ", response);

      //     var allToilets = [];

      // array.forEach(response.features, function (feature) {
      //     // console.log("feature: ", feature);
      //     var line = new Polyline({
      //       hasZ: false,
      //       hasM: false,
      //       paths: [[currentLocation.y, currentLocation.x], [feature.geometry.y, feature.geometry.x]],
      //       spatialReference: {
      //         wkid: 4326
      //       }
      //     });

      //     var distance = Math.round(geometryEngine.geodesicLength(line, "meters"));
      //     allToilets.push([distance, feature]);
      // })
      //     allToilets.sort(sortFunction);
      //     foundToilets = allToilets.slice(0, 3);
      //     console.log("foundToilets: ", foundToilets);
      // });
    },
    sortFunction: function (a, b) {
      if (a[1] === b[1]) {
        return 0;
      } else {
        return a[1] < b[1] ? -1 : 1;
      }
    },
    geolocationError: function (error) {
      console.log("geolocationError: ", error);

      var listElement = document.getElementById("list");
      var noGeolocation = document.createElement("div");
      noGeolocation.innerHTML =
        "Kan huidige locatie niet ophalen. Gebruik de Adres of locatie zoeken functie.";
      noGeolocation.className = "message";
      listElement.appendChild(noGeolocation);
    },
    showList: function () {
      document.getElementById("map").style.display = "none";
      document.getElementById("info").style.display = "none";
      var listElement = document.getElementById("list");
      listElement.style.display = "block";
      listElement.innerHTML = "";
      document.getElementById("btn-show-list").style.display = "none";
      document.getElementById("btn-show-map").style.display = "block";

      if (this.active) {
        if (this.foundLocations.length == 0) {
          var noLocations = document.createElement("div");
          noLocations.innerHTML = "Geen locaties gevonden";
          noLocations.className = "message";
          listElement.appendChild(noLocations);
        } else {
          this.foundLocations.sort(this.sortFunction);
          console.log(this.foundLocations);
          var selectedLocations = this.foundLocations.slice(0, this.nrShown);

          for (var i in selectedLocations) {
            var item = selectedLocations[i];
            console.log(item);
            var id = item[2].attributes.OBJECTID;

            var button = document.createElement("button");
            button.className = "blue-button toilet-button";
            button.setAttribute("name", "toiletButton");
            button.id = id;

            var left = document.createElement("div");
            left.className = "button-left button-content";
            left.innerHTML = item[2].attributes.Naam_Locatie;
            left.id = id;

            var right = document.createElement("div");
            right.className = "button-right button-content";
            right.innerHTML = item[1] + " m";
            right.id = id;
            button.appendChild(left);
            button.appendChild(right);

            const lineBreak = document.createElement("br");
            listElement.appendChild(button);
            listElement.appendChild(lineBreak);

            button.addEventListener("click", function (event) {
              vueApp.selectedId = event.target.id;
              console.log("click!: ", event);
              // console.log("BtnID: ", id);
              vueApp.showInformation();
            });
          }
          if (this.foundLocations.length > this.nrShown) {
            var showMore = document.createElement("div");
            showMore.className = "message";
            showMore.innerHTML = "Meer resultaten tonen...";
            showMore.addEventListener("click", function (event) {
              vueApp.nrShown += 3;
              vueApp.showList();
            });
            listElement.appendChild(showMore);
          }
        }
      }
    },
    showInformation: function () {
      loadModules(["esri/geometry/Polyline", "esri/geometry/geometryEngine"], {
        css: true,
      }).then(([Polyline, geometryEngine]) => {
        console.log("id: ", this.selectedId);
        var item = this.foundLocations.filter(
          (array) => array.indexOf(parseInt(this.selectedId)) == 0
        )[0];
        if (!item) {
          var query = vueApp.locationLayer.createQuery();
          query.where = "OBJECTID = " + this.selectedId;

          vueApp.locationLayer.queryFeatures(query).then(function (response) {
            var feature = response.features[0];
            if (vueApp.currentLocation) {
              var line = new Polyline({
                hasZ: false,
                hasM: false,
                paths: [
                  [vueApp.currentLocation.y, vueApp.currentLocation.x],
                  [feature.geometry.y, feature.geometry.x],
                ],
                spatialReference: {
                  wkid: 4326,
                },
              });

              var distance = Math.round(
                geometryEngine.geodesicLength(line, "meters")
              );
            } else {
              var distance = 0;
            }
            vueApp.showItem([feature.attributes.OBJECTID, distance, feature]);
          });
        } else {
          this.showItem(item);
        }
      });
    },
    showItem: function (item) {
      loadModules(["esri/widgets/Feature"], {
        css: true,
      }).then(([Feature]) => {
        console.log("item: ", item);

        document.getElementById("info-menu").style.display = "block";
        document.getElementById("menu").style.display = "none";

        document.getElementById("info").style.display = "block";
        document.getElementById("list").style.display = "none";
        document.getElementById("map").style.display = "none";

        document.getElementById("button-name").innerHTML =
          item[2].attributes.Naam_Locatie;
        document.getElementById("button-distance").innerHTML = item[1] + " m";

        this.destLat = item[2].geometry.latitude;
        this.destLon = item[2].geometry.longitude;

        var infoDiv = document.getElementById("info-div-content");
        infoDiv.innerHTML = "";

        console.log("view: ", vueApp.view);
        var feature = item[2];
        new Feature({
          graphic: feature,
          view: vueApp.view,
          container: document.getElementById("info-div-content"),
        });
      });
    },
    showMap: function () {
      document.getElementById("map").style.display = "flex";
      document.getElementById("list").style.display = "none";
      document.getElementById("info").style.display = "none";
      document.getElementById("btn-show-list").style.display = "block";
      document.getElementById("btn-show-map").style.display = "none";

      if (this.active) {
        this.view.when(function () {
          vueApp.zoomToLocation();
        });
      }
    },
    zoomToLocation: function () {
      loadModules(["esri/Graphic"], {
        css: true,
      }).then(([Graphic]) => {
        this.view.graphics.remove(vueApp.locationGraphic);
        var markerSymbol = {
          type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
          color: [68, 114, 196],
          outline: {
            // autocasts as new SimpleLineSymbol()
            color: [255, 255, 255],
            width: 2,
          },
        };

        vueApp.locationGraphic = new Graphic({
          geometry: this.currentLocation,
          symbol: markerSymbol,
        });
        this.view.graphics.add(vueApp.locationGraphic);
        this.view.goTo(this.currentLocation);
        this.view.zoom = 17;
      });
    },
    goBack: function () {
      document.getElementById("info-menu").style.display = "none";
      document.getElementById("info").style.display = "none";
      document.getElementById("search").style.display = "none";
      document.getElementById("contact").style.display = "none";
      document.getElementById("menu").style.display = "block";
      if (document.getElementById("btn-show-list").style.display == "block") {
        document.getElementById("map").style.display = "flex";
      } else {
        document.getElementById("list").style.display = "block";
      }
    },
    showRoute: function () {
      console.log("showRoute");
      // var destLat = 52.4181939;
      // var destLon = 6.0896252;
      if (
        /* if we're on iOS, open in Apple Maps */
        navigator.platform.indexOf("iPhone") != -1 ||
        navigator.platform.indexOf("iPod") != -1 ||
        navigator.platform.indexOf("iPad") != -1
      ) {
        // window.open("maps://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
        window.open(
          "maps://maps.google.com/maps?api=1&origin=" +
            this.currentLat +
            "," +
            this.currentLon +
            "&destination=" +
            this.destLat +
            "," +
            this.destLon +
            "&travelmode=walking"
        );
      } /* else use Google */ else {
        //window.open("https://maps.google.com/maps?daddr="+_currentLat+","+_currentLon+"&amp;ll=");
        window.open(
          "https://www.google.com/maps/dir/?api=1&origin=" +
            this.currentLat +
            "," +
            this.currentLon +
            "&destination=" +
            this.destLat +
            "," +
            this.destLon +
            "&travelmode=walking"
        );
      }
    },
    giveFeedback: function (isNewLocation = true) {
      console.log("giveFeedback");
      var locationParameter = "";
      if (!isNewLocation) {
        if (this.foundLocations.length > 0) {
          var item = this.foundLocations.filter(
            (array) => array.indexOf(parseInt(this.selectedId)) == 0
          )[0];
          var nameLocation = item[2].attributes.Naam_Locatie;
          locationParameter = "&field:naam_locatie=" + nameLocation;
        }
      }
      window.open(
        "https://survey123.arcgis.com/share/0510408f6173439cafcd519b431e70b2?portalUrl=https://DDH.maps.arcgis.com" +
          locationParameter
      );
    },
  },
});

router.beforeEach((to, from, next) => {
  if (vueApp.profile === "") {
    vueApp.state = "profiel";
    if (to.path == "/profiel") {
      next();
    }
  } else {
    vueApp.state = to.path.replace("/", "");
    next();
  }
});
