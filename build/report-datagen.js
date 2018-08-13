const fs = require('fs');
const path = require('path');
const jsonminify = require("jsonminify");
const _ = require('lodash');
const async = require('async');
const dest = './public/data/';
const md5 = require('js-md5');
import dataConfig from '../data/config/data.js';
import siteConfig from '../data/config/site.js';
import { calcValue } from '../app/js/modules/metric_calculations.js';

///////////////////////////////////////////////////
// Create destination folders
///////////////////////////////////////////////////
let directoriesToMake = ['', 'data', 'data/report'];
_.each(siteConfig.geographies, function(geography) {
  directoriesToMake.push('data/report/' + geography.id);
});
directoriesToMake.forEach((name) => {
  try {
    fs.mkdirSync('public/' + name);
  }
  catch (err) {
    if (err.code !== 'EEXIST') {
      console.log(`Error making directory public/${name}: ${err.message}`);
    }
  }
});

///////////////////////////////////////////////
// Create report-specific JSON files.
///////////////////////////////////////////////

_.each(siteConfig.geographies || ['geography',], function(geography) {
  // Cache metrics json files.
  // TODO: Filter out metrics which don't appear in the report to save filesize.
  let metrics = Object.values(dataConfig).
      filter((m) => (m.geographies.indexOf(geography.id) > -1));
  let geographyMetricsCached = {};
  let countyAverages = {};

  async.each(metrics, (metric, callback) => {
    fs.readFile(path.join(dest, `metric/${geography.id}/m${metric.metric}.json`),
        (err, data) => {
          let contents = {};
          if (err) {
            console.log(`Error reading ${dest}/metric/${geography.id}/m${metric.metric}.json: ${err.message}`);
            return callback();
          }
          try {
            contents = JSON.parse(data);
          }
          catch (err) {
            console.log(`Error parsing ${dest}/metric/${geography.id}/m${metric.metric}.json: ${err.message}`);
            return callback();
          }
          _.forOwn(contents.map, (value, key) => {
            if (!geographyMetricsCached.hasOwnProperty(key)) {
              geographyMetricsCached[key] = {};
            }
            geographyMetricsCached[key][metric.metric] = {
              map: value
            };
            if (contents.hasOwnProperty('w')) {
              geographyMetricsCached[key][metric.metric]['w'] = contents.w[key];
            }
          });

          // If this is the blockgroup-level data, store county averages.
          if (geography.id === 'blockgroup') {
            const geographyKeys = Object.keys(contents.map);
            // Get the maximal set of years across all the tracts
            const years = geographyKeys
              .reduce(
                  (years, currentValue) => (
                  new Set([
                      ...Object.keys(contents.map[currentValue]).map((y) => (y.replace('y_',''))).sort(),
                      ...years
                  ])), []
            );
            countyAverages[metric.metric] = {};
            years.forEach((year) => {
              countyAverages[metric.metric][`y_${year}`] = calcValue(contents, metric.type,
                  year, geographyKeys);
            });
          }
          callback();
        });
    },
    (err) => {
      if (err) console.log(`Error on looping through metrics: ${err.message}`);

      fs.writeFile(path.join(dest, 'report/county_averages.json'),
          jsonminify(JSON.stringify(countyAverages)), (err) => {
            if (err) return console.log(`Error writing county_averages.json: ${err.message}`);
              console.log('Saved county averages json file');
          });
      // Write a file for each geography with just the metrics for that geography.
      _.forOwn(geographyMetricsCached, (value, key) => {
        value['geography_name'] = key;
        let filename = key;
        if (geography.id === 'neighborhood') {
          filename = md5(key);
        }
        fs.writeFile(path.join(dest, `report/${geography.id}/${filename}.json`),
            jsonminify(JSON.stringify(value)),
            (err) => {
              if (err) return console.log(`Error saving report JSON for ${geography.id} ${filename} (${key}): ${err.message}`);
              console.log(`Saved report JSON for ${geography.id} ${filename} (${key})`)
            });
      });
    }
  );
});
