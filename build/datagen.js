import fs from "fs";

import siteConfigData from "../data/config/site.js";

const siteConfig = siteConfigData.default;

import datagenGeographies from "./datagen-functions/geographies.js";
import datagenSelectgropus from "./datagen-functions/selectgroups.js";
import datagenMeta from "./datagen-functions/meta.js";

const directoriesToMake = [
  "public/",
  "public/selectgroups",
  "public/data",
  "public/data/meta",
  "public/data/meta/en",
  "public/data/meta/es",
  "public/data/metric",
  ...siteConfig.geographies.map((g) => `public/data/metric/${g.id}`),
];

async function createDirectories(directories) {
  await Promise.all(
    directories.map(async (dir) => {
      try {
        await fs.promises.mkdir(dir);
      } catch (err) {
        if (err.code !== "EEXIST") {
          console.error(`Error on creating directory ${dir}: ${err.message}`);
        }
      }
    })
  );
}

async function main() {
  await createDirectories(directoriesToMake);

  await datagenGeographies({
    inputBase: "data",
    outputBase: "public/data",
  });

  await datagenSelectgropus({
    inputFile: "data/selectgroups.geojson.json",
    outputBase: "public/selectgroups",
  });

  await datagenMeta({
    inputBases: ["data/meta/en", "data/meta/es"],
    outputBase: "public",
  });

  // datagenMetrics({});
}

main();
