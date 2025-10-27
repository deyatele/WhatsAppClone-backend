// client.js
'use strict';
const baseUrl = window.__BASE_URL__ || window.location.origin;
window.baseUrl = baseUrl;

if (typeof log !== 'function') {
  window.log = function () {
    console.log.apply(console, arguments);
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  let socket = null;
  let token = '';
  let rooms = [];
  let myId = null;
  let localStream = null;
  let peerConnection = null;
  let isInCall = false;
  let currentCallUserId = null;
  let currentCallId = null;
  let suppressRestart = false;
  let iceCandidateBuffer = [];
  const MAX_ICE_CANDIDATES = 20;
  let joinedChatId = null;
  let pendingCallChatId = null;
  let currentVideoIndex = 0;
  let currentVideoTrack = null;
  let frontCamera;
  let backCamera;
  let usingFront = true;
  let isScreenSharing = false;
  let savedCameraTrack = null;

  async function getLocalStream() {
    if (localStream) return localStream;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const msg =
        '❌ getUserMedia is not available. The page must be served over HTTPS or from localhost for camera/mic access.';
      log(msg);
      try {
        alert(
          msg +
            '\n\nUse https or open via localhost, or use an HTTPS tunnel (ngrok) for LAN testing.',
        );
      } catch (e) {}
      throw new Error('getUserMedia not available');
    }

    try {
      const constraints = {
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: { autoGainControl: false, noiseSuppression: true, echoCancellation: true },
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      const localVideo = document.getElementById('localVideo');
      if (localVideo) localVideo.srcObject = localStream;
      return localStream;
    } catch (err) {
      log('❌ getUserMedia failed: ' + (err && err.message ? err.message : String(err)));
      throw err;
    }
  }

  window.toggleVideo = () => {
    if (!localStream) return log('⚠️ No localStream to toggle video');
    const videoTracks = localStream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) return log('⚠️ No video tracks found');
    videoTracks.forEach((track) => (track.enabled = !track.enabled));
    log(`🎬 Camera ${videoTracks[0].enabled ? 'ON' : 'OFF'}`);
  };

  window.toggleAudio = () => {
    if (!localStream) return log('⚠️ No localStream to toggle audio');
    const track = localStream.getAudioTracks()[0];
    if (!track) return log('⚠️ No audio track');
    track.enabled = !track.enabled;
    log(`🎤 Microphone ${track.enabled ? 'ON' : 'OFF'}`);
  };
  async function initVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    // Ищем переднюю и заднюю камеру
    frontCamera = videoInputs.find((d) => /front|user|передней/i.test(d.label)) || videoInputs[0];
    backCamera = videoInputs.find((d) => /back|rear|environment|задней/i.test(d.label)) || videoInputs[0];
    log('Divice', devices)
    log('Video devices:', videoInputs);
    log('Front camera:', frontCamera ? frontCamera.label : 'None');
    log('Back camera:', backCamera ? backCamera.label : 'None');
  }
  await initVideoDevices();
  async function switchCamera() {
    try {
      log(frontCamera?.label)
      log(backCamera?.label)
      if (!frontCamera?.label || !backCamera?.label) await initVideoDevices();
      if (!localStream) {
        log('⚠️ Нет localStream, сначала вызови getLocalStream()');
        return;
      }

      // Определяем текущий трек
      const oldTrack = currentVideoTrack || localStream.getVideoTracks()[0];
      if (oldTrack) {
        localStream.removeTrack(oldTrack);
        oldTrack.stop(); 
      }

      const device = usingFront ? backCamera : frontCamera;
      usingFront = !usingFront;

      // Получаем поток с новой камерой
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } },
        audio: false,
      });

      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return log('⚠️ Не удалось получить новый видео-трек');

      // Если в звонке — заменяем трек в RTCPeerConnection
      if (peerConnection) {
        const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }

      localStream.addTrack(newTrack);
      currentVideoTrack = newTrack;

      const localVideo = document.getElementById('localVideo');

      if (localVideo) {
        localVideo.srcObject = null;
        localVideo.srcObject = localStream;
        localVideo.play().catch((e) => {
          log(e);
        });
      }

      log(`🎬 Камера переключена на: ${device.label || 'неизвестная'}`);
    } catch (e) {
      log('❌ Не удалось переключить камеру: ' + (e.message || e));
    }
  }

  // вызвать кнопку
  window.switchCamera = switchCamera;
  window.toggleScreenShare = async () => {
    if (!peerConnection) return log('⚠️ Нет peerConnection');

    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) return;

        // сохранить текущую камеру
        const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          savedCameraTrack = sender.track;
          await sender.replaceTrack(screenTrack);
        }

        // показать локально
        const localVideo = document.getElementById('localVideo');
        if (localVideo) localVideo.srcObject = displayStream;

        screenTrack.onended = () => {
          window.toggleScreenShare(); // вернуть камеру
        };

        isScreenSharing = true;
        log('🖥 Демонстрация экрана включена');
      } catch (e) {
        log('❌ Не удалось включить screen share: ' + e.message);
      }
    } else {
      // вернуть камеру
      if (savedCameraTrack) {
        const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(savedCameraTrack);

        const localVideo = document.getElementById('localVideo');
        if (localVideo) localVideo.srcObject = localStream;
      }
      isScreenSharing = false;
      log('🖥 Демонстрация экрана выключена');
    }
  };
  window.toggleRemote = () => {
    const remoteVideo = document.getElementById('remoteVideo');
    if (!remoteVideo) return log('⚠️ No remoteVideo element');
    remoteVideo.muted = !remoteVideo.muted;
    log(`🔇 Remote audio ${remoteVideo.muted ? 'MUTED' : 'UNMUTED'}`);
  };

  async function restartIce() {
    if (!peerConnection) return log('⚠️ No peerConnection for ICE restart');
    if (peerConnection.signalingState !== 'stable') return log('⚠️ Signaling state is not stable');
    if (!currentCallUserId) return log('❌ Cannot restart ICE: no current call user ID');

    try {
      log('🔄 Restarting ICE...');
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);

      if (socket && socket.emit) {
        socket.emit('call:offer', {
          to: currentCallUserId,
          sdp: peerConnection.localDescription,
          iceRestart: true,
        });
        log('📤 ICE restart offer sent to ' + currentCallUserId);
      }
    } catch (error) {
      log('❌ ICE restart failed: ' + (error && error.message ? error.message : String(error)));
    }
  }

  async function processBufferedCandidates() {
    if (!peerConnection) return;
    if (iceCandidateBuffer.length === 0) return;
    log(`🔄 Processing ${iceCandidateBuffer.length} buffered ICE candidates`);
    for (const candidate of iceCandidateBuffer) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        log('❌ Buffered ICE candidate error: ' + (err && err.message ? err.message : String(err)));
      }
    }
    iceCandidateBuffer = [];
  }

  async function initPeerConnection(userId) {
    let turn = { urls: [], username: '', credential: '' };
    try {
      if (typeof getTurnConfig === 'function') {
        turn = await getTurnConfig(myId);
      }
    } catch (err) {
      log(
        '⚠️ getTurnConfig failed or not available: ' +
          (err && err.message ? err.message : String(err)),
      );
    }

    const turnUrls = (turn && Array.isArray(turn.urls) ? turn.urls : []).filter(
      (url) => url && (url.includes('turn:') || url.includes('turns:')),
    );
    const iceServers = [];
    if (turnUrls.length > 0) {
      iceServers.push({ urls: turnUrls, username: turn.username, credential: turn.credential });
    }
    // iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
    // iceServers.push({ urls: 'stun:stun1.l.google.com:19302' });

    const config = { iceServers, iceTransportPolicy: 'relay' };

    peerConnection = new RTCPeerConnection(config);
    peerConnection.remoteIceCandidates = [];
    peerConnection.isRemoteDescriptionSet = false;

    const stream = await getLocalStream();
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = (event) => {
      log('📡 Remote track received - streams: ' + (event.streams ? event.streams.length : 0));
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo && event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        log('✅ Remote video source set');
      } else {
        log('❌ No remote stream in track event');
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event && event.candidate && socket && socket.emit) {
        socket.emit('call:candidate', { to: userId, candidate: event.candidate });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      log('🌐 ICE state: ' + state);

      if (!suppressRestart && (state === 'disconnected' || state === 'failed')) {
        log('🔄 Attempting to restore connection...');
        setTimeout(() => {
          if (
            !suppressRestart &&
            peerConnection &&
            (peerConnection.iceConnectionState === 'disconnected' ||
              peerConnection.iceConnectionState === 'failed')
          ) {
            restartIce();
          }
        }, 2000);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      log('🔗 Connection state: ' + peerConnection.connectionState);
    };
  }

  async function startCall(userId) {
    log('🎥 Starting video call...');
    videoView();
    currentCallUserId = userId;
    try {
      await initPeerConnection(userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      if (socket && socket.emit)
        socket.emit('call:start', { to: userId, sdp: peerConnection.localDescription });
      if (socket && socket.emit)
        socket.emit('call:offer', { to: userId, sdp: peerConnection.localDescription });
      log('📤 Offer sent');
      isInCall = true;
    } catch (error) {
      console.error(error);
      log('❌ Error starting call: ' + (error && error.message ? error.message : String(error)));
      endCall();
    }
  }

  window.connect = async (tokenId) => {
    const input = document.getElementById(tokenId);
    token = input && input.value ? input.value.trim() : '';
    if (!token) return alert('Введите JWT токен');

    socket = io(baseUrl, { auth: { token } });

    socket.on('connect', () => {
      log('✅ Connected');
      loadRooms();
    });
    socket.on('disconnect', (reason) => log('❌ Disconnected: ' + String(reason)));
    socket.on('connect_error', (err) =>
      log('❌ connect_error: ' + (err && err.message ? err.message : String(err))),
    );
    socket.on('ошибка', (data) => log('⚠️ Ошибка: ' + JSON.stringify(data)));
    socket.on('id', (id) => {
      myId = id;
      log('My ID: ' + id);
    });
    socket.on('message:new', (msg) => log('📩 New message: ' + JSON.stringify(msg)));

    socket.on('connected:user', (payload) => {
      if (payload && payload.userId) {
        myId = payload.userId;
        log('Connected:user -> ' + myId);
      }
    });

    socket.on('chat:joined', (payload) => {
      if (!payload || !payload.chatId) return;
      joinedChatId = payload.chatId;
      log('✅ Joined chat: ' + joinedChatId);
      if (pendingCallChatId && pendingCallChatId == joinedChatId) {
        const room = rooms.find((r) => r.id == joinedChatId);
        pendingCallChatId = null;
        if (room) {
          const users = room.participants.filter((u) => u.userId != myId);
          if (users.length > 0) startCall(users[0].userId);
        }
      }
    });

    socket.on('call:incoming', async (payload) => {
      try {
        const from = payload.from;
        const sdp = payload.sdp;
        if (payload && payload.id) currentCallId = payload.id;
        log('BUSINESS: call:incoming from ' + from + ' callId=' + currentCallId);
        if (sdp) {
          if (isInCall) {
            log('⚠️ Incoming business call ignored, already in call');
            if (socket && socket.emit) socket.emit('call:reject', { to: from });
            return;
          }
          isInCall = true;
          currentCallUserId = from;
          videoView();
          await initPeerConnection(from);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
          peerConnection.isRemoteDescriptionSet = true;
          await processBufferedCandidates();
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          if (socket && socket.emit)
            socket.emit('call:answer', { to: from, sdp: peerConnection.localDescription });
          log('📤 Answer sent (business) to ' + from);
        }
      } catch (err) {
        console.error(err);
        log(
          '❌ Error handling business incoming call: ' +
            (err && err.message ? err.message : String(err)),
        );
        isInCall = false;
        endCall();
      }
    });

    socket.on('call:started', (payload) => {
      try {
        if (payload && payload.call && payload.call.id) {
          currentCallId = payload.call.id;
          log('✅ call started, callId=' + currentCallId);
        }
      } catch (err) {
        log('⚠️ call:started processing error: ' + String(err));
      }
    });

    socket.on('call:accepted', (payload) => {
      try {
        if (payload && payload.id) {
          currentCallId = payload.id;
        } else if (payload && payload.call && payload.call.id) {
          currentCallId = payload.call.id;
        }
        log('✅ call accepted, callId=' + currentCallId);
      } catch (err) {
        log('⚠️ call:accepted processing error: ' + String(err));
      }
    });

    socket.on('call:ended', (payload) => {
      log('📴 call:ended received', payload);
      currentCallId = null;
      endCall();
    });

    socket.on('call:offer', async ({ from, sdp }) => {
      log('SIGNAL: call:offer from', from);
      if (isInCall) {
        log('⚠️ Offer проигнорирован');
        socket.emit('call:reject', { to: from, callId: currentCallId });
        return;
      }
      isInCall = true;
      currentCallUserId = from;
      log('📞 Incoming call from ' + from);
      videoView();
      try {
        await initPeerConnection(from);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        peerConnection.isRemoteDescriptionSet = true;
        log('setRemoteDescription(offer) done');

        if (
          Array.isArray(peerConnection.remoteIceCandidates) &&
          peerConnection.remoteIceCandidates.length > 0
        ) {
          log(
            '🔄 Processing ' +
              peerConnection.remoteIceCandidates.length +
              ' buffered ICE candidates',
          );
          for (const candidate of peerConnection.remoteIceCandidates) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              log(
                '❌ Buffered ICE candidate error: ' +
                  (err && err.message ? err.message : String(err)),
              );
            }
          }
          peerConnection.remoteIceCandidates = [];
        }

        processBufferedCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        if (socket && socket.emit)
          socket.emit('call:answer', { to: from, sdp: peerConnection.localDescription });
        log('📤 Answer отправлен ' + from);
      } catch (err) {
        console.error(err);
        log('❌ Error handling offer: ' + (err && err.message ? err.message : String(err)));
        isInCall = false;
        endCall();
      }
    });

    socket.on('call:answer', async ({ from, sdp }) => {
      log('SIGNAL: call:answer from ' + from);
      if (!peerConnection) return log('No peerConnection to set answer');
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        peerConnection.isRemoteDescriptionSet = true;
        log('setRemoteDescription(answer) done');

        if (
          Array.isArray(peerConnection.remoteIceCandidates) &&
          peerConnection.remoteIceCandidates.length > 0
        ) {
          log(
            '🔄 Processing ' +
              peerConnection.remoteIceCandidates.length +
              ' buffered ICE candidates',
          );
          for (const candidate of peerConnection.remoteIceCandidates) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              log(
                '❌ Buffered ICE candidate error: ' +
                  (err && err.message ? err.message : String(err)),
              );
            }
          }
          peerConnection.remoteIceCandidates = [];
        }

        processBufferedCandidates();
      } catch (err) {
        console.error('setRemoteDescription(answer) failed:', err);
        log(
          '❌ Error setting remote description: ' +
            (err && err.message ? err.message : String(err)),
        );
      }
    });

    socket.on('call:candidate', async ({ from, candidate }) => {
      if (!candidate) return;

      if (!peerConnection) {
        iceCandidateBuffer.push(candidate);
        if (iceCandidateBuffer.length > MAX_ICE_CANDIDATES) {
          iceCandidateBuffer = iceCandidateBuffer.slice(-MAX_ICE_CANDIDATES);
        }
        return log(
          `💾 Buffered ICE candidate (no peerConnection) (${iceCandidateBuffer.length}/${MAX_ICE_CANDIDATES})`,
        );
      }

      try {
        if (!peerConnection.isRemoteDescriptionSet) {
          iceCandidateBuffer.push(candidate);
          if (iceCandidateBuffer.length > MAX_ICE_CANDIDATES) {
            iceCandidateBuffer = iceCandidateBuffer.slice(-MAX_ICE_CANDIDATES);
            log('⚠️ ICE candidate buffer trimmed to recent candidates');
          }
          return log(
            `💾 Buffering ICE candidate (${iceCandidateBuffer.length}/${MAX_ICE_CANDIDATES})`,
          );
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        log('➕ ICE candidate added from ' + from);
      } catch (err) {
        log('❌ ICE error: ' + (err && err.message ? err.message : String(err)));
      }
    });
  };

  window.startCall = startCall;

  window.endCall = () => {
    try {
      if (socket && socket.emit && currentCallId)
        socket.emit('call:end', { callId: currentCallId });
    } catch (e) {
      log('⚠️ Failed to notify server about call end: ' + String(e));
    }

    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.oniceconnectionstatechange = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnection = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
    isInCall = false;
    suppressRestart = true;
    currentCallUserId = null;
    currentCallId = null;
    iceCandidateBuffer = [];

    const videoEl = document.getElementById('video');
    if (videoEl) videoEl.innerHTML = '';
    const controls = document.getElementById('video-controls');
    if (controls) controls.style.display = 'none';
    log('❌ Call ended');
  };

  function notifyServerCallEnd() {
    try {
      if (currentCallId) {
        if (socket && socket.emit) {
          socket.emit('call:end', { callId: currentCallId });
        }
        try {
          if (token) {
            fetch(`${baseUrl}/calls/${currentCallId}/end`, {
              method: 'PATCH',
              headers: { Authorization: 'Bearer ' + token },
              keepalive: true,
            }).catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }

  window.addEventListener('beforeunload', notifyServerCallEnd);
  window.addEventListener('pagehide', notifyServerCallEnd);

  async function loadRooms() {
    if (!token) return;
    try {
      const res = await fetch(baseUrl + '/chats/my', {
        headers: { Authorization: 'Bearer ' + token },
      });
      rooms = await res.json();
      const roomsDiv = document.getElementById('rooms');
      if (!roomsDiv) return log('⚠️ rooms container not found');
      roomsDiv.innerHTML = '';
      rooms.forEach((room) => {
        const div = document.createElement('div');
        div.className = 'room';
        div.textContent = 'Chat ' + room.id;
        div.onclick = () => joinRoom(room.id, true);
        roomsDiv.appendChild(div);
      });
      log('📂 Loaded rooms: ' + rooms.length);
    } catch (err) {
      log('❌ Failed to load rooms: ' + (err && err.message ? err.message : String(err)));
    }
  }

  window.callRoom = (chatId) => {
    const room = rooms.find((r) => r.id == chatId);
    if (!room) return;
    const users = room.participants.filter((u) => u.userId != myId);
    if (users.length > 0) startCall(users[0].userId);
  };

  window.joinRoom = (chatId, autoCall = false) => {
    if (!socket) return log('⚠️ Not connected to socket');
    if (!chatId) return;
    if (autoCall) pendingCallChatId = chatId;
    socket.emit('chat:join', { chatId });
    log('📥 Sent chat:join -> ' + chatId);
  };

  window.sendMessage = (chatId, text) => {
    if (!socket) return log('⚠️ Not connected to socket');
    socket.emit('message:send', { chatId, text });
  };
});
