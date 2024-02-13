var fs = require("fs");
var os = require("os");
var path = require("path");
const { execSync } = require("child_process");

var cors = require("cors")
var express = require("express")
var backendServer = express();

function fileServerConfig(Path) {
  backendServer.use(cors());
  backendServer.use(express.json({ limit: "50mb" }));
  backendServer.use(express.urlencoded({ limit: "50mb", extended: true }));
  backendServer.use(express.static(Path));

  return backendServer;
}

var config = JSON.parse(fs.readFileSync("../public/config.json"), "utf8");
var fileServer = fileServerConfig(config.PRODUCTION_BUILD.FOLDER_PATH);
var fileServerConfig =
  config.PRODUCTION_BUILD.FILE_SERVER_URL.trim().split(":");
var fileServerPort = fileServerConfig[fileServerConfig.length - 1].trim();
fileServer.listen(fileServerPort, () => {
  console.log(`File server listening on port ${fileServerPort}`);
});
