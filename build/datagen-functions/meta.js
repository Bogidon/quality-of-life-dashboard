import fs from "fs";
import path from "path";
import { marked } from "marked";

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
});

function isFileMarkdown(filePath) {
  return path.basename(filePath).split(".")[1] === "md";
}

function filenameToHTML(filePath) {
  return `${path.basename(filePath).split(".")[0]}.html`;
}

/**
 * Convert meta markdown files to HTML.
 *
 * Never throws, all errors are caught.
 *
 * @param {Object} options
 * @param {string} options.inputBases The base paths from which meta markdown files will be read
 * @param {string} options.outputBase The base path to which converted HTML files will be written
 */
export default async function datagenMeta({ inputBases, outputBase }) {
  await Promise.all(
    inputBases.map(async (folder) => {
      // Read markdown meta directory
      try {
        const files = await fs.promises.readdir(folder);

        await Promise.all(
          files.map(async (file) => {
            if (!isFileMarkdown(file)) return;
            const filePath = path.join(folder, file);

            // Read markdown files
            try {
              const data = await fs.promises.readFile(filePath, "utf-8");
              const outputPath = path.join(outputBase, folder, filenameToHTML(file));

              // Convert markdown to HTML
              try {
                const content = marked(data);

                // Write HTML to file
                try {
                  await fs.promises.writeFile(outputPath, content);
                  console.log(`Wrote ${outputPath}`);
                } catch (err) {
                  console.error(`Error writing meta HTML ${outputPath}: ${err.message}`);
                }
              } catch (err) {
                console.error(`Error running marked on ${filePath}: ${err.message}`);
              }
            } catch (err) {
              console.error(`Error reading meta file ${filePath}: ${err.message}`);
            }
          })
        );
      } catch (err) {
        console.error(`Error reading meta directory ${folder}: ${err.message}`);
      }
    })
  );
}
