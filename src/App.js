import React, { useRef, useEffect, useState } from 'react';
import './App.css';

const commonResolutions = [
    {width: 640, height: 480},  // VGA
    {width: 800, height: 600},  // SVGA
    {width: 1024, height: 768}, // XGA
    {width: 1280, height: 720}, // HD
    {width: 1920, height: 1080}, // Full HD
    {width: 2560, height: 1440}, // QHD
    {width: 3840, height: 2160}, // 4K UHD
];

function App() {
    const videoRef = useRef(null);
    const [currentStream, setCurrentStream] = useState();
    const [sources, setSources] = useState([]);
    const [audioSources, setAudioSources] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [selectedSource, setSelectedSource] = useState('');
    const [selectedAudioSource, setSelectedAudioSource] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [status, setStatus] = useState('Loading...');

    // 初始化时，获取支持的流，并设置默认值
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
    }, []);

    // 当手动切换当前已选择的任意属性时，重新获取流
    useEffect(() => {
        if (selectedSize || selectedSource || selectedAudioSource) {
            loadStream();
        }
    }, [selectedSize, selectedSource, selectedAudioSource]);

    function stopMediaTracks(stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }

    function loadStream() {
        if (typeof currentStream !== 'undefined') {
            stopMediaTracks(currentStream);
        }
        const videoConstraints = {};
        if (selectedSource === '') {
            videoConstraints.facingMode = 'environment';
        } else {
            videoConstraints.deviceId = { exact: selectedSource };
        }
        const selectedSizeArray = selectedSize.split('x');
        if (selectedSizeArray.length === 2) {
            videoConstraints.width = { exact: parseInt(selectedSizeArray[0]) };
            videoConstraints.height = { exact: parseInt(selectedSizeArray[1]) };
        }
        const constraints = {
            video: videoConstraints,
            audio: {
                deviceId: selectedAudioSource ? {exact: selectedAudioSource} : undefined,
            },
        };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setCurrentStream(stream);
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            
            console.log(source.channelCount);
            console.log(audioContext.sampleRate);
            videoRef.current.srcObject = stream;
            // 在元数据已加载后获取视频分辨率
            videoRef.current.onloadedmetadata = () => {
              const track = stream.getVideoTracks()[0];
              const capabilities = track.getCapabilities();
              const sizeList = []
              commonResolutions.forEach(({width, height}) => {
                  if (width >= capabilities.width.min && width <= capabilities.width.max &&
                      height >= capabilities.height.min && height <= capabilities.height.max) {
                      const option = {
                        'width': width,
                        'height': height
                      }
                      // if (option.value === selectedSize) {
                      //     selectedSize(option.value)
                      // }
                      sizeList.push(option);
                  }
              });
              setSizes(sizeList);
              setStatus(`Video: ${selectedSource} ${videoRef.current.videoWidth}x${videoRef.current.videoHeight} Audio: ${selectedAudioSource} `);
            };
            return navigator.mediaDevices.enumerateDevices();
        }).then(gotDevices).catch(handleError);
    }

    function gotDevices(mediaDevices) {
        console.log(mediaDevices);
        setSources(mediaDevices.filter(device => device.kind === 'videoinput'));
        setAudioSources(mediaDevices.filter(device => device.kind === 'audioinput'));
    }

    function handleError(error) {
        console.error('Error: ', error);
        if (error.name === 'NotAllowedError') {
            alert('Permission to access camera was denied. Please grant access to use this feature.');
        }
    }

    return (
        <div className="web-capture-app">
            <div class="video-area">
                <video ref={videoRef} autoPlay playsInline controls />
            </div>
            <div class="settings">
                <button onClick={loadStream}>Start</button>
                <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
                    {sources.map((source, index) =>
                        <option key={index} value={source.deviceId}>{source.label || `Camera ${index + 1}`}</option>
                    )}
                </select>
                <select value={selectedAudioSource} onChange={e => setSelectedAudioSource(e.target.value)}>
                    {audioSources.map((source, index) =>
                        <option key={index} value={source.deviceId}>{source.label || `Microphone ${index + 1}`}</option>
                    )}
                </select>
                <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}>
                    {sizes.map((size, index) =>
                        <option key={index} value={`${size.width}x${size.height}`}>{`${size.width}x${size.height}`}</option>
                    )}
                </select>
            </div>
        </div>
    );
}

export default App;
