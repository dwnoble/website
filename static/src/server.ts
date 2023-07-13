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

import axios from "axios";
import express, { Request, Response } from "express";
import { JSDOM } from "jsdom";
import _ from "lodash";

import {
  fetchDisasterEventData,
  getBlockEventTypeSpecs,
} from "../js/components/subject_page/disaster_event_block";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import {
  BlockConfig,
  EventTypeSpec,
  TileConfig,
} from "../js/types/subject_page_proto_types";
import { getTileEventTypeSpecs } from "../js/utils/tile_utils";
import { getBarChart, getBarTileResult } from "../nodejs_server/bar_tile";
import { CHART_URL_PARAMS } from "../nodejs_server/constants";
import {
  getDisasterMapChart,
  getDisasterMapTileResult,
} from "../nodejs_server/disaster_map_tile";
import { getLineChart, getLineTileResult } from "../nodejs_server/line_tile";
import { getMapChart, getMapTileResult } from "../nodejs_server/map_tile";
import {
  getRankingChart,
  getRankingTileResult,
} from "../nodejs_server/ranking_tile";
import {
  getScatterChart,
  getScatterTileResult,
} from "../nodejs_server/scatter_tile";
import { TileResult } from "../nodejs_server/types";
import { getSvgXml } from "../nodejs_server/utils";
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
const NS_TO_MS_SCALE_FACTOR = BigInt(1000000);
const MS_TO_S_SCALE_FACTOR = 1000;

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

// Get a list of tile result promises for all the tiles in the block
function getBlockTileResults(
  id: string,
  block: BlockConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  svSpec: Record<string, StatVarSpec>,
  urlRoot: string,
  useChartUrl: boolean
): Promise<TileResult[] | TileResult>[] {
  const tilePromises = [];
  block.columns.forEach((column, colIdx) => {
    column.tiles.forEach((tile, tileIdx) => {
      const tileId = `${id}-col${colIdx}-tile${tileIdx}`;
      let tileSvSpec = null;
      switch (tile.type) {
        case "LINE":
          tileSvSpec = tile.statVarKey.map((s) => svSpec[s]);
          tilePromises.push(
            getLineTileResult(
              tileId,
              tile,
              place,
              tileSvSpec,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
          break;
        case "SCATTER":
          tileSvSpec = tile.statVarKey.map((s) => svSpec[s]);
          tilePromises.push(
            getScatterTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
          break;
        case "BAR":
          tileSvSpec = tile.statVarKey.map((s) => svSpec[s]);
          tilePromises.push(
            getBarTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
          break;
        case "MAP":
          tileSvSpec = svSpec[tile.statVarKey[0]];
          tilePromises.push(
            getMapTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
          break;
        case "RANKING":
          tileSvSpec = tile.statVarKey.map((s) => svSpec[s]);
          tilePromises.push(
            getRankingTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileSvSpec,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
          break;
        default:
          break;
      }
    });
  });
  return tilePromises;
}

// Get a list of tile result promises for all the tiles in the disaster block
function getDisasterBlockTileResults(
  id: string,
  block: BlockConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  urlRoot: string,
  useChartUrl: boolean
): Promise<TileResult>[] {
  const blockEventTypeSpec = getBlockEventTypeSpecs(
    eventTypeSpec,
    block.columns
  );
  const disasterEventDataPromise = fetchDisasterEventData(
    id,
    blockEventTypeSpec,
    place.dcid,
    null,
    CONFIG.apiRoot
  );
  const tilePromises = [];
  block.columns.forEach((column, colIdx) => {
    column.tiles.forEach((tile, tileIdx) => {
      const tileEventTypeSpec = getTileEventTypeSpecs(eventTypeSpec, tile);
      const tileId = `${id}-col${colIdx}-tile${tileIdx}`;
      switch (tile.type) {
        case "DISASTER_EVENT_MAP":
          tilePromises.push(
            getDisasterMapTileResult(
              tileId,
              tile,
              place,
              enclosedPlaceType,
              tileEventTypeSpec,
              disasterEventDataPromise,
              CONFIG.apiRoot,
              urlRoot,
              useChartUrl
            )
          );
        default:
          return null;
      }
    });
  });
  return tilePromises;
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
        place,
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
    case "RANKING":
      return getRankingChart(
        tileConfig,
        place,
        childPlaceType,
        svSpec,
        CONFIG.apiRoot
      );
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

// Get the elapsed time in seconds given the start and end times in nanoseconds.
function getElapsedTime(startTime: bigint, endTime: bigint): number {
  // Dividing bigints will cause decimals to be lost. Therefore, convert ns to
  // ms first and convert that to number type. Then convert the ms to s to get
  // seconds with decimal precision.
  return (
    Number((endTime - startTime) / NS_TO_MS_SCALE_FACTOR) / MS_TO_S_SCALE_FACTOR
  );
}

// Prevents returning 304 status if same GET request gets hit multiple times.
// This is needed for health checks to pass which require a 200 status.
app.disable("etag");

app.get("/nodejs/query", (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  const query = req.query.q;
  const useChartUrl = !!req.query.chartUrl;
  const urlRoot = `${req.protocol}://${req.get("host")}`;
  res.setHeader("Content-Type", "application/json");
  axios
    .post(`${CONFIG.apiRoot}/api/nl/data?q=${query}&detector=heuristic`, {})
    .then((resp) => {
      const nlResultTime = process.hrtime.bigint();
      const mainPlace = resp.data["place"] || {};
      const place = {
        dcid: mainPlace["dcid"],
        name: mainPlace["name"],
        types: [mainPlace["place_type"]],
      };
      const config = resp.data["config"] || {};
      let enclosedPlaceType = "";
      if (
        config["metadata"] &&
        config["metadata"]["containedPlaceTypes"] &&
        !_.isEmpty(place.types)
      ) {
        enclosedPlaceType =
          config["metadata"]["containedPlaceTypes"][place.types[0]] ||
          enclosedPlaceType;
      }

      // If no place, return here
      if (!place.dcid) {
        res.status(200).send({ charts: [] });
        return;
      }

      // Get a list of tile result promises
      const tilePromises: Array<Promise<TileResult[] | TileResult>> = [];
      const categories = config["categories"] || [];
      categories.forEach((category, catIdx) => {
        const svSpec = {};
        for (const sv in category["statVarSpec"]) {
          svSpec[sv] = category["statVarSpec"][sv];
        }
        category.blocks.forEach((block, blkIdx) => {
          const blockId = `cat${catIdx}-blk${blkIdx}`;
          let blockTilePromises = [];
          switch (block.type) {
            case "DISASTER_EVENT":
              blockTilePromises = getDisasterBlockTileResults(
                blockId,
                block,
                place,
                enclosedPlaceType,
                config["metadata"]["eventTypeSpec"],
                urlRoot,
                useChartUrl
              );
              break;
            default:
              blockTilePromises = getBlockTileResults(
                blockId,
                block,
                place,
                enclosedPlaceType,
                svSpec,
                urlRoot,
                useChartUrl
              );
          }
          tilePromises.push(...blockTilePromises);
        });
      });

      // If no tiles return here.
      if (tilePromises.length < 1) {
        res.status(200).send({ charts: [] });
        return;
      }

      Promise.all(tilePromises)
        .then((tileResults) => {
          const filteredResults = tileResults
            .flat(1)
            .filter((result) => result !== null);
          const endTime = process.hrtime.bigint();
          const debug = {
            timing: {
              getNlResult: getElapsedTime(startTime, nlResultTime),
              getTileResults: getElapsedTime(nlResultTime, endTime),
              total: getElapsedTime(startTime, endTime),
            },
            debug: resp.data["debug"] || {},
          };
          res
            .status(200)
            .send(JSON.stringify({ charts: filteredResults, debug }));
        })
        .catch(() => {
          res.status(500).send({ err: "Error fetching data." });
        });
    })
    .catch((error) => {
      console.error("Error making request:\n", error.message);
      res.status(500).send({ err: "Error fetching data." });
    });
});

app.get("/nodejs/chart", (req: Request, res: Response) => {
  const place = _.escape(req.query[CHART_URL_PARAMS.PLACE] as string);
  const enclosedPlaceType = _.escape(
    req.query[CHART_URL_PARAMS.ENCLOSED_PLACE_TYPE] as string
  );
  const svSpec = JSON.parse(
    req.query[CHART_URL_PARAMS.STAT_VAR_SPEC] as string
  );
  // Need to convert encoded # back to #.
  const eventTypeSpecVal = (
    req.query[CHART_URL_PARAMS.EVENT_TYPE_SPEC] as string
  ).replaceAll("%23", "#");
  const eventTypeSpec = JSON.parse(eventTypeSpecVal);
  const tileConfig = JSON.parse(
    req.query[CHART_URL_PARAMS.TILE_CONFIG] as string
  );
  res.setHeader("Content-Type", "text/html");
  getTileChart(tileConfig, place, enclosedPlaceType, svSpec, eventTypeSpec)
    .then((chart) => {
      const img = document.createElement("img");
      img.src = getSvgXml(chart);
      res.status(200).send(img.outerHTML);
    })
    .catch(() => {
      res.status(500).send("Error retrieving chart.");
    });
});

app.get("/nodejs/healthz", (_, res: Response) => {
  res.status(200).send("Node Server Ready");
});

app.listen(Number(CONFIG.port), HOST, () => {
  console.log(`Server is listening on http://${HOST}:${CONFIG.port}`);
});
