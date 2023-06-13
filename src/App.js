import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    const [rotate, setRotate] = useState(0);

    // 初始化时，获取支持的流，并设置默认值
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
    }, []);

    const loadStream = useCallback(() => {
      console.log('loadStream')
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
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
          },
      };
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
          setCurrentStream(stream);
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
                    sizeList.push(option);
                    // 默认1080P
                    if (selectedSize === '' && option.width === 1920 && option.height === 1080) {
                        setSelectedSize(`${option.width}x${option.height}`)
                    }
                }
            });
            setSizes(sizeList);
            setStatus(`Video: ${selectedSource} ${videoRef.current.videoWidth}x${videoRef.current.videoHeight} Audio: ${selectedAudioSource} `);
          };
          return navigator.mediaDevices.enumerateDevices();
      }).then(gotDevices).catch(handleError);
    // eslint-disable-next-line
    }, [selectedSize, selectedSource, selectedAudioSource]);

    // 当手动切换当前已选择的任意属性时，重新获取流
    useEffect(() => {
        loadStream();
    }, [selectedSize, selectedSource, selectedAudioSource, loadStream]);
    
    function stopMediaTracks(stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }

    function gotDevices(mediaDevices) {
        console.log(mediaDevices);
        setSources(mediaDevices.filter(device => device.kind === 'videoinput'));
        setAudioSources(mediaDevices.filter(device => device.kind === 'audioinput'));
    }

    function rotateVideo() {
        setRotate((rotate + 90) % 360);
    }

    function handleError(error) {
        console.error('Error: ', error);
        if (error.name === 'NotAllowedError') {
            alert('Permission to access camera was denied. Please grant access to use this feature.');
        }
    }

    return (
        <div className="web-capture-app">
            <div className="video-area">
                <video ref={videoRef} autoPlay playsInline controls style={{transform: `rotate(${rotate}deg)`}}/>
            </div>
            <div className="settings">
                <button onClick={loadStream}>Start</button>
                <button onClick={rotateVideo}>
                    <svg t="1686668704389" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1463" data-darkreader-inline-fill="" width="20" height="20" fill="white"><path d="M480.5 251.2c13-1.6 25.9-2.4 38.8-2.5v63.9c0 6.5 7.5 10.1 12.6 6.1L660 217.6c4-3.2 4-9.2 0-12.3l-128-101c-5.1-4-12.6-0.4-12.6 6.1l-0.2 64c-118.6 0.5-235.8 53.4-314.6 154.2-69.6 89.2-95.7 198.6-81.1 302.4h74.9c-0.9-5.3-1.7-10.7-2.4-16.1-5.1-42.1-2.1-84.1 8.9-124.8 11.4-42.2 31-81.1 58.1-115.8 27.2-34.7 60.3-63.2 98.4-84.3 37-20.6 76.9-33.6 119.1-38.8z" p-id="1464"></path><path d="M880 418H352c-17.7 0-32 14.3-32 32v414c0 17.7 14.3 32 32 32h528c17.7 0 32-14.3 32-32V450c0-17.7-14.3-32-32-32z m-44 402H396V494h440v326z" p-id="1465"></path></svg>
                </button>
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
            <p className="status">
              {status}
            </p>
        </div>
    );
}

export default App;
