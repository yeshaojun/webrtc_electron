const { ipcRenderer } = require("electron");
const fs = require("fs");
const { socket } = require("./io");
ipcRenderer.on("SET_SOURCE", async (event, sourceId) => {
  console.log("111");
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

    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
        {
          urls: ["turn:wangxiang.website:3478"],
          username: "admin",
          credential: "admin",
        },
      ],
    });

    const channel = peer.createDataChannel("chat");
    channel.onopen = (e) => {
      console.log("onopen", e);
      // channel.send("1233");
    };

    channel.onmessage = (e) => {
      var eventData = JSON.parse(e.data);
      console.log("onmessage", e, eventData);
      if (eventData.type === "scroll") {
        ipcRenderer.send("scroll", { x: eventData.x, y: eventData.y });
      } else if (eventData.type === "click") {
        ipcRenderer.send("click", { x: eventData.x, y: eventData.y });
      }
    };

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.onicecandidate = (event) => {
      console.log("localPc:", event.candidate, event);
      if (event.candidate) {
        socket.emit("toCustomCandidate", event.candidate);
      }
    };

    socket.on("toUserCandidate", (candidate) => {
      console.log("toUserCandidate");
      peer.addIceCandidate(candidate);
    });

    socket.on("answer", async (answer) => {
      await peer.setRemoteDescription(answer);
    });

    let offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("offer", offer);

    // socket.emit("stream", fs.createReadStream() stream);
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

// function listen() {
//   document.addEventListener("wheel", (event) => {
//     console.log("wheel");
//     ipcRenderer.send("scroll", { x: event.clientX, y: event.clientY });
//   });

//   document.addEventListener("click", (event) => {
//     ipcRenderer.send("click", { x: event.clientX, y: event.clientY });
//   });
// }
