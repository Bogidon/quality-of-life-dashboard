import fs from "fs";
import stringify from "json-stable-stringify";
import jsonminify from "jsonminify";
import path from "path";

import siteConfigData from "../../data/config/site.js";

const siteConfig = siteConfigData.default;

function addLabels(data, labelFunc, labelEsFunc) {
  data.features.forEach((f) => {
    // CALLOUT: previously there was a check for "f.label_en" existing, which doesn't seem to be the correct name for the field in the data schema
    f.properties.label = f.properties.label ?? labelFunc(f.properties.id);
    f.properties.label_es = f.properties.label_es ?? labelEsFunc(f.properties.id);
  });
  return data;
}

/**
 * Process geographies defined in the site config by:
 *
 * - Adding "label" and "label_es" fields
 * - Minifying the resulting JSON
 *
 * Never throws, all errors are caught.
 *
 * @param {Object} options
 * @param {string} options.inputBase The base path from which input geographies will be read
 * @param {string} options.outputBase The base path to which processed geogrpahies will be written
 */
export default async function datagenGeographies({ inputBase, outputBase }) {
  await Promise.all(
    // CALLOUT: there was default behavior to process a geography.geojson.json file, but that logic was broken, should we add it back in?
    siteConfig.geographies.map(async (config) => {
      try {
        const inputPath = path.join(inputBase, `${config.id}.geojson.json`);
        const outputPath = path.join(outputBase, `${config.id}.geojson.json`);
        let data = await fs.promises.readFile(inputPath, "utf8");
        data = JSON.parse(data);
        data = addLabels(data, config.label, config.label_es);
        data = stringify(data);
        data = jsonminify(data);
        try {
          await fs.promises.writeFile(outputPath, data);
          console.log(`Saved processed geography: ${config.name}`);
        } catch (err) {
          console.error(`Error writing processed geography: ${config.name}: ${err.message}`);
        }
      } catch (err) {
        console.error(`Error reading geography: ${config.name}: ${err.message}`);
      }
    })
  );
}
