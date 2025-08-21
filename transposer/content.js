let audioContext = null;
let source = null;
let connected = false;
let workletNode = null;

chrome.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    const pitchChange = message.pitchChange;
    const pitchValue = message.pitchValue ?? 1;
    console.log(`State of pitch shift: ${pitchChange}, pitchValue: ${pitchValue}`);

    const videoElements = document.getElementsByClassName("video-stream html5-main-video");
    const video = videoElements.length > 0 ? videoElements[0] : null;
    if (!video) {
        console.log("Video not found.");
        return; 
    }

    if(!audioContext){
        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule(chrome.runtime.getURL("soundtouch-processor.js"));
        audioContext.resume();
        workletNode = new AudioWorkletNode(audioContext, 'soundtouch-processor');
        source = audioContext.createMediaElementSource(video);
    }

    if (workletNode) {
        workletNode.parameters.get('pitch').value = pitchValue;
    }

    if(pitchChange && !connected){
        try {
            source.disconnect();
        } catch (e) {
            console.log("Source was not previously connected directly.");
        }
        source.connect(workletNode).connect(audioContext.destination);
        connected = true; 
        console.log("Audio connected.");
    } else if (!pitchChange && connected) {
        source.disconnect(workletNode);
        workletNode.disconnect();
        source.connect(audioContext.destination); 
        connected = false;
        console.log("Audio disconnected.");
    } else {
        console.log("idk what happend");
    }
}) ;
