/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Component for rendering a disaster event map type tile.
 */

import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import {
  addMapPoints,
  drawD3Map,
  getProjection,
} from "../../chart/draw_d3_map";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import {
  DATE_OPTION_1Y_KEY,
  DATE_OPTION_6M_KEY,
  DATE_OPTION_30D_KEY,
  URL_HASH_PARAM_KEYS,
} from "../../constants/disaster_event_map_constants";
import {
  EARTH_NAMED_TYPED_PLACE,
  EUROPE_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { isChildPlaceOf } from "../../tools/shared_util";
import {
  DisasterDataOptions,
  DisasterEventMapPlaceInfo,
  DisasterEventPoint,
  MapPointsData,
} from "../../types/disaster_event_map_types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import {
  fetchDateList,
  fetchDisasterEventPoints,
  fetchGeoJsonData,
  getDate,
  getMapPointsData,
  getSeverityFilters,
  getUseCache,
  onPointClicked,
  setUrlHash,
} from "../../utils/disaster_event_map_utils";
import {
  getEnclosedPlacesPromise,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { DisasterEventMapFilters } from "./disaster_event_map_filters";
import { DisasterEventMapSelectors } from "./disaster_event_map_selectors";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";
const CONTENT_SPINNER_ID = "content-spinner-screen";
const CSS_SELECTOR_PREFIX = "disaster-event-map";
// TODO: make this config driven
const REDIRECT_URL_PREFIX = "/disasters/";
const MAP_POINTS_MIN_RADIUS = 1.5;
const MAP_POINTS_MIN_RADIUS_EARTH = 0.8;

interface DisasterEventMapTilePropType {
  // Id for this tile
  id: string;
  // Title for this tile
  title: string;
  // Place to show the event map for
  place: NamedTypedPlace;
  // Place type to show the event map for
  enclosedPlaceType: string;
  // Map of eventType id to EventTypeSpec
  eventTypeSpec: Record<string, EventTypeSpec>;
  // The id of the block the tile is within
  // HACK: assuming that there is only one disaster event map tile per block
  blockId: string;
}

interface MapChartData {
  geoJson: GeoJsonData;
  sources: Set<string>;
  // key is disaster type and value is the map points data for that disaster
  // type
  mapPointsData: Record<string, MapPointsData>;
  // options used when fetching the map chart data
  dataOptions: DisasterDataOptions;
}

export function DisasterEventMapTile(
  props: DisasterEventMapTilePropType
): JSX.Element {
  const svgContainerRef = useRef(null);
  const infoCardRef = useRef(null);
  const europeanPlaces = useRef([]);
  const [dateList, setDateList] = useState([]);
  const [placeInfo, setPlaceInfo] = useState<DisasterEventMapPlaceInfo>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgContainerHeight, setSvgContainerHeight] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const spinnerId = `${props.id}-${CONTENT_SPINNER_ID}`;

  function handleResize(): void {
    // Update svgContainerHeight if svgContainerRef height has changed so that
    // severity filters section is the same height as the map.
    if (svgContainerRef.current) {
      const height = svgContainerRef.current.offsetHeight;
      if (height !== svgContainerHeight) {
        setSvgContainerHeight(height);
      }
    }
  }

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // watch for hash change and re-fetch data whenever hash changes.
    if (!placeInfo) {
      return;
    }

    function handleHashChange(): void {
      fetchMapChartData(placeInfo, props.eventTypeSpec);
      updateDateList(props.eventTypeSpec, placeInfo.selectedPlace.dcid);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [placeInfo, props.eventTypeSpec, mapChartData]);

  useEffect(() => {
    // On initial loading of the component, get list of all European countries
    // and save it in a ref to be used for map drawing.
    getEnclosedPlacesPromise(EUROPE_NAMED_TYPED_PLACE.dcid, "Country").then(
      (resp: Array<NamedPlace>) => {
        europeanPlaces.current = resp;
      }
    );
  }, []);

  useEffect(() => {
    // When props change, update date and place info
    updateDateList(props.eventTypeSpec, props.place.dcid);
    updatePlaceInfo(props.place, props.enclosedPlaceType);
  }, [props]);

  useEffect(() => {
    // When selectedDate, placeInfo, or severity filters change, re-fetch the map chart data.
    if (!placeInfo) {
      return;
    }
    fetchMapChartData(placeInfo, props.eventTypeSpec);
  }, [placeInfo, props.eventTypeSpec]);

  useEffect(() => {
    // When mapChartData has changed and geoJson is not empty, re-draw the map.
    if (mapChartData && !_.isEmpty(mapChartData.geoJson)) {
      const chartHeight = (svgContainerRef.current.offsetWidth * 2) / 5;
      setSvgContainerHeight(chartHeight);
      draw(mapChartData, placeInfo, chartHeight);
    }
    removeSpinner(spinnerId);
  }, [mapChartData]);

  if (!mapChartData) {
    return null;
  }

  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  return (
    <ChartTileContainer
      title={props.title}
      sources={mapChartData.sources}
      replacementStrings={rs}
      className={`${CSS_SELECTOR_PREFIX}-tile`}
      allowEmbed={false}
    >
      <div className={`${CSS_SELECTOR_PREFIX}-container`}>
        {_.isEmpty(mapChartData.geoJson) ? (
          <div className={`${CSS_SELECTOR_PREFIX}-error-message`}>
            Sorry, we do not have maps for this place.
          </div>
        ) : (
          <>
            <div className={`${CSS_SELECTOR_PREFIX}-chart-section`}>
              <div className={`${CSS_SELECTOR_PREFIX}-zoom-button-section`}>
                <div
                  id={ZOOM_IN_BUTTON_ID}
                  className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
                >
                  <i className="material-icons">add</i>
                </div>
                <div
                  id={ZOOM_OUT_BUTTON_ID}
                  className={`${CSS_SELECTOR_PREFIX}-zoom-button`}
                >
                  <i className="material-icons">remove</i>
                </div>
              </div>
              <div
                id={props.id}
                className="svg-container"
                ref={svgContainerRef}
              ></div>
              <div className={`${CSS_SELECTOR_PREFIX}-controls`}>
                <div className={`${CSS_SELECTOR_PREFIX}-legend`}>
                  {Object.values(props.eventTypeSpec).map((spec) => {
                    return (
                      <div
                        className={`${CSS_SELECTOR_PREFIX}-legend-entry`}
                        key={`${props.id}-legend-${spec.id}`}
                      >
                        <div
                          className={`${CSS_SELECTOR_PREFIX}-legend-color`}
                          style={{
                            backgroundColor: spec.color,
                          }}
                        ></div>
                        <span>{spec.name}</span>
                      </div>
                    );
                  })}
                </div>
                <DisasterEventMapSelectors
                  dateOptions={[
                    DATE_OPTION_30D_KEY,
                    DATE_OPTION_6M_KEY,
                    DATE_OPTION_1Y_KEY,
                    ...dateList,
                  ]}
                  onPlaceSelected={(place: NamedPlace) =>
                    redirectAction(place.dcid)
                  }
                  blockId={props.blockId}
                >
                  <div
                    className="filter-toggle"
                    onClick={() => setShowFilters(!showFilters)}
                    title="Toggle filters"
                  >
                    <i className="material-icons">tune</i>
                  </div>
                </DisasterEventMapSelectors>
              </div>
              <div id={`${CSS_SELECTOR_PREFIX}-info-card`} ref={infoCardRef} />
              <div id={spinnerId}>
                <div className="screen">
                  <div id="spinner"></div>
                </div>
              </div>
            </div>
            {showFilters && (
              <DisasterEventMapFilters
                eventTypeSpec={props.eventTypeSpec}
                height={svgContainerHeight}
                blockId={props.blockId}
              />
            )}
          </>
        )}
      </div>
    </ChartTileContainer>
  );

  /**
   * Updates place info given a selectedPlace and enclosedPlaceType
   */
  function updatePlaceInfo(
    selectedPlace: NamedTypedPlace,
    enclosedPlaceType: string
  ): void {
    if (placeInfo && selectedPlace.dcid === placeInfo.selectedPlace.dcid) {
      return;
    }
    getParentPlacesPromise(selectedPlace.dcid).then((parentPlaces) => {
      setPlaceInfo({
        selectedPlace,
        enclosedPlaceType,
        parentPlaces,
      });
    });
  }

  /**
   * Updates date info given an event type spec
   */
  function updateDateList(
    eventTypeSpec: Record<string, EventTypeSpec>,
    selectedPlace: string
  ): void {
    const eventTypeDcids = Object.values(eventTypeSpec).flatMap(
      (spec) => spec.eventTypeDcids
    );
    const useCache = getUseCache();
    if (mapChartData && mapChartData.dataOptions.useCache === useCache) {
      return;
    }
    const currDate = getDate(props.blockId);
    fetchDateList(eventTypeDcids, selectedPlace, useCache)
      .then((dateList) => {
        setDateList(dateList);
        // if current date is not in the new date list, set selected date to be
        // default (1 year).
        if (dateList.findIndex((date) => date == currDate) < 0) {
          setUrlHash(
            URL_HASH_PARAM_KEYS.DATE,
            DATE_OPTION_1Y_KEY,
            props.blockId
          );
        }
      })
      .catch(() => {
        setDateList([]);
        // if empty date list, set selected date to be default (1 year).
        setUrlHash(URL_HASH_PARAM_KEYS.DATE, DATE_OPTION_1Y_KEY, props.blockId);
      });
  }

  /**
   * Fetches the chart data needed for drawing the map
   */
  function fetchMapChartData(
    placeInfo: DisasterEventMapPlaceInfo,
    eventTypeSpec: Record<string, EventTypeSpec>
  ): void {
    const dataOptions = {
      eventTypeSpecs: Object.values(eventTypeSpec),
      selectedDate: getDate(props.blockId),
      severityFilters: getSeverityFilters(eventTypeSpec, props.blockId),
      useCache: getUseCache(),
      place: placeInfo.selectedPlace.dcid,
    };
    const shouldFetchGeoJson =
      !mapChartData ||
      _.isEmpty(mapChartData.geoJson) ||
      mapChartData.geoJson.properties.current_geo !== dataOptions.place;
    const shouldFetchDisasterPoints =
      !mapChartData || !_.isEqual(mapChartData.dataOptions, dataOptions);
    if (!shouldFetchGeoJson && !shouldFetchDisasterPoints) {
      return;
    }
    loadSpinner(spinnerId);
    const geoJsonPromise = shouldFetchGeoJson
      ? fetchGeoJsonData(
          placeInfo.selectedPlace.dcid,
          placeInfo.enclosedPlaceType
        )
      : Promise.resolve(mapChartData.geoJson);
    Promise.all([geoJsonPromise, fetchDisasterEventPoints(dataOptions)])
      .then(([geoJson, disasterEventData]) => {
        const sources = new Set<string>();
        Object.values(disasterEventData.provenanceInfo).forEach((provInfo) => {
          sources.add(provInfo.provenanceUrl);
        });
        const mapPointsData = getMapPointsData(
          disasterEventData.eventPoints,
          props.eventTypeSpec
        );
        setMapChartData({
          geoJson,
          sources,
          mapPointsData,
          dataOptions,
        });
      })
      .catch(() => {
        // TODO: add error message
        setMapChartData(null);
      });
  }

  /**
   * Draws the disaster event map
   */
  function draw(
    mapChartData: MapChartData,
    placeInfo: DisasterEventMapPlaceInfo,
    height: number
  ): void {
    const width = svgContainerRef.current.offsetWidth;
    const zoomParams = {
      zoomInButtonId: ZOOM_IN_BUTTON_ID,
      zoomOutButtonId: ZOOM_OUT_BUTTON_ID,
    };
    document.getElementById(props.id).innerHTML = "";
    const isUsaPlace = isChildPlaceOf(
      placeInfo.selectedPlace.dcid,
      USA_PLACE_DCID,
      placeInfo.parentPlaces
    );
    const projection = getProjection(
      isUsaPlace,
      placeInfo.selectedPlace.dcid,
      width,
      height
    );
    drawD3Map(
      props.id,
      mapChartData.geoJson,
      height,
      width,
      {} /* dataValues: no data values to show on the base map */,
      "" /* units: no units to show */,
      null /* colorScale: no color scale since no data shown on the base map */,
      (geoDcid: GeoJsonFeatureProperties) =>
        redirectAction(geoDcid.geoDcid) /* redirectAction */,
      (place: NamedPlace) => place.name || place.dcid /* getTooltipHtml */,
      () => true /* canClickRegion: allow all regions to be clickable */,
      false /* shouldGenerateLegend: no legend needs to be generated since no data for base map */,
      true /* shouldShowBoundaryLines */,
      projection,
      placeInfo.selectedPlace.dcid,
      "" /* zoomDcid: no dcid to zoom in on */,
      zoomParams
    );
    for (const mapPointsData of Object.values(mapChartData.mapPointsData)) {
      const pointsLayer = addMapPoints(
        props.id,
        mapPointsData.points,
        mapPointsData.values,
        projection,
        (point: DisasterEventPoint) => {
          return props.eventTypeSpec[point.disasterType].color;
        },
        undefined,
        placeInfo.selectedPlace.dcid == EARTH_NAMED_TYPED_PLACE.dcid
          ? MAP_POINTS_MIN_RADIUS_EARTH
          : MAP_POINTS_MIN_RADIUS
      );
      pointsLayer.on("click", (point: DisasterEventPoint) =>
        onPointClicked(
          infoCardRef.current,
          svgContainerRef.current,
          point,
          d3.event
        )
      );
    }
  }

  /**
   * Handles redirecting to the disaster page for a different placeDcid
   */
  function redirectAction(placeDcid: string): void {
    window.open(`${REDIRECT_URL_PREFIX}${placeDcid}`, "_self");
  }
}
