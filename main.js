const { app, BrowserWindow, protocol } = require("electron");
const { desktopCapturer, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const querystring = require("querystring");
const robot = require("@jitsi/robotjs");
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

protocol.registerSchemesAsPrivileged([
  {
    scheme: "electron-playground-code",
    privileges: {
      bypassCSP: true,
    },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    show: false, // 不显示窗口
    // width: 800,
    // height: 600,
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

  ipcMain.on("scroll", (e, { x, y }) => {
    console.log("x", x, y);
    robot.scrollMouse(x, y);
  });

  ipcMain.on("click", (e, { x, y }) => {
    robot.moveMouse(x, y);
    robot.mouseClick();
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

app.whenReady().then(() => {
  protocol.handle("electron-playground-code", (req) => {
    console.log("req", req);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  createWindow();
  app.on("open-url", (event, appUrl) => {
    event.preventDefault(); // 防止默认行为
    const parsedUrl = url.parse(appUrl);
    console.log("appUrl", appUrl, parsedUrl);
    const params = querystring.parse(parsedUrl.query); // 解析参数
    console.log("Received parameters:", params);
    // 在这里处理传递过来的参数
  });
  app.removeAsDefaultProtocolClient("electron-playground-code");

  if (process.env.NODE_ENV === "development" && process.platform === "win32") {
    isSet = app.setAsDefaultProtocolClient(
      "electron-playground-code",
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  } else {
    isSet = app.setAsDefaultProtocolClient("electron-playground-code");
  }
  console.log("isSet", isSet);
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
