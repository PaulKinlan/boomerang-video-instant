const init = async () => {
  let blobs;
  let rec;
  let stream;
  let canvasStream;
  let canvasStreamTrack;
  let frames = [];
  let preferredDevice = 0;
  let width;
  let frameIdx = 0;
  let height;
  let recording = false;
  let playback = false;
  let devices = [];
  let canvasOutput = document.getElementById('output');
  let context = canvasOutput.getContext('2d');
  let preferredCodecs = ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/mp4'];
  let mimeType = preferredCodecs.filter(mime => MediaRecorder.isTypeSupported(mime))[0];
  console.log('Supported mimeType', mimeType);

  let getStream = async () => {
    const deviceId = (devices.length > 0) ? devices[preferredDevice % devices.length].deviceId : undefined;
    // Setting high constraints like this seems to kill Canvas captureStream()
    // const videoConstraint = { width: 1280, height: 720, deviceId: deviceId };
    const videoConstraint = {
      deviceId: deviceId
    };
    return await navigator.mediaDevices.getUserMedia({video: videoConstraint, audio: false});
  };
  
  let renderFrame = () => {
    let imageData;
    if (canvasStreamTrack === undefined) return;
    
    if(recording) {
      context.drawImage(bufferVideo, 0, 0);
      imageData = context.getImageData(0, 0, width, height);
      frames.push(imageData);
    } 
    else {
      if (playback === false) {
        // Use the camera stream.
        context.drawImage(bufferVideo, 0, 0);
      } 
      else {
        canvasOutput.width = canvasOutput.width;
        frameIdx = (++frameIdx) % frames.length;
        context.putImageData(frames[frameIdx], 0, 0);
        if (frameIdx === 0 && rec.state != 'inactive') { 
          rec.stop();
        }
      }
    }
    
    canvasStreamTrack.requestFrame();
    
    requestAnimationFrame(renderFrame);
  };
  
  captureBtn.onclick = async () => {
    stream = await getStream();
    // Populate the device list;
    devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind == 'videoinput');
    if (devices.length > 1) {
      toggleBtn.disabled = false;
    }
    
    canvasStream = canvasOutput.captureStream(0);
    canvasStreamTrack = canvasStream.getTracks()[0];
    bufferVideo.srcObject = stream;
    playbackVideo.srcObject = canvasStream;
    
    blobs = [];
    download.style.display = 'none';
    
    bufferVideo.onloadedmetadata = () => {
      width = bufferVideo.videoWidth;
      height = bufferVideo.videoHeight;
      
      let screenRatio = innerWidth / innerHeight;
      let videoRatio = width / height;
      // We need to map the video to the screen ratio.
      //playbackVideo.style.transform = `scale(${videoRatio})`;

      playbackVideo.width = width;
      playbackVideo.height = height;

      canvasOutput.width = width;
      canvasOutput.height = height;
        
      recordMessage.style.display = 'inline-flex';
      setTimeout(() => {
        recordMessage.style.display = 'none';
      }, 10000);
    }
    
    rec = new MediaRecorder(canvasStream, {mimeType: mimeType});
    rec.ondataavailable = (e) => blobs.push(e.data);
    rec.onstop = async () => {
      let blob = new Blob(blobs, { type: mimeType });
      let url = window.URL.createObjectURL(blob);
      
      downloads.style.display = 'inline-flex';
      download.href = url;
      download.download = 'test.webm';
      download.style.display = 'block';
    };
    
    captureBtn.disabled = true;
    requestAnimationFrame(renderFrame);
  };
  
  toggleBtn.onclick = async () => {
    preferredDevice++;
    stream = await getStream();
    bufferVideo.srcObject = stream;
  };
  
  let startRecording = async () => {
    recording = true;
    frames = [];
    
    downloads.style.display = 'none';
    recordMessage.style.display = 'none';
    
    rec.start(10);
  }
    
  let stopRecording = () => {
    captureBtn.disabled = false;
    toggleBtn.disabled = true;
    
    recording = false;
    playback = true;
    
    stream.getTracks().forEach(s=>s.stop())
    
    frames = [...frames, ...frames.slice(0).reverse()];
    frameIdx = Math.round(frames.length / 2);
  }

  playbackVideo.ontouchstart = () => {
    startRecording();
  };
  
  playbackVideo.ontouchend = () => {
    stopRecording();
  };
  
  playbackVideo.onmousedown = () => {
    startRecording();
  };
  
  playbackVideo.onmouseup = () => {
    stopRecording();
  };
};

window.addEventListener('load', init);