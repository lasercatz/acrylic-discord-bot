const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const unzipper = require("unzipper");
const tar = require("tar");
const https = require("https");

const binDir = path.join(__dirname, "../bin");
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

let ffmpegPath;
let ffprobePath;

function findFFmpegRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const result = findFFmpegRecursive(fullPath);
      if (result) return result;
    } else {
      const isFfmpeg =
        (process.platform === "win32" && entry.name === "ffmpeg.exe") ||
        (process.platform !== "win32" && entry.name === "ffmpeg");

      if (isFfmpeg) {
        const probePath = path.join(
          path.dirname(fullPath),
          process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
        );
        if (fs.existsSync(probePath)) {
          return { ffmpegPath: fullPath, ffprobePath: probePath };
        }
      }
    }
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function loadFFmpeg() {
  const existing = findFFmpegRecursive(binDir);
  if (existing) {
    ffmpegPath = existing.ffmpegPath;
    ffprobePath = existing.ffprobePath;
    console.log("FFmpeg already exists:", ffmpegPath, ffprobePath);
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    return;
  }

  console.log("Downloading FFmpeg...");

  let url;
  let isZip = true;

  if (process.platform === "win32") {
    url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
  } else if (process.platform === "darwin") {
    url = "https://evermeet.cx/ffmpeg/ffmpeg-6.0.zip";
  } else {
    url =
      "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz";
    isZip = false;
  }

  const archivePath = path.join(binDir, isZip ? "ffmpeg.zip" : "ffmpeg.tar.xz");
  await downloadFile(url, archivePath);

  if (isZip) {
    await fs.createReadStream(archivePath).pipe(unzipper.Extract({ path: binDir })).promise();
  } else {
    await tar.x({ file: archivePath, C: binDir });
  }

  fs.unlinkSync(archivePath);

  const paths = findFFmpegRecursive(binDir);
  if (!paths) throw new Error("FFmpeg binaries not found after extraction!");

  ffmpegPath = paths.ffmpegPath;
  ffprobePath = paths.ffprobePath;

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  console.log("FFmpeg ready!");
  console.log("ffmpeg:", ffmpegPath);
  console.log("ffprobe:", ffprobePath);
}

module.exports = { loadFFmpeg };
