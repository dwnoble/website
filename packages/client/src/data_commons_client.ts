/**
 * Copyright 2024 Google LLC
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
 * Data Commons Client for fetching data as CSV, JSON, and GeoJSON.
 */

import rewind from "@turf/rewind";
import { Feature, FeatureCollection, Geometry } from "geojson";
import * as _ from "lodash";

import {
  DataRow,
  EntityGroupedDataRow,
  GetDataRowsParams,
  GetGeoJSONParams,
  NodePropValues,
  QuotientObservation,
} from "./data_commons_client_types";
import { DataCommonsWebClient } from "./data_commons_web_client";
import {
  Observation,
  PointApiResponse,
  Series,
  SeriesApiResponse,
  StatMetadata,
} from "./data_commons_web_client_types";
import {
  computeRatio,
  dataRowsToCsv,
  encodeCsvRow,
  flattenNestedObject,
} from "./utils";

// Total population stat var
const TOTAL_POPULATION_VARIABLE = "Count_Person";
// Name attribute for entities and variables
const NAME_ATTRIBUTE = "name";
// ISO 3166-2 code property name for place entities
const ISO_CODE_ATTRIBUTE = "isoCode";
// Fetch these entity and variable properties by default
const DEFAULT_ENTITY_PROPS = [NAME_ATTRIBUTE, ISO_CODE_ATTRIBUTE];
const DEFAULT_VARIABLE_PROPS = [NAME_ATTRIBUTE];
// GeoJSON is stored in this property name by default
export const DEFAULT_GEOJSON_PROPERTY_NAME = "geoJsonCoordinatesDP1";
// Delimit fields
export const DEFAULT_FIELD_DELIMITER = ".";

export interface DatacommonsClientParams {
  /** Web api root endpoint. Default: `"https://datacommons.org/"` */
  apiRoot?: string;
}

class DataCommonsClient {
  apiRoot?: string;
  webClient: DataCommonsWebClient;

  constructor(params?: DatacommonsClientParams) {
    const p = params || {};
    this.apiRoot = p.apiRoot
      ? p.apiRoot.replace(/\/$/, "")
      : "https://datacommons.org";
    this.webClient = new DataCommonsWebClient({
      apiRoot: this.apiRoot,
    });
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities as CSV.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsv(params: GetDataRowsParams): Promise<string> {
    const dataRows = await this.getDataRows(params);
    return dataRowsToCsv(dataRows, params.fieldDelimiter);
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities as CSV. Each result row has data about a single entity and all
   * requested variable observations
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsvGroupedByEntity(params: GetDataRowsParams): Promise<string> {
    const dataRows = await this.getDataRowsGroupedByEntity(params);
    return dataRowsToCsv(dataRows, params.fieldDelimiter);
  }

  /**
   * Fetches most recent data commons observation(s) about an entity or
   * entities as GeoJSON.
   *
   * Uses "geoJsonCoordinatesDP1" node property to fetch GeoJSON by default.
   *
   * @param params {GetGeoJSONParams} Entities and variables to fetch data for
   * @returns GeoJSON object
   */
  async getGeoJSON(params: GetGeoJSONParams): Promise<FeatureCollection> {
    const geoJsonProperty =
      params.geoJsonProperty || DEFAULT_GEOJSON_PROPERTY_NAME;
    const dataRows = await this.getDataRowsGroupedByEntity({
      ...params,
      entityProps: [
        geoJsonProperty,
        ...(params.entityProps || DEFAULT_ENTITY_PROPS),
      ],
    });
    const fieldDelimiter = params.fieldDelimiter || DEFAULT_FIELD_DELIMITER;

    // Rewind geometries by default
    const shouldRewind = params.rewind === undefined || params.rewind;

    const geoJson: FeatureCollection = {
      features: dataRows
        .filter((dataRow) => {
          const geometryString = dataRow.entity.properties[geoJsonProperty];
          return typeof geometryString === "string";
        })
        .map((dataRow) => {
          const geometryString = dataRow.entity.properties[
            geoJsonProperty
          ] as string;
          const geometry = JSON.parse(geometryString) as Geometry;
          const dataRowCopy = _.cloneDeep(dataRow);
          delete dataRowCopy.entity.properties[geoJsonProperty];
          const feature: Feature = {
            geometry,
            properties: flattenNestedObject(dataRowCopy, fieldDelimiter),
            type: "Feature",
          };
          if (feature.geometry && shouldRewind) {
            return rewind(feature, { reverse: true });
          }
          return feature;
        }),
      type: "FeatureCollection",
    };
    return geoJson;
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities. Each result row has data about a single entity and single variable
   * observation
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns Data rows list
   */
  async getDataRows(params: GetDataRowsParams): Promise<DataRow[]> {
    // Fetch variable observations
    const pointApiResponse =
      "parentEntity" in params
        ? await this.webClient.getObservationsPointWithin(params)
        : await this.webClient.getObservationsPoint(params);
    if (!pointApiResponse) {
      return [];
    }
    const entityDcids =
      this.getEntityDcidsFromObservationApiResponse(pointApiResponse);
    // Fetch relevant entity and variable property values
    const entityPropValues = await this.getNodePropValues(
      entityDcids,
      params.entityProps || DEFAULT_ENTITY_PROPS
    );
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );
    const perCapitaPropValues = !_.isEmpty(params.perCapitaVariables)
      ? await this.getNodePropValues(
          [TOTAL_POPULATION_VARIABLE],
          DEFAULT_VARIABLE_PROPS
        )
      : ({} as NodePropValues);

    // Fetch population data for per capita calculations
    let populationObservations: SeriesApiResponse = { data: {}, facets: {} };
    if (!_.isEmpty(params.perCapitaVariables)) {
      populationObservations =
        "parentEntity" in params
          ? await this.webClient.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            })
          : await this.webClient.getObservationsSeries({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            });
    }
    const rows = this.getDataRowsFromPointObservations(
      entityDcids,
      params.variables,
      pointApiResponse,
      entityPropValues,
      variablePropValues,
      perCapitaPropValues,
      populationObservations
    );
    return Promise.resolve(rows);
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities. Each result row has data about a single entity and all requested
   * variable observations
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns List of data rows grouped by entity
   */
  async getDataRowsGroupedByEntity(
    params: GetDataRowsParams
  ): Promise<EntityGroupedDataRow[]> {
    // Fetch data rows with one entity and variable observation per row
    const dataRows = await this.getDataRows(params);

    // Group rows by entity dcid
    const dataRowsGroupedByEntityDcid = _.groupBy(
      dataRows,
      (r) => r.entity.dcid
    );

    // Fetch variable property values for filling in empty entity variables
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );

    // Combine grouped rows into `EntityGroupedDataRow`s
    const entityGroupedDataRows: EntityGroupedDataRow[] = [];
    Object.keys(dataRowsGroupedByEntityDcid).forEach((entityDcid) => {
      const variablesSet = new Set(params.variables);
      const dataRows = dataRowsGroupedByEntityDcid[entityDcid];
      const entityGroupedDataRow: EntityGroupedDataRow = {
        entity: dataRows[0].entity,
        variables: {},
      };
      dataRows.forEach((dataRow) => {
        variablesSet.delete(dataRow.variable.dcid);
        entityGroupedDataRow.variables[dataRow.variable.dcid] =
          dataRow.variable;
      });
      // Add empty variable entries if this entity had no applicable values
      variablesSet.forEach((variableDcid) => {
        entityGroupedDataRow.variables[variableDcid] = {
          dcid: variableDcid,
          observation: {
            date: null,
            metadata: {},
            value: null,
          },
          properties: {
            name: "",
          },
        };
        Object.keys(variablePropValues).forEach((propName) => {
          entityGroupedDataRow.variables[variableDcid].properties[propName] =
            variablePropValues[propName][variableDcid];
        });
      });
      entityGroupedDataRows.push(entityGroupedDataRow);
    });
    return entityGroupedDataRows;
  }

  /**
   * Fetches all Data Commons variable observation about an entity or entities
   * as CSV. Each result row has data about a single entity and single variable
   * observation.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsvSeries(params: GetDataRowsParams): Promise<string> {
    const dataRows = await this.getDataRowSeries(params);
    if (dataRows.length === 0) {
      return "";
    }

    const flattenedDataRows = dataRows.map((dataRow) =>
      flattenNestedObject(dataRow, params.fieldDelimiter)
    );

    const header = Object.keys(flattenedDataRows[0]).sort();
    const rows = flattenedDataRows.map((flattenedDataRow) =>
      header.map((column) => flattenedDataRow[column])
    );
    const csvRows = [header, ...rows];
    const csvLines = csvRows.map(encodeCsvRow);
    return csvLines.join("\n");
  }

  /**
   * Fetches data commons observation series about an entity or entities. Each
   * result row has data about a single entity and single variable observation.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns Data rows list
   */
  async getDataRowSeries(params: GetDataRowsParams): Promise<DataRow[]> {
    // Fetch variable observations
    const seriesApiResponse =
      "parentEntity" in params
        ? await this.webClient.getObservationsSeriesWithin(params)
        : await this.webClient.getObservationsSeries(params);
    if (!seriesApiResponse) {
      return [];
    }
    const entityDcids =
      this.getEntityDcidsFromObservationApiResponse(seriesApiResponse);
    // Fetch relevant entity and variable property values
    const entityPropValues = await this.getNodePropValues(
      entityDcids,
      params.entityProps || DEFAULT_ENTITY_PROPS
    );
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );
    const perCapitaPropValues = !_.isEmpty(params.perCapitaVariables)
      ? await this.getNodePropValues(
          [TOTAL_POPULATION_VARIABLE],
          DEFAULT_VARIABLE_PROPS
        )
      : ({} as NodePropValues);

    // Fetch population data for per capita calculations
    let populationObservations: SeriesApiResponse = { data: {}, facets: {} };
    if (!_.isEmpty(params.perCapitaVariables)) {
      populationObservations =
        "parentEntity" in params
          ? await this.webClient.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            })
          : await this.webClient.getObservationsSeries({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            });
    }
    const dataRows = this.getDataRowsFromSeriesObservations(
      entityDcids,
      params.variables,
      seriesApiResponse,
      entityPropValues,
      variablePropValues,
      perCapitaPropValues,
      populationObservations
    );

    return Promise.resolve(dataRows);
  }

  /**
   * Fetches the first node property value for the given property name
   * @param params.dcids List of dcids to fetch property values for
   * @param params.prop Property name to fetch
   */
  async getFirstNodeValues(params: {
    dcids: string[];
    prop: string;
  }): Promise<Record<string, string | null>> {
    const nodePropvals = await this.webClient.getNodePropvals(params);
    const nodeValues: Record<string, string | null> = {};
    Object.keys(nodePropvals).forEach((nodeDcid) => {
      nodeValues[nodeDcid] =
        nodePropvals[nodeDcid].length > 0
          ? nodePropvals[nodeDcid][0].value
          : null;
    });
    return nodeValues;
  }

  /**
   * Fetches node properties from the provided list of dcids
   * @param dcids node dcids
   * @param props properties to fetch
   * @returns Nested object mapping property names to dcids to values
   */
  private async getNodePropValues(
    dcids: string[],
    props: string[]
  ): Promise<NodePropValues> {
    if (dcids.length === 0 || props.length === 0) {
      return {};
    }
    const nodePropValues: NodePropValues = {};
    for (const propName of props) {
      nodePropValues[propName] = await this.getFirstNodeValues({
        dcids,
        prop: propName,
      });
    }
    return nodePropValues;
  }

  /**
   * Find the observation with the closest date to targetDate
   * @param observations sorted observations
   * @param targetDate date string
   * @returns closest observation or undefined if no observations are given
   */
  private getClosestObservationToDate(
    observations: Observation[],
    targetDate: string
  ): Observation | undefined {
    // If no target date is passed in, return the most recent observation
    if (!targetDate) {
      return observations[observations.length - 1];
    }
    const index = _.sortedIndexBy(
      observations,
      { value: 0, date: targetDate },
      (o) => o.date
    );
    return observations[index];
  }

  /**
   * Returns all entity DCIDs found in the given PointApiResponse
   * @param apiResponse
   * @returns entity DCIDs
   */
  private getEntityDcidsFromObservationApiResponse(
    apiResponse: PointApiResponse | SeriesApiResponse
  ): string[] {
    const allEntityDcids = new Set<string>();
    Object.keys(apiResponse.data).forEach((variableDcid) => {
      Object.keys(apiResponse.data[variableDcid]).forEach((entityDcid) => {
        allEntityDcids.add(entityDcid);
      });
    });
    return Array.from(allEntityDcids);
  }

  /**
   * Enriches PointApiResponse and converts response into a list of `DataRow`s
   * @param entityDcids Entity DCIDs
   * @param variableDcids Variable DCIDs
   * @param pointApiResponse Entity/variable observations
   * @param entityPropValues Additional entity properties to fetch
   * @param variablePropValues Additional variable properties to fetch
   * @param populationObservations Population observations for our list of entities for per-capita calculations
   * @returns data rows
   */
  private getDataRowsFromPointObservations(
    entityDcids: string[],
    variableDcids: string[],
    pointApiResponse: PointApiResponse,
    entityPropValues: NodePropValues,
    variablePropValues: NodePropValues,
    perCapitaPropValues: NodePropValues,
    populationObservations: SeriesApiResponse
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      variableDcids.forEach((variableDcid) => {
        const observation =
          pointApiResponse.data[variableDcid][entityDcid] || {};
        if (_.isEmpty(observation)) {
          return;
        }
        const facet = _.get(
          pointApiResponse.facets,
          observation.facet || "",
          {} as StatMetadata
        );

        const row: DataRow = {
          entity: {
            dcid: entityDcid,
            properties: {
              name: _.get(
                _.get(entityPropValues, NAME_ATTRIBUTE, {}),
                entityDcid,
                ""
              ),
            },
          },
          variable: {
            dcid: variableDcid,
            properties: {
              name: _.get(
                _.get(variablePropValues, NAME_ATTRIBUTE, {}),
                variableDcid,
                ""
              ),
            },
            observation: {
              date: observation.date,
              metadata: {
                unit: _.get(facet, "unit", null),
                unitDisplayName: _.get(
                  observation,
                  "unitDisplayName",
                  _.get(facet, "unitDisplayName", null)
                ),
              },
              value: observation.value,
            },
          },
        };
        Object.keys(entityPropValues).forEach((entityProp) => {
          row.entity.properties[entityProp] =
            entityPropValues[entityProp][entityDcid];
        });
        Object.keys(variablePropValues).forEach((variableProp) => {
          row.variable.properties[variableProp] =
            variablePropValues[variableProp][variableDcid];
        });

        // Set per-capita data
        if (
          TOTAL_POPULATION_VARIABLE in populationObservations.data &&
          entityDcid in populationObservations.data[TOTAL_POPULATION_VARIABLE]
        ) {
          const series =
            populationObservations.data[TOTAL_POPULATION_VARIABLE][entityDcid];

          const closestPopulationObservation = this.getClosestObservationToDate(
            series.series,
            observation.date
          );
          row.variable.denominator = {
            dcid: TOTAL_POPULATION_VARIABLE,
            properties: {
              name:
                perCapitaPropValues[NAME_ATTRIBUTE][
                  TOTAL_POPULATION_VARIABLE
                ] || "",
            },
            observation: {
              date:
                closestPopulationObservation && !_.isEmpty(observation)
                  ? closestPopulationObservation.date
                  : null,
              value:
                closestPopulationObservation && !_.isEmpty(observation)
                  ? closestPopulationObservation.value
                  : null,
              metadata: {},
            },
            quotientValue:
              closestPopulationObservation && !_.isEmpty(observation)
                ? observation.value / closestPopulationObservation.value
                : null,
          };
        }
        dataRows.push(row);
      });
    });
    return dataRows;
  }

  /**
   * Enriches SeriesApiResponse and converts response into a list of `DataRow`s
   * @param entityDcids Entity DCIDs
   * @param variableDcids Variable DCIDs
   * @param seriesApiResponse Entity/variable observations
   * @param entityPropValues Additional entity properties to fetch
   * @param variablePropValues Additional variable properties to fetch
   * @param populationObservations Population observations for our list of entities for per-capita calculations
   * @returns data rows
   */
  private getDataRowsFromSeriesObservations(
    entityDcids: string[],
    variableDcids: string[],
    seriesApiResponse: SeriesApiResponse,
    entityPropValues: NodePropValues,
    variablePropValues: NodePropValues,
    perCapitaPropValues: NodePropValues,
    populationObservations: SeriesApiResponse
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      variableDcids.forEach((variableDcid) => {
        const series = seriesApiResponse.data[variableDcid][entityDcid] || {};
        if (_.isEmpty(series)) {
          return;
        }
        const facet = _.get(seriesApiResponse.facets, series.facet || "", {});
        let perCapitaObservations: QuotientObservation[] = [];
        let populationSeries: Series | null = null;
        if (
          TOTAL_POPULATION_VARIABLE in populationObservations.data &&
          entityDcid in populationObservations.data[TOTAL_POPULATION_VARIABLE]
        ) {
          populationSeries =
            populationObservations.data[TOTAL_POPULATION_VARIABLE][entityDcid];
          perCapitaObservations = computeRatio(
            series.series,
            populationSeries.series
          );
        }
        series.series.forEach((observation, observationIndex) => {
          const row: DataRow = {
            entity: {
              dcid: entityDcid,
              properties: {
                name: _.get(
                  _.get(entityPropValues, NAME_ATTRIBUTE, {}),
                  entityDcid,
                  ""
                ),
              },
            },
            variable: {
              dcid: variableDcid,
              properties: {
                name: _.get(
                  _.get(variablePropValues, NAME_ATTRIBUTE, {}),
                  variableDcid,
                  ""
                ),
              },
              observation: {
                date: observation.date,
                value: observation.value,
                metadata: {
                  unit: _.get(facet, "unit", null),
                  unitDisplayName: _.get(
                    observation,
                    "unitDisplayName",
                    _.get(facet, "unitDisplayName", null)
                  ),
                },
              },
            },
          };
          Object.keys(entityPropValues).forEach((entityProp) => {
            row.entity.properties[entityProp] =
              entityPropValues[entityProp][entityDcid];
          });
          Object.keys(variablePropValues).forEach((variableProp) => {
            row.variable.properties[variableProp] =
              variablePropValues[variableProp][variableDcid];
          });

          // Set per-capita data
          if (perCapitaObservations.length === series.series.length) {
            // perCapitaObservations is a parallel array with the data series
            const perCapitaObservation =
              perCapitaObservations[observationIndex];
            row.variable.denominator = {
              dcid: TOTAL_POPULATION_VARIABLE,
              properties: {
                name:
                  perCapitaPropValues[NAME_ATTRIBUTE][
                    TOTAL_POPULATION_VARIABLE
                  ] || "",
              },
              observation: {
                date: perCapitaObservation.date,
                value: perCapitaObservation.value,
                metadata: {},
              },
              quotientValue: perCapitaObservation.quotientValue,
            };
          }
          dataRows.push(row);
        });
      });
    });
    return dataRows;
  }
}
export { DataCommonsClient };
