import { useRef, useEffect, useState, useCallback } from 'react';
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
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [currentStream, setCurrentStream] = useState();
    const [sources, setSources] = useState([]);
    const [audioSources, setAudioSources] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [selectedSource, setSelectedSource] = useState('');
    const [selectedAudioSource, setSelectedAudioSource] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [status, setStatus] = useState('Loading...');
    const rotateRef = useRef(0);
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    // const audioContextRef = useRef(null);

    const gotDevices = useCallback((mediaDevices) => {
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        console.log('videoDevices', videoDevices);
        const audioDevices = mediaDevices.filter(device => device.kind === 'audioinput');
        console.log('audioDevices', audioDevices);
        setSources(videoDevices);
        setAudioSources(audioDevices);

        // 在初次加载时设置选定的设备
        if (isFirstLoad) {
            const findVideo = videoDevices.filter(device => device.label.startsWith("VC"));
            if (findVideo.length > 0) {
                setSelectedSource(findVideo[0].deviceId);
            } else if (videoDevices.length > 0) {
                setSelectedSource(videoDevices[0].deviceId);
            }
            const findAudio = audioDevices.filter(device => device.label.startsWith("VC"));
            if (findAudio.length > 0) {
                // 寻找label最短的那个
                let shortest = findAudio[0];
                for (let i = 1; i < findAudio.length; i++) {
                    if (findAudio[i].label.length < shortest.label.length) {
                        shortest = findAudio[i];
                    }
                }
                setSelectedAudioSource(shortest.deviceId);
            } else if (audioDevices.length > 0) {
                setSelectedAudioSource(audioDevices[0].deviceId);
            }

            // 设备加载完成后，设置 isFirstLoad 为 false
            setIsFirstLoad(false);
        }
    }, [isFirstLoad]); // 添加 isFirstLoad 作为依赖项

    // 初始化时，获取支持的流，并设置默认值
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(e => alert(e));
    }, [gotDevices]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            contextRef.current = context;
            // 设置canvas的宽高，这里假设为视频的宽高
            canvas.width = 1920; 
            canvas.height = 1080; 
        }
    }, []);

    const renderVideoToCanvas = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.save();
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate((rotateRef.current * Math.PI) / 180);
            if (rotateRef.current % 180 === 0) {
                context.drawImage(video, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            } else {
                context.drawImage(video, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
            }
            context.restore();
        }
        requestAnimationFrame(renderVideoToCanvas);
    };
    
    function requestFullScreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { // Firefox
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE/Edge
            element.msRequestFullscreen();
        }
    }

    const loadStream = useCallback(() => {
        if (selectedSource === '') {
            navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(e => alert(e));
            return;
        }
        console.log('loadStream', sources.filter(s => s.deviceId === selectedSource).map(s => s.label), selectedSize, audioSources.filter(s => s.deviceId === selectedAudioSource).map(s => s.label));
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
        // const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const constraints = {
            video: videoConstraints,
            audio: {
                deviceId: selectedAudioSource ? {exact: selectedAudioSource} : undefined,
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                sampleRate: 48000
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
                // if (audioContextRef.current) {
                //     audioContextRef.current.close();
                // }
                // audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                // const source = audioContextRef.current.createMediaStreamSource(stream);
                // source.connect(audioContextRef.current.destination);

                setSizes(sizeList);
                setStatus(`Video: ${sources.filter(source => source.deviceId === selectedSource).map(source => source.label)} ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                const canvas = canvasRef.current;
                canvas.width = rotateRef.current % 180 === 0 ? videoRef.current.videoWidth : videoRef.current.videoHeight;
                canvas.height = rotateRef.current % 180 === 0 ? videoRef.current.videoHeight : videoRef.current.videoWidth;
                renderVideoToCanvas();
            };
      }).catch(handleError);
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

    function rotateVideo() {
        rotateRef.current = (rotateRef.current + 90) % 360;
        console.log('rotateVideo', rotateRef.current);
        const canvas = canvasRef.current;
        const video = videoRef.current;
        // 设置canvas的尺寸
        canvas.width = rotateRef.current % 180 === 0 ? video.videoWidth : video.videoHeight;
        canvas.height = rotateRef.current % 180 === 0 ? video.videoHeight : video.videoWidth;
    }

    function handleError(error) {
        console.error('Error: ', error);
        if (error.name === 'NotAllowedError') {
            alert('Permission to access camera was denied. Please grant access to use this feature.');
        }
    }

    return (
        <div className="web-capture-app">
            <video className="video-base" ref={videoRef} autoPlay playsInline controls/>
            <div className="video-area">
                <canvas ref={canvasRef} />
            </div>
            <div className="settings">
                <button onClick={loadStream}>Start</button>
                <button onClick={rotateVideo}>
                    <svg t="1686668704389" className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1463" data-darkreader-inline-fill="" width="20" height="20" fill="white"><path d="M480.5 251.2c13-1.6 25.9-2.4 38.8-2.5v63.9c0 6.5 7.5 10.1 12.6 6.1L660 217.6c4-3.2 4-9.2 0-12.3l-128-101c-5.1-4-12.6-0.4-12.6 6.1l-0.2 64c-118.6 0.5-235.8 53.4-314.6 154.2-69.6 89.2-95.7 198.6-81.1 302.4h74.9c-0.9-5.3-1.7-10.7-2.4-16.1-5.1-42.1-2.1-84.1 8.9-124.8 11.4-42.2 31-81.1 58.1-115.8 27.2-34.7 60.3-63.2 98.4-84.3 37-20.6 76.9-33.6 119.1-38.8z" p-id="1464"></path><path d="M880 418H352c-17.7 0-32 14.3-32 32v414c0 17.7 14.3 32 32 32h528c17.7 0 32-14.3 32-32V450c0-17.7-14.3-32-32-32z m-44 402H396V494h440v326z" p-id="1465"></path></svg>
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
                <button onClick={() => requestFullScreen(canvasRef.current)}>Fullscreen</button>
            </div>
            <p className="status">
              {status}
            </p>
            <a href="https://github.com/boybook/web-capture" className="about">
                <svg height="20" width="20" aria-hidden="true" viewBox="0 0 16 16" version="1.1" data-view-component="true" className="octicon octicon-mark-github v-align-middle" fill="white">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                Open source on GitHub
            </a>
        </div>
    );
}

export default App;
