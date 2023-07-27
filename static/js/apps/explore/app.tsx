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

/**
 * Main component for DC Explore.
 */
import "../../../library";

import React, { useState } from "react";
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { formatNumber } from "../../i18n/i18n";
import allTopics from "./topics.json";

interface TopicConfig {
  title: string;
  description: string;
  examples: {
    general: string[];
    specific: string[];
    comparison: string[];
  };
  meta: {
    dataPointCount: number;
    variableCount: number;
    sources: string[];
  };
}

/**
 * Application container
 */
export function App(): JSX.Element {
  const topic = window.location.href.split("/").pop().split("#")[0];
  const currentTopic = allTopics.topics[topic] as TopicConfig;
  const additionalTopics = allTopics.allTopics
    .map((name) => ({
      name,
      title: allTopics.topics[name]?.title,
    }))
    .filter((item) => !item.title || item.name !== topic);

  if (!topic) {
    return (
      <div className="explore-container">
        <Container>
          <h1>
            No topics found for {'"'}
            {topic}
            {'"'}
          </h1>
        </Container>
      </div>
    );
  }
  const placeholderQuery =
    currentTopic.examples?.general?.length > 0
      ? currentTopic.examples.general[0]
      : "family earnings in california";
  return (
    <div className="explore-container">
      <Container>
        <h1>{currentTopic.title}</h1>
        <p>{currentTopic.description}</p>
        <div className="explore-search">
          <TextSearchBar
            inputId="query-search-input"
            onSearch={(q) => {
              window.location.href = `/insights#q=${encodeURIComponent(q)}`;
            }}
            placeholder={`For example, "${placeholderQuery}"`}
            initialValue={""}
            shouldAutoFocus={true}
            clearValueOnSearch={true}
          />
        </div>
        <div className="explore-queries">
          <div className="explore-queries">
            <div>Here are some examples to get you started:</div>
            <ul>
              {currentTopic.examples.general.map((query) => (
                <li>
                  <QueryLink query={query} />
                </li>
              ))}
            </ul>
          </div>
          <div className="explore-queries">
            <div>Try diving deeper:</div>
            <ul>
              {currentTopic.examples.specific.map((query) => (
                <li>
                  <QueryLink query={query} />
                </li>
              ))}
            </ul>
          </div>
          <div className="explore-queries">
            <div>
              And the real power of DataCommons is creating one common Knowledge
              Graph:
            </div>
            <ul>
              {currentTopic.examples.comparison.map((query) => (
                <li>
                  <QueryLink query={query} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="explore-more">
          Additional data is available for these topics:{" "}
          {additionalTopics.map((item, i) => (
            <>
              <a href={`/explore/${item.name}`}>
                {item.title.toLocaleLowerCase()}
              </a>
              {", "}
            </>
          ))}
          and more
        </div>

        <div className="explore-sources">
          Our {currentTopic.title.toLocaleLowerCase()} data comprises{" "}
          <span
            title={`${formatNumber(
              currentTopic.meta.dataPointCount,
              undefined,
              true
            )}`}
          >
            {formatNumber(currentTopic.meta.dataPointCount)}
          </span>{" "}
          data points across{" "}
          <span
            title={`${formatNumber(
              currentTopic.meta.variableCount,
              undefined,
              true
            )}`}
          >
            {formatNumber(currentTopic.meta.variableCount)}
          </span>{" "}
          statistical variables. We collect our health information from sources
          such as:{" "}
          {currentTopic.meta.sources.map((s, i) => (
            <>
              {s}
              {i === currentTopic.meta.sources.length - 1 ? ", " : ""}
            </>
          ))}
        </div>
      </Container>
    </div>
  );
}

const QueryLink: React.FC<{ query: string }> = (props) => {
  const { query } = props;
  return (
    <a
      href={`/insights#q=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {query}
    </a>
  );
};
