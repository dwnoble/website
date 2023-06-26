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
 * A container for any tile containing a chart.
 */

import axios from "axios";
import React, { useContext, useRef, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { INITAL_LOADING_CLASS } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { NlSessionContext } from "../../shared/context";
import {
  formatString,
  getChartTitle,
  getMergedSvg,
  ReplacementStrings,
} from "../../utils/tile_utils";
import { ChartFooter } from "./chart_footer";
interface ChartTileContainerProp {
  title: string;
  sources: Set<string>;
  children: React.ReactNode;
  replacementStrings: ReplacementStrings;
  // Whether or not to allow chart embedding action.
  allowEmbed: boolean;
  // callback function for getting the chart data as a csv. Only used for
  // embedding.
  getDataCsv?: () => string;
  // Extra classes to add to the container.
  className?: string;
  // Whether or not this is the initial loading state.
  isInitialLoading?: boolean;
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const nlSessionId = useContext(NlSessionContext);
  const containerRef = useRef(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const [isThumbClicked, setIsThumbClicked] = useState(false);

  // on initial loading, hide the title text
  const title = !props.isInitialLoading
    ? getChartTitle(props.title, props.replacementStrings)
    : "";
  const showEmbed = props.allowEmbed && !props.isInitialLoading;
  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ${
        props.className ? props.className : ""
      }`}
      ref={containerRef}
    >
      <div
        className={`chart-content ${
          props.isInitialLoading ? INITAL_LOADING_CLASS : ""
        }`}
      >
        {
          /* If props.title is not empty, we want to render this header element
              even if title is empty to keep the space on the page */
          props.title && <h4>{title}</h4>
        }
        {props.children}
      </div>
      <ChartFooter
        sources={props.sources}
        handleEmbed={showEmbed ? handleEmbed : null}
      />

      {nlSessionId && (
        <div className="nl-feedback">
          <span
            className={`thumb-down ${isThumbClicked ? "thumb-dim" : ""}`}
            onClick={() => {
              if (isThumbClicked) {
                return;
              }
              setIsThumbClicked(true);
              axios.post("/api/nl/feedback", {
                sessionId: nlSessionId,
                feedbackData: {}, // TODO: get useful information and fill here.
              });
            }}
          >
            &#128078;
          </span>
        </div>
      )}

      {showEmbed && <ChartEmbed ref={embedModalElement} />}
    </div>
  );

  // Handle when chart embed is clicked .
  function handleEmbed(): void {
    const chartTitle = props.title
      ? formatString(props.title, props.replacementStrings)
      : "";
    const { svgXml, height, width } = getMergedSvg(containerRef.current);
    embedModalElement.current.show(
      svgXml,
      props.getDataCsv ? props.getDataCsv() : "",
      width,
      height,
      "",
      chartTitle,
      "",
      Array.from(props.sources)
    );
  }
}
