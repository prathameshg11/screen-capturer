const { ipcRenderer} = require('electron');
const { writeFile } = require('fs');



let mediaRecorder;                    // MediaRecorder instance to capture footage
const recordedChunks = [];
const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}
const dialog = {
  showSaveDialog: (opts) => ipcRenderer.invoke('SAVE_WINDOW', opts)
}



const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  mediaRecorder.start();
  startBtn.classList.remove('btn-warning');
  startBtn.classList.add('btn-danger');
  startBtn.disabled = true;
  startBtn.innerText = 'Recording';
};



const stopBtn = document.getElementById('stopBtn');
stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('btn-danger');
  startBtn.classList.add('btn-warning');
  startBtn.disabled = false;
  startBtn.innerText = 'Start';
};

function removeAllChildNodes(parent) {
  /***
   * Removes all childeNodes of given parent
   */
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}



const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });
  
  let dropDwn = document.getElementById("drop");
  removeAllChildNodes(dropDwn);
  for(const source of inputSources){
    let listEle = document.createElement("li");
    listEle.innerHTML = `<button type="button" id="${source.id}"class="btn" style="width: 100%;" onclick="selectSource(this.id, this.textContent)">${source.name}</button>`;
    dropDwn.appendChild(listEle);
  }
  
}

const videoElement = document.querySelector('video');
async function selectSource(source_id, source_name) {

  videoSelectBtn.innerText = source_name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source_id
      }
    }
  };

  // Create a Stream
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  // Updates the UI
}

function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }

  while(recordedChunks.length > 0) {      //clearing cache of previous record
    recordedChunks.pop();
  }                                       

}


