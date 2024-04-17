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

import { ChartEventDetail } from "@datacommonsorg/web-components";
import { css, CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { DataCommonsWebClient } from "@datacommonsorg/client";
import { DATE_HIGHEST_COVERAGE, DATE_LATEST } from "../js/shared/constants";
import { convertArrayAttribute, getApiRoot } from "./utils";

interface ObservationDatesByVariable {
  observationDates: {
    date: string;
    entityCount: {
      count: number;
      facet: string;
    }[];
  }[];
  variable: string;
}
interface ObservationDatesResponse {
  datesByVariable: ObservationDatesByVariable[];
  facets: {
    [facet: string]: {
      importName: string;
      measurementMethod: string;
      provenanceUrl: string;
    };
  };
}

/**
 * Slider web component
 * Broadcasts its value as the specified event name
 *
 * Example usage:
 *
 * <!-- Date slider example  -->
 * <datacommons-slider
 *      max="2023"
 *      min="1950"
 *      publish="dc-year"
 *      value="2023"
 * ></datacommons-slider>
 *
 * <!-- Map that subscribes to slider changes -->
 * <datacommons-map
 *      title="Population"
 *      place="country/USA"
 *      childPlaceType="State"
 *      subscribe="dc-map"
 *      variable="Count_Person"
 * ></datacommons-map>
 */
@customElement("datacommons-slider")
export class DatacommonsSliderComponent extends LitElement {
  static styles: CSSResult = css`
    .container {
      display: flex;
      flex-direction: column;
      margin: 1rem 0;
      padding: 0 24px;
    }
    .row {
      align-items: top;
      display: flex;
      flex-direction: row;
      width: 100%;
    }
    .row.options {
      align-items: center;
      flex-wrap: wrap;
      justify-content: space-between;
      row-gap: 8px;
      .slider-date-footnote {
        color: #777777;
        margin-left: 4px;
      }
    }
    .row.slider {
      margin: 1rem 0 1.5rem;
      .slider-control {
        flex-grow: 1;
        padding: 4px 16px 0;
        input[type="range"] {
          appearance: none;
          background: #e9e9e9;
          flex-grow: 1;
          height: 5px;
          width: 100%;
        }
      }
      .slider-label {
        color: #555;
        font-size: 12px;
        margin: 0 8px;
        padding-top: 12px;
        position: relative;
        .slider-label-text {
          position: absolute;
          width: 100%;
        }
        .slider-label-text-inner {
          position: absolute;
          text-align: center;
          transform: translate(-50%, 0);
        }
      }
      &.disabled {
        /** Hack to get the slider to show up as disabled in chrome */
        z-index: 1;
        input[type="range"]::-webkit-slider-thumb {
          background: #e9e9e9;
        }
      }
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      color: #333;
      input[type="checkbox"] {
        width: 14px;
        margin-right: 8px;
      }
    }
    .label {
      flex-shrink: 0;
      font-weight: 400;
      font-size: 0.8rem;
    }
    .value {
      display: flex;
      justify-content: flex-start;
      font-weight: 500;
      font-size: 11px;
      margin-bottom: 1rem;
    }
    .value-text {
      margin-left: 2px;
    }
    .error {
      color: red;
      font-weight: 400;
      font-family: monospace;
    }
    h4 {
      padding: 0;
      margin: 0;
      font-weight: 400;
      font-size: 14px;
    }
  `;

  /**
   * @deprecated
   * Maximum slider value
   * Deprecated. Use dates property instead.
   */
  @property()
  max: string;

  /**
   * @deprecated
   * Minimum slider value.
   * Deprecated. Use dates property instead
   */
  @property()
  min: string;
  /**
   * Optional: API root to use to fetch data
   * Defaults to https://datacommons.org
   */
  @property()
  apiRoot: string;

  /**
   * Type of child place (ex: State, County)
   */
  @property()
  childPlaceType: string;

  /**
   * Optional: List of date values
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  dates?: string[];

  /**
   * Default starting date for the component
   */
  @property()
  date?: string;

  /**
   * Optional: Header text
   */
  @property()
  header?: string;

  /**
   * DCID of the parent place
   */
  @property()
  parentPlace: string;

  /**
   * Event name to publish on slider change
   */
  @property()
  publish: string;

  /**
   * Initial slider value
   */
  @property()
  value: string;

  /**
   * Statistical variable
   */
  @property()
  variable: string;

  /**
   * Slider date range
   */
  @state()
  private _dates: string[];

  /**
   * Currently selected value
   */
  @state()
  private _errorMessage = "";

  /**
   * Date with highest data coverage
   */
  @state()
  private _highestCoverageDate = "";

  /**
   * Loading indicator
   */
  @state()
  private _isLoading = false;

  /**
   * Set to true to for
   */
  @state()
  private _showLatestAvailableData: boolean;

  /**
   * Currently selected slider value
   */
  @state()
  private _value: number;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.min && this.max) {
      this._dates = [this.min, this.max];
    }
    if (this.dates) {
      this._dates = [...this.dates];
    }
    if (this.value) {
      this._value = Number(this.value);
      if (
        isNaN(this._value) ||
        this._value < 0 ||
        this._value > this._dates.length
      ) {
        this._value = this._dates.length;
      }
    } else {
      this._value = 0;
    }
    this._showLatestAvailableData = false;
    this.fetchObservationDates();
  }

  render(): TemplateResult {
    if (this._isLoading) {
      return html`<div class="container" part="container">Loading...</div>`;
    }
    if (this._errorMessage) {
      return html`
        <div class="container error" part="container">
          <h4>datacommons-slider</h4>
          <div>${this._errorMessage}</div>
        </div>
      `;
    }
    if (!this._dates || this._dates.length === 0) {
      return html`
        <div class="container error" part="container">
          <h4>datacommons-slider</h4>
          <div>
            Please specify either the "dates" attribute or all of the
            attributes: "variable", "parentPlace", and "childPlaceType".
          </div>
        </div>
      `;
    }

    const startDate = this._dates[0];
    const endDate = this._dates[this._dates.length - 1];
    // Normalized slider value as a percent between 0 and 100
    const normalizedSliderValue =
      this._showLatestAvailableData || this._dates.length <= 1
        ? 100
        : (this._value / (this._dates.length - 1)) * 100;

    const dateText = this.getDateText();
    const endDateText = this.getEndDateText();
    const lastDateIndex = this._dates.length - 1;
    const isHighestCoverageDate = dateText === this._highestCoverageDate;

    // Text to show under range slider button.
    // Shows asterisk if showing latest available data or date of highest
    // coverage
    const sliderLabelText = `${
      this._showLatestAvailableData ? endDateText : dateText
    }${isHighestCoverageDate || this._showLatestAvailableData ? "*" : ""}`;
    return html`
      <div class="container" part="container">
        ${this.header
          ? html`<h4 part="header">${this.header}</h4>`
          : this.defaultHeader()}
        <div
          class="row slider ${this._showLatestAvailableData ? "disabled" : ""}"
        >
          <div class="label">${startDate}</div>
          <div class="slider-control">
            <input
              class="slider"
              max="${lastDateIndex}"
              min="0"
              title="${dateText}"
              type="range"
              .value="${this._showLatestAvailableData
                ? lastDateIndex
                : this._value}"
              @change=${this.onSliderChange}
              @input=${this.onSliderInput}
              ?disabled=${this._showLatestAvailableData}
            />
            <div class="slider-label">
              <div
                class="slider-label-text"
                style="left:${normalizedSliderValue}%;"
              >
                <span class="slider-label-text-inner">${sliderLabelText} </span>
              </div>
            </div>
          </div>
          <div class="label">${endDate}</div>
        </div>
        <div class="row options">
          <label class="checkbox-label"
            ><input
              type="checkbox"
              @change=${this.onShowLatestChange}
              ?checked=${this._showLatestAvailableData}
            />
            <span>Show trends summary</span></label
          >
          ${this._showLatestAvailableData
            ? html`<span class="slider-date-footnote"
                >* Trend summary shows latest data for each place</span
              >`
            : isHighestCoverageDate
            ? html`<span class="slider-date-footnote"
                >* Most recent date with highest coverage</span
              >`
            : ""}
        </div>
      </div>
    `;
  }

  private defaultHeader() {
    return html`<h4 part="header">Explore trends over time</h4>`;
  }

  private getDateText() {
    if (this._value < 0 || this._value >= this._dates.length) {
      return "Unknown";
    }
    return this._dates[this._value];
  }

  private getEndDateText() {
    if (this._dates.length === 0) {
      return "Unknown";
    }
    return this._dates[this._dates.length - 1];
  }

  private onSliderChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = Number(target.value);
    this._value = newValue;
    const dateValue =
      this._value < this._dates.length ? this._dates[this._value] : undefined;
    this.dispatchEvent(
      new CustomEvent<ChartEventDetail>(this.publish, {
        bubbles: true,
        detail: {
          property: "date",
          value: dateValue,
        },
      })
    );
  }

  private onSliderInput(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = Number(target.value);
    this._value = newValue;
  }

  private onShowLatestChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    this._showLatestAvailableData = target.checked;
    const dateValue =
      this._value < this._dates.length ? this._dates[this._value] : undefined;
    const dispatchedDateValue = this._showLatestAvailableData
      ? DATE_LATEST
      : dateValue;
    this.dispatchEvent(
      new CustomEvent<ChartEventDetail>(this.publish, {
        bubbles: true,
        detail: {
          property: "date",
          value: dispatchedDateValue,
        },
      })
    );
  }

  private async fetchObservationDates() {
    const apiRoot = getApiRoot(this.apiRoot);
    const dataCommonsWebClient = new DataCommonsWebClient({ apiRoot });
    const apiPath = "api/observation-dates";
    if (!this.parentPlace || !this.childPlaceType || !this.variable) {
      console.log("No place found in the slider");
      return;
    }
    this._isLoading = true;
    const params = new URLSearchParams();
    params.set("parentEntity", this.parentPlace);
    params.set("childType", this.childPlaceType);
    params.set("variable", this.variable);

    const url = `${apiRoot}/${apiPath}?${params.toString()}`;
    const result = await fetch(url);
    const resultObj = (await result.json()) as ObservationDatesResponse;
    this._isLoading = false;

    const highestCoverageResult =
      await dataCommonsWebClient.getObservationsPointWithin({
        parentEntity: this.parentPlace,
        childType: this.childPlaceType,
        variables: [this.variable],
        date: DATE_HIGHEST_COVERAGE,
      });
    this._highestCoverageDate = "";
    const highestCoveragePlaces = Object.keys(
      highestCoverageResult.data[this.variable]
    );
    if (highestCoveragePlaces.length > 0) {
      this._highestCoverageDate =
        highestCoverageResult.data[this.variable][
          highestCoveragePlaces[0]
        ].date;
    }

    if (
      resultObj.datesByVariable.length > 0 &&
      resultObj.datesByVariable[0].observationDates
    ) {
      this._dates = resultObj.datesByVariable[0].observationDates.map(
        (od) => od.date
      );
    } else {
      this._errorMessage = `No date range found for (variable: ${this.variable},  parentPlace: ${this.parentPlace}, childPlaceType: ${this.childPlaceType})`;
    }
    if (!this.date || this.date.toUpperCase() === DATE_LATEST) {
      // Showing "LATEST" available data
      this._showLatestAvailableData = true;
      this._value = this._dates.length - 1;
    } else if (
      this.date.toUpperCase() === DATE_HIGHEST_COVERAGE &&
      this._highestCoverageDate
    ) {
      // Showing "HIGHEST_COVERAGE" data
      const highestCoverageDateIndex = this._dates.indexOf(
        this._highestCoverageDate
      );
      if (highestCoverageDateIndex >= 0) {
        this._value = highestCoverageDateIndex;
      }
    } else {
      // Select a specific date
      const dateIndex = this._dates.indexOf(this.date);
      this._value = dateIndex >= 0 ? dateIndex : this._dates.length - 1;
    }
  }
}
