const { ipcRenderer } = require("electron");
const fs = require("fs");
const io = require("socket.io-client");
const socket = io.connect("http://localhost:9000");

const PEERCONFIG = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302"],
    },
    {
      urls: ["turn:wangxiang.website:3478"],
      username: "admin",
      credential: "admin",
    },
  ],
};

socket.on("error", (err) => {
  console.log("im error", err);
});

socket.on("connect", () => {
  console.log("connect");
});

ipcRenderer.on("SET_SOURCE", async (event, { id, ...params }) => {
  console.log("SET_SOURCE", params);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: id,
          // minWidth: 1280,
          // maxWidth: 1280,
          // minHeight: 720,
          // maxHeight: 720,
        },
      },
    });
    console.log("stream", stream);
    const peer = new RTCPeerConnection(PEERCONFIG);
    const channel = peer.createDataChannel("chat");
    channel.onopen = (e) => {
      console.log("onopen", e);
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
        socket.emit("toStaffCandidate", {
          candidate: event.candidate,
          ...params,
        });
      }
    };

    socket.emit("remoteJoin", params.conversationId, async () => {
      socket.on("toUserCandidate", (candidate) => {
        console.log("toUserCandidate");
        peer.addIceCandidate(candidate);
      });

      console.log("reegister");
      socket.on("answer", async (answer) => {
        console.log("answer", answer);
        await peer.setRemoteDescription(answer);
      });

      let offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("offer", {
        offer,
        ...params,
      });
    });
  } catch (e) {
    console.log("error111", JSON.stringify(e.message));
  }
});

ipcRenderer.on("log", (event, message) => {
  console.log("log", message);
});

// function handleStream(stream) {
//   console.log("222");
//   const video = document.getElementById("localVideo");
//   video.srcObject = stream;
//   video.onloadedmetadata = (e) => video.play();
// }

function handleError(e) {
  console.log(e);
}

window.addEventListener("DOMContentLoaded", () => {
  // 获取按钮元素
  document.getElementById("end-control").addEventListener("click", (event) => {
    ipcRenderer.send("close");
  });
});
