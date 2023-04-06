import dataConfigData from "../data/config/data.js";

const dataConfig = dataConfigData.default;

import {
  isNumeric,
  csvToJsonTransform,
  newFormatCsvToJsonTransform,
  writeMetricFile,
  checkMetricFileName,
} from "./datagen-functions.js";

// /////////////////////////////////////////////
// CSVtoJSON
// /////////////////////////////////////////////
async function convertMetricCsvToJson(geography, metric) {
  const destPath = path.join(dest, geography);

  if (metric.type === "sum" || metric.type === "mean") {
    let matchingFile = checkMetricFileName(geography, metric, metric.type === "sum" ? "r" : "n");

    try {
      const outJSON = {};
      if (!matchingFile) {
        console.error(`Can't find metric CSV files for ${metric.metric}`);
        return;
      }

      const jsonObj = await csv().fromFile(matchingFile.name);
      outJSON.map =
        matchingFile.format === "new"
          ? newFormatCsvToJsonTransform(jsonObj)
          : csvToJsonTransform(jsonObj);

      if (metric.accuracy) {
        matchingFile = checkMetricFileName(geography, metric, "accuracy");
        if (!matchingFile) {
          console.error(
            `Could not find matching accuracy file for ${metric.metric} for ${geography}.`
          );
        } else {
          try {
            const jsonObjA = await csv().fromFile(matchingFile.name);
            outJSON.a = csvToJsonTransform(jsonObjA);
          } catch (error) {
            console.error(
              `Error parsing accuracy file for ${metric.metric} for ${geography}: ${error.message}`
            );
          }
        }
      }
      return writeMetricFile(destPath, metric, outJSON);
    } catch (error) {
      console.error(`Error parsing ${matchingFile.name} for ${geography}: ${error.message}`);
    }
  }

  if (metric.type === "weighted") {
    const outJSON = {};
    const files = [
      checkMetricFileName(geography, metric, "r"),
      checkMetricFileName(geography, metric, "d"),
    ];

    const [jsonArrayR, jsonArrayD] = await Promise.all(
      files.map(async (file) => {
        const csvArray = await csv().fromFile(file.name);
        if (file.format === "new") {
          return newFormatCsvToJsonTransform(csvArray);
        }
        return csvToJsonTransform(csvArray);
      })
    );

    try {
      Object.keys(jsonArrayR).forEach((key) => {
        Object.keys(jsonArrayR[key]).forEach((key2) => {
          if (isNumeric(jsonArrayR[key][key2]) && isNumeric(jsonArrayD[key][key2])) {
            jsonArrayR[key][key2] /= jsonArrayD[key][key2];
            if (metric.suffix === "%") {
              jsonArrayR[key][key2] *= 100;
            }
          } else {
            jsonArrayR[key][key2] = null;
          }
        });
      });
    } catch (err) {
      return console.error(`Error on ${metric.metric} for ${geography}: ${err.message}`);
    }
    outJSON.w = jsonArrayD;
    outJSON.map = jsonArrayR;
    if (metric.accuracy) {
      const accuracyFile = checkMetricFileName(geography, metric, "accuracy");
      if (!accuracyFile) {
        console.error(`Could not find accuracy file for ${metric.metric} for ${geography}.`);
      } else {
        try {
          const jsonObjA = await csv().fromFile(accuracyFile.name);
          outJSON.a = csvToJsonTransform(jsonObjA);
        } catch (error) {
          console.error(
            `Error parsing accuracy file for ${metric.metric} for ${geography}: ${error.message}`
          );
        }
      }
    }
    return writeMetricFile(destPath, metric, outJSON);
  }
}

// Loop through geographies & variables.
const siteGeographyIds = siteConfig.geographies.map((g) => g.id);
await Promise.all(
  Object.values(dataConfig).map(async (metric) => {
    if (metric.geographies) {
      console.log(`Converting csvs to JSON for ${metric.metric}`);
      return Promise.all(
        metric.geographies
          .filter((g) => siteGeographyIds.indexOf(g) !== -1)
          .map(async (geography) =>
            convertMetricCsvToJson(geography, metric).catch((err) =>
              console.error(
                `Error running metricCsvToJson for ${metric.metric} at ${geography}: ${err.message}`
              )
            )
          )
      );
    }
    if (metric) {
      return convertMetricCsvToJson("", metric);
    }
  })
);
