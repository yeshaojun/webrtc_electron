const { ipcRenderer } = require("electron");

ipcRenderer.on("SET_SOURCE", async (event, sourceId) => {
  console.log("111");
  listen();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
        },
      },
    });
    handleStream(stream);
  } catch (e) {
    handleError(e);
  }
});

function handleStream(stream) {
  console.log("222");
  const video = document.getElementById("localVideo");
  video.srcObject = stream;
  video.onloadedmetadata = (e) => video.play();
}

function handleError(e) {
  console.log(e);
}

function listen() {
  document.addEventListener("wheel", (event) => {
    console.log("wheel");
    ipcRenderer.send("scroll", { x: event.clientX, y: event.clientY });
  });
}
