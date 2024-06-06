/**
 * Copyright 2023 Google LLC
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

import express, { Request, Response } from "express";
import { JSDOM } from "jsdom";
import _ from "lodash";
import sharp from "sharp";

import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import {
  EventTypeSpec,
  TileConfig,
} from "../js/types/subject_page_proto_types";
import {
  BARD_CLIENT_URL_PARAM,
  CHART_ID,
  CHART_INFO_PARAMS,
  CHART_PARAMS,
} from "../nodejs_server/constants";
import { getQueryResult } from "../nodejs_server/query";
import { getBarChart, getBarTileResult } from "../nodejs_server/tiles/bar_tile";
import { getDisasterMapChart } from "../nodejs_server/tiles/disaster_map_tile";
import {
  getLineChart,
  getLineTileResult,
} from "../nodejs_server/tiles/line_tile";
import { getMapChart, getMapTileResult } from "../nodejs_server/tiles/map_tile";
import {
  getScatterChart,
  getScatterTileResult,
} from "../nodejs_server/tiles/scatter_tile";
import { decompressChartProps } from "../nodejs_server/tiles/utils";
import { TileResult } from "../nodejs_server/types";

const app = express();
const APP_CONFIGS = {
  local: {
    port: 3030,
    apiRoot: "http://127.0.0.1:8080",
  },
  gke: {
    port: 8080,
    apiRoot: process.env.API_ROOT,
  },
};
const NODE_ENV = process.env.NODE_ENV || "local";
const CONFIG = APP_CONFIGS[NODE_ENV];
const HOST = "0.0.0.0";
// Each value in the array is the width of the character with ascii code of
// array index + 32 for 10px Roboto font.
// This was generated by rendering the array of characters in the correct font
// and size on the website and reading the bounding box width of each of those
// characters.
// To generate the list of characters:
// Array.from(Array(96).keys()).map((idx) => String.fromCharCode(idx + 32))
const CHAR_WIDTHS = [
  0, 2.578125, 3.203125, 6.1640625, 5.6171875, 7.328125, 6.21875, 1.75,
  3.421875, 3.4765625, 4.3125, 5.671875, 1.96875, 2.765625, 2.6328125, 4.125,
  5.6171875, 5.6171875, 5.6171875, 5.6171875, 5.6171875, 5.6171875, 5.6171875,
  5.6171875, 5.6171875, 5.6171875, 2.421875, 2.1171875, 5.0859375, 5.4921875,
  5.2265625, 4.7265625, 8.984375, 6.5234375, 6.2265625, 6.515625, 6.5625,
  5.6875, 5.53125, 6.8125, 7.1328125, 2.7265625, 5.5234375, 6.2734375,
  5.3828125, 8.734375, 7.1328125, 6.875, 6.3125, 6.875, 6.1640625, 5.9375,
  5.96875, 6.484375, 6.3671875, 8.875, 6.2734375, 6.0078125, 5.9921875, 2.65625,
  4.1015625, 2.65625, 4.1796875, 4.515625, 3.09375, 5.4453125, 5.6171875,
  5.234375, 5.640625, 5.3046875, 3.359375, 5.6171875, 5.5078125, 2.4296875,
  2.390625, 5.0703125, 2.4296875, 8.765625, 5.5234375, 5.703125, 5.6171875,
  5.6875, 3.390625, 5.15625, 3.2734375, 5.515625, 4.84375, 7.515625, 4.9609375,
  4.734375, 4.9609375, 3.390625, 2.4375, 3.390625, 6.8046875, 0,
];
// Average width of a 10px Roboto character.
// This was generated by calculating the average from CHAR_WIDTHS.
const CHAR_AVG_WIDTH = 5.0341796875;
// Height of a 10px Roboto character.
const CHAR_HEIGHT = 13;
// The param value for the chartUrl param which indicates using svg
const CHART_URL_PARAM_SVG = "0";
// The param value that indicates the param is truthy.
const URL_PARAM_VALUE_TRUTHY = "1";
// Size of the PNG to return for the chart query
const PNG_WIDTH = 1600;

const dom = new JSDOM(
  `<html><body><div id="dom-id" style="width:500px"></div></body></html>`,
  {
    pretendToBeVisual: true,
  }
);

globalThis.datacommons = {
  root: "",
};

const window = dom.window;
global.document = dom.window.document;

// Gets the length in pixels of a string
function getTextLength(text: string): number {
  if (!text) {
    return 0;
  }
  let length = 0;
  Array.from(text).forEach((c) => {
    const charCode = c.codePointAt(0);
    const arrIdx = charCode - 32;
    if (arrIdx > 0 && arrIdx < CHAR_WIDTHS.length) {
      length += CHAR_WIDTHS[arrIdx];
    } else {
      length += CHAR_AVG_WIDTH;
    }
  });
  return length;
}

(window.Text as any).prototype.getComputedTextLength = function (): number {
  return getTextLength(this.textContent);
};

(window.SVGElement as any).prototype.getComputedTextLength =
  function (): number {
    return getTextLength(this.textContent);
  };

// JSDom does not define SVGTSpanElements, and use SVGElement instead. Defines
// a shim for getBBox which returns width and height of the element.
// This assumes each child text node is a separate line of text rendered
// vertically one after another.
(window.Element as any).prototype.getBBox = function (): DOMRect {
  let width = 0;
  let height = 0;
  const children = this.childNodes;
  for (const child of children) {
    // Width is the max width of all the child nodes.
    width = Math.max(child.getComputedTextLength(), width);
    // Height is the total combined height of all the child nodes.
    height += CHAR_HEIGHT;
  }
  return {
    width,
    height,
    x: 0,
    y: 0,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    toJSON: { ...this },
  };
};

// Gets a promise for a single tile result
function getTileResult(
  id: string,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  svSpec: StatVarSpec[],
  tileConfig: TileConfig
): Promise<TileResult> {
  switch (tileConfig.type) {
    case "LINE":
      return getLineTileResult(
        id,
        tileConfig,
        place,
        svSpec,
        CONFIG.apiRoot,
        "",
        false
      );
    case "SCATTER":
      return getScatterTileResult(
        id,
        tileConfig,
        place,
        enclosedPlaceType,
        svSpec,
        CONFIG.apiRoot,
        "",
        false
      );
    case "BAR":
      return getBarTileResult(
        id,
        tileConfig,
        place.dcid,
        enclosedPlaceType,
        svSpec as any as StatVarSpec[],
        CONFIG.apiRoot,
        "",
        false
      );
    case "MAP":
      return getMapTileResult(
        id,
        tileConfig,
        place,
        enclosedPlaceType,
        svSpec[0],
        CONFIG.apiRoot,
        "",
        false
      );
    default:
      return Promise.resolve(null);
  }
}

// Get the chart html for a tile
function getTileChart(
  tileConfig: TileConfig,
  placeDcid: string,
  childPlaceType: string,
  svSpec: StatVarSpec[],
  eventTypeSpec: Record<string, EventTypeSpec>
): Promise<SVGSVGElement> {
  // The name and types of a place are not used when drawing charts, so just
  // set default values for them.
  const place = {
    dcid: placeDcid,
    name: placeDcid,
    types: [],
  };
  switch (tileConfig.type) {
    case "LINE":
      return getLineChart(tileConfig, place, svSpec, CONFIG.apiRoot);
    case "BAR":
      return getBarChart(
        tileConfig,
        place.dcid,
        childPlaceType,
        svSpec,
        CONFIG.apiRoot
      );
    case "MAP":
      return getMapChart(
        tileConfig,
        place,
        childPlaceType,
        svSpec.length ? svSpec[0] : null,
        CONFIG.apiRoot
      );
    case "SCATTER":
      return getScatterChart(
        tileConfig,
        place,
        childPlaceType,
        svSpec,
        CONFIG.apiRoot
      );
    /* TODO: foreignobject doesn't work with the svg to png converter. Need to
             find a different way to render an svg of the ranking table & then
             re-enable this.
    case "RANKING":
      return getRankingChart(
        tileConfig,
        place,
        childPlaceType,
        svSpec,
        CONFIG.apiRoot
      );*/
    case "DISASTER_EVENT_MAP":
      return getDisasterMapChart(
        tileConfig,
        place,
        childPlaceType,
        eventTypeSpec,
        CONFIG.apiRoot
      );
    default:
      console.log(
        `Chart of type ${_.escape(tileConfig.type)} is not supported.`
      );
      return Promise.resolve(null);
  }
}

// Prevents returning 304 status if same GET request gets hit multiple times.
// This is needed for health checks to pass which require a 200 status.
app.disable("etag");

app.get("/nodejs/query", (req: Request, res: Response) => {
  const query = req.query.q as string;
  const useChartUrl = req.query.chartUrl !== CHART_URL_PARAM_SVG;
  // If the value for allCharts param is truthy, we should return all charts.
  // Otherwise, return QUERY_MAX_RESULTS number of charts.
  const allResults = req.query.allCharts === URL_PARAM_VALUE_TRUTHY;
  // If coming from an API proxy, need to get the original protocol and host
  // from the request headers
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const apikey = (req.query.apikey as string) || "";
  const urlRoot = `${protocol}://${host}`;
  const client = (req.query.client as string) || BARD_CLIENT_URL_PARAM;
  const mode = (req.query.mode as string) || "";
  const varThreshold = (req.query.varThreshold as string) || "";
  const wantRelatedQuestions = req.query.relatedQ === URL_PARAM_VALUE_TRUTHY;
  getQueryResult(
    query,
    useChartUrl,
    allResults,
    CONFIG.apiRoot,
    apikey,
    urlRoot,
    client,
    mode,
    varThreshold,
    wantRelatedQuestions
  ).then((result) => {
    res.setHeader("Content-Type", "application/json");
    if (result.err) {
      res.status(500).send(result);
    } else {
      res.status(200).send(JSON.stringify(result));
    }
  });
});

app.get("/nodejs/chart", (req: Request, res: Response) => {
  const chartProps = decompressChartProps(
    req.query[CHART_PARAMS.PROPS] as string
  );
  const useSvgFormat =
    req.query[CHART_PARAMS.AS_SVG] === URL_PARAM_VALUE_TRUTHY;
  const contentType = useSvgFormat ? "image/svg+xml" : "image/png";
  res.setHeader("Content-Type", contentType);
  getTileChart(
    chartProps.tileConfig,
    chartProps.place,
    chartProps.enclosedPlaceType,
    chartProps.statVarSpec,
    chartProps.eventTypeSpec
  )
    .then((chart) => {
      if (useSvgFormat) {
        res.status(200).send(chart.outerHTML);
      } else {
        sharp(Buffer.from(chart.outerHTML))
          .resize(PNG_WIDTH)
          .png()
          .toBuffer()
          .then((chartPng) => {
            res.status(200).send(chartPng);
          })
          .catch((error) => {
            console.log("Error getting png:\n", error.message);
            res.status(500).send(null);
          });
      }
    })
    .catch((error) => {
      console.log("Error making request:\n", error.message);
      res.status(500).send(null);
    });
});

// TODO: come up with better params
app.get("/nodejs/chart-info", (req: Request, res: Response) => {
  const place = _.escape(req.query[CHART_INFO_PARAMS.PLACE] as string);
  const enclosedPlaceType = _.escape(
    req.query[CHART_INFO_PARAMS.ENCLOSED_PLACE_TYPE] as string
  );
  const svSpec = JSON.parse(
    req.query[CHART_INFO_PARAMS.STAT_VAR_SPEC] as string
  );
  const tileConfig = JSON.parse(
    req.query[CHART_INFO_PARAMS.TILE_CONFIG] as string
  );
  res.setHeader("Content-Type", "application/json");
  const namedTypedPlace = { dcid: place, name: place, types: [] };
  getTileResult(
    CHART_ID,
    namedTypedPlace,
    enclosedPlaceType,
    svSpec,
    tileConfig
  )
    .then((tileResult) => {
      res.status(200).send(JSON.stringify(tileResult));
    })
    .catch(() => {
      res.status(500).send({ err: "Error fetching data." });
    });
});

app.get("/nodejs/healthz", (_, res: Response) => {
  res.status(200).send("Node Server Ready");
});

app.listen(Number(CONFIG.port), HOST, () => {
  console.log(`Server is listening on http://${HOST}:${CONFIG.port}`);
});
