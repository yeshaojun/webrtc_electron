const { ipcRenderer, dialog, screen } = require("electron");
const fs = require("fs");
const io = require("socket.io-client");
const socket = io.connect("http://localhost:3000");
const log = require("electron-log");
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

let conversationId = "";

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
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
        },
      },
    });
    console.log("stream", stream);
    const peer = new RTCPeerConnection(PEERCONFIG);
    const channel = peer.createDataChannel("chat");
    channel.onopen = (e) => {
      console.log("onopen", e);
    };
    conversationId = params.conversationId;
    peer.onconnectionstatechange = () => {
      // console.log(peer.connectionState)
      if (peer.connectionState === "disconnected") {
        dialog.showErrorBox("远程桌面已结束！", "");
        socket.emit("remoteClose", {
          conversationId: params.conversationId,
        });
        // ipcRenderer.send("close");
      }
    };

    channel.onmessage = (e) => {
      var eventData = JSON.parse(e.data);
      if (eventData.type === "scroll") {
        ipcRenderer.send("scroll", { x: eventData.x, y: eventData.y });
      } else if (eventData.type === "mousemove") {
        ipcRenderer.send("mousemove", { x: eventData.x, y: eventData.y });
      } else if (eventData.type === "keydown") {
        ipcRenderer.send("keydown", { key: eventData.key });
      } else if (eventData.type === "mousedown") {
        ipcRenderer.send("mousedown", { key: eventData.key });
      } else if (eventData.type === "mouseup") {
        ipcRenderer.send("mouseup", { key: eventData.key });
      } else if (eventData.type === "copy") {
        ipcRenderer.send("copy", { key: eventData.key });
      } else if (eventData.type === "paste") {
        ipcRenderer.send("paste", { key: eventData.key });
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
      document.getElementById("tip").innerText = "正在进行远程控制";
      socket.on("toUserCandidate", (candidate) => {
        console.log("toUserCandidate");
        peer.addIceCandidate(candidate);
      });

      console.log("reegister");
      socket.on("answer", async (answer) => {
        console.log("answer", answer);
        await peer.setRemoteDescription(answer);
      });

      socket.on("remoteClose", () => {
        log.info("remoteClose");
        // dialog.showErrorBox("远程桌面已结束！", "");
        ipcRenderer.send("close");
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

window.addEventListener("DOMContentLoaded", () => {
  // 获取按钮元素
  document.getElementById("end-control").addEventListener("click", (event) => {
    socket.emit("remoteClose", {
      conversationId,
    });
    setTimeout(() => {
      ipcRenderer.send("close");
    }, 1000);
  });
});
