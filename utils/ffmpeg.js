const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const ffmpeg = require("fluent-ffmpeg");

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
      if (
        (process.platform === "win32" && entry.name === "ffmpeg.exe") ||
        (process.platform !== "win32" && entry.name === "ffmpeg")
      ) {
        const ffmpegPath = fullPath;
        const ffprobePath = path.join(
          path.dirname(fullPath),
          process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
        );
        if (fs.existsSync(ffprobePath)) {
          return { ffmpegPath, ffprobePath };
        }
      }
    }
  }
  return null;
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
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

  let url;
  if (process.platform === "win32") {
    url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
  } else if (process.platform === "darwin") {
    url = "https://evermeet.cx/ffmpeg/ffmpeg-6.0.zip";
  } else {
    url =
      "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz";
  }

  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const zipPath = path.join(binDir, "ffmpeg.zip");
  fs.writeFileSync(zipPath, buffer);

  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: binDir }))
    .promise();

  fs.unlinkSync(zipPath);
  console.log("FFmpeg extracted");

  const paths = findFFmpegRecursive(binDir);
  if (!paths) throw new Error("FFmpeg binaries not found!");
  ffmpegPath = paths.ffmpegPath;
  ffprobePath = paths.ffprobePath;

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  console.log(`FFmpeg path: ${ffmpegPath}`);
  console.log(`FFprobe path: ${ffprobePath}`);
}

module.exports = { loadFFmpeg };
