function videoView() {
  const videoDiv = document.getElementById('video');
  videoDiv.style.display = 'flex';
  videoDiv.style.flexDirection = 'row';
  videoDiv.style.gap = '20px';
  videoDiv.style.justifyContent = 'space-evenly'
  // videoDiv.style.maxHeight = '35%';
  videoDiv.innerHTML = `      
        <video id="localVideo" autoplay playsinline muted style="width:45%; border:1px solid #ccc; max-height: 75vh"></video>
        <video id="remoteVideo" autoplay playsinline style="width:45%; border:1px solid #ccc; max-height: 75vh;"></video>      
    `;
  document.getElementById('video-controls').style.display = 'block';
}
