const { app, BrowserWindow, protocol, screen } = require("electron");
const { desktopCapturer, ipcMain } = require("electron");
const path = require("path");
const robot = require("@jitsi/robotjs");
const log = require("electron-log");
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow;
let isSet = false;

const scheme = "remote";
let screenWidth = 0;
let screenHeight = 0;

protocol.registerSchemesAsPrivileged([
  {
    scheme: scheme,
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
      // contextIsolation: true, // 开启上下文隔离
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
    robot.scrollMouse(x, y);
  });

  ipcMain.on("click", (e, { x, y }) => {
    robot.moveMouse(x * (screenWidth / 1280), y * (screenHeight / 720));
    robot.mouseClick();
  });

  ipcMain.on("keydown", (e, { key }) => {
    try {
      robot.keyTap(key);
    } catch (error) {
      log.warn("keydown error", error);
    }
  });

  ipcMain.on("copy", (e, { key }) => {
    robot.keyTap("c", ["control"]);
  });

  ipcMain.on("paste", (e, { key }) => {
    robot.keyTap("v", ["control"]);
  });

  ipcMain.on("mousedown", (e, { key }) => {
    robot.mouseToggle("down");
  });

  ipcMain.on("mouseup", (e, { key }) => {
    robot.mouseToggle("up");
  });

  ipcMain.on("mousemove", (e, { x, y }) => {
    robot.moveMouse(x * (screenWidth / 1280), y * (screenHeight / 720));
  });

  ipcMain.on("close", (e, key) => {
    app.quit();
  });
}

function getStream(params) {
  desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
    try {
      mainWindow.webContents.send("SET_SOURCE", {
        id: sources[0].id,
        ...params,
      });
    } catch (e) {
      console.error(e);
    }
  });
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // 当第二个实例尝试启动时，发送消息给第一个实例
    if (mainWindow) {
      if (process.platform === "win32") {
        // 在 Windows 上，处理命令行参数中的自定义协议启动
        openUrlWindow(commandLine);
      }
      // Bring the first instance's window to the front if it's minimized
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault(); // 防止应用程序重启
  const obj = parseURLParams(url); // 解析参数
  if (obj.pathname) {
    // const { socket } = require("./io");
    getStream({
      conversationId: obj.pathname,
      userId: obj.params.userId,
      staffId: obj.params.staffId,
    });
    // 启动就
  }
});

function openUrlWindow(argv) {
  for (const arg of argv) {
    if (arg.startsWith("remote://")) {
      const obj = parseURLParams(arg); // 解析参数
      if (obj.pathname) {
        getStream({
          conversationId: obj.pathname.replace("/", "").trim(),
          userId: obj.params.userId,
          staffId: obj.params.staffId,
        });
        // 启动就
      }
    }
  }
}

function parseURLParams(url) {
  const match = url.match(/^remote:\/\/([^?]+)(\?.+)?$/);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const pathname = match[1];
  const searchParams = match[2] ? match[2].substring(1) : "";

  const params = {};
  if (searchParams) {
    searchParams.split("&").forEach((param) => {
      const [key, value] = param.split("=");
      params[key] = decodeURIComponent(value);
    });
  }

  return {
    pathname: pathname,
    params: params,
  };
}

app.on("ready", () => {
  createWindow();
  app.removeAsDefaultProtocolClient(scheme);

  if (process.env.NODE_ENV === "development" && process.platform === "win32") {
    isSet = app.setAsDefaultProtocolClient(scheme, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    isSet = app.setAsDefaultProtocolClient(scheme);
  }
  if (process.platform !== "darwin") {
    openUrlWindow(process.argv);
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  screenWidth = primaryDisplay.size.width;
  screenHeight = primaryDisplay.size.height;
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
