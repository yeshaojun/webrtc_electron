const { app, BrowserWindow } = require("electron");
const { desktopCapturer, ipcMain } = require("electron");
const path = require("path");
const robot = require("robotjs");
const io = require("socket.io-client");
const socket = io.connect("http://localhost:3000");

let mainWindow;

socket.on("connect", () => {
  console.log("connect");
  socket.on("ready", async () => {
    console.log("ready");
    try {
      // 1.拿到stream
    } catch (error) {
      console.log("Error:", error);
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    show: true, // 不显示窗口
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  mainWindow.loadFile("index.html");

  // 关闭窗口时退出应用
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  getStream();

  ipcMain.on("scroll", (e, { x, y }) => {
    console.log("x", x, y);
    robot.scrollMouse(x, y);
  });
}

function getStream() {
  desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
    console.log("sources", sources);
    try {
      mainWindow.webContents.send("SET_SOURCE", sources[0].id);

      // const stream = await navigator.mediaDevices.getUserMedia({
      //   audio: false,
      //   video: {
      //     mandatory: {
      //       chromeMediaSource: "desktop",
      //       chromeMediaSourceId: sources[0].id,
      //       maxWidth: window.screen.width,
      //       maxHeight: window.screen.height,
      //     },
      //   },
      // });
    } catch (e) {
      console.error(e);
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  createWindow();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
