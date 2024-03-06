const { app, BrowserWindow, protocol, screen } = require("electron");
const { desktopCapturer, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const querystring = require("querystring");
const robot = require("@jitsi/robotjs");
const log = require("electron-log");
const { socket } = require("./io");

let mainWindow;
let isSet = false;
socket.on("connect", () => {
  console.log("connect");
  socket.on("ready", async () => {
    console.log("ready");
    try {
      // 1.拿到stream]
      getStream();
    } catch (error) {
      console.log("Error:", error);
    }
  });
});
log.info("create");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "remote",
    privileges: {
      bypassCSP: true,
    },
  },
]);

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    // show: true, // 不显示窗口
    width: 300,
    height: 40,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    x: width / 2 - 50,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // 开启上下文隔离
      nodeIntegration: true,
    },
  });

  // mainWindow.setIgnoreMouseEvents(true);
  // mainWindow.setIgnoreMouseEvents(false);
  // mainWindow.setIgnoreMouseEvents(true);
  mainWindow.loadFile("index.html");
  // 关闭窗口时退出应用
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  ipcMain.on("scroll", (e, { x, y }) => {
    console.log("x", x, y);
    robot.scrollMouse(x, y);
  });

  ipcMain.on("click", (e, { x, y }) => {
    robot.moveMouse(x, y);
    robot.mouseClick();
  });

  ipcMain.on("close", (e, key) => {
    app.quit();
  });

  // ipcMain.on("stream", (e, stream) => {
  //   console.log("stream", stream);
  //   socket.emit("stream", stream);
  // });
}

function getStream() {
  desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
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

// app.whenReady().then(() => {
//   protocol.handle("remote", (req) => {
//     mainWindow && mainWindow.webContents.send("log", req);
//     log.info("req", req);
//   });
// });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault(); // 防止应用程序重启
  const args = url.split("//")[1].split("/"); // 解析参数
  mainWindow && mainWindow.webContents.send("log", args);
  // mainWindow.loadURL(`file://${__dirname}/index.html`);
  log.info("log", args);
});

app.on("ready", () => {
  createWindow();
  app.removeAsDefaultProtocolClient("remote");

  if (process.env.NODE_ENV === "development" && process.platform === "win32") {
    isSet = app.setAsDefaultProtocolClient("remote", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    isSet = app.setAsDefaultProtocolClient("remote");
  }
  console.log("isSet", isSet);
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
