const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

let manifest = require("../app/manifest.json");
let package = require("../package.json");

// Add applications field needed by firefox.
manifest["applications"] = {
  ...manifest.applications,
  ...package.applications,
};

console.dir(manifest);

const output = fs.createWriteStream(
  path.join(__dirname, "..", "twitterimagedownloader.xpi")
);
const archive = archiver("zip", {
  zlib: { level: 9 },
});
