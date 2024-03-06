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
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun.ekiga.net,",
            "stun:stun.stunprotocol.org:3478",
          ],
        },
        {
          urls: ["turn:wangxiang.website:3478"],
          username: "admin",
          credential: "admin",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
        {
          urls: "turn:192.158.29.39:3478?transport=udp",
          credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
          username: "28224511:1379330808",
        },
        {
          urls: "turn:192.158.29.39:3478?transport=tcp",
          credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
          username: "28224511:1379330808",
        },
        {
          urls: "turn:turn.bistri.com:80",
          credential: "homeo",
          username: "homeo",
        },
        {
          urls: "turn:turn.anyfirewall.com:443?transport=tcp",
          credential: "webrtc",
          username: "webrtc",
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
    // handleStream(stream);
  } catch (e) {
    handleError(e);
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
