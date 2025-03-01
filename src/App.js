import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const App = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const mountRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  // Material state
  const [materialProps, setMaterialProps] = useState({});

  // Animation state
  const [animationClips, setAnimationClips] = useState([]);
  const [currentClip, setCurrentClip] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize scene
  useEffect(() => {

    console.log(mountRef.current.clientWidth, mountRef.current.clientHeight)
    let DOM_WIDTH = mountRef.current.clientWidth;
    let DOM_HEIGHT = mountRef.current.clientHeight;
    // Setup camera
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      DOM_WIDTH / DOM_HEIGHT,
      0.1,
      1000
    );
    cameraRef.current.position.z = 5;

    // Setup renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(DOM_WIDTH, DOM_HEIGHT);
    rendererRef.current.setClearColor("rgb(178, 190, 181)");
    mountRef.current.appendChild(rendererRef.current.domElement);

    // Setup controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    sceneRef.current.add(gridHelper);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 10); // Soft light
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
    directionalLight.quaternion.copy(cameraRef.current.quaternion);
    directionalLight.castShadow = true;
    sceneRef.current.add(directionalLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      controlsRef.current.update();

      const delta = clockRef.current.getDelta();
      if (mixerRef.current && isPlaying) {
        mixerRef.current.update(delta);
        setCurrentTime(mixerRef.current.time);
      }
    };
    animate();

    return () => {
      mountRef.current.removeChild(rendererRef.current.domElement);
      sceneRef.current.clear();
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, []);

  // Handle file input
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }

    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(URL.createObjectURL(file));
      
      // Process model nodes
      const processNode = (node, parent = null) => {
        const newNode = {
          id: node.uuid,
          name: node.name || 'Unnamed',
          type: node.type,
          children: [],
          visible: node.visible,
          userData: node.userData,
          threeObj: node
        };

        node.children.forEach(child => {
          newNode.children.push(processNode(child, newNode));
        });

        if (parent) parent.children.push(newNode);
        return newNode;
      };

      const modelNodes = gltf.scene.children.map(child => processNode(child));
      setNodes(modelNodes);
      sceneRef.current.add(gltf.scene);

      // Initialize animations
      if (gltf.animations.length > 0) {
        setAnimationClips(gltf.animations);
        mixerRef.current = new THREE.AnimationMixer(gltf.scene);
      } else {
        setAnimationClips([]);
        mixerRef.current = null;
      }


      setError(null);

    } catch (err) {
      setError('Failed to load model'+ ' ' + err.message);
    }
  };

  // Handle node selection
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    // Highlight selected object
    // Update material props state
    
    sceneRef.current.traverse(obj => {
      if (obj.isMesh) {
        obj.material.emissive.setHex(
          obj === node.threeObj ? 0xff0000 : 0x000000
        );
        const mat = obj.material;
        console.log(mat);
        setMaterialProps({
          color: mat.color,
          emissive: mat.emissive,
          roughness: mat.roughness,
          metalness: mat.metalness
        });
      }
    });
  };

  // Handle transform updates
  const updateTransform = (type, axis, value) => {
    if (!selectedNode) return;
    
    const numericValue = parseFloat(value) || 0;
    const threeObj = selectedNode.threeObj;
    
    switch(type) {
      case 'position':
        threeObj.position[axis] = numericValue;
        break;
      case 'rotation':
        threeObj.rotation[axis] = THREE.MathUtils.degToRad(numericValue);
        break;
      case 'scale':
        threeObj.scale[axis] = numericValue;
        break;
    }
    
    setNodes(prev => [...prev]); // Force re-render
  };

  // Filter nodes based on search
  const filteredNodes = nodes.filter(node => 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.children.some(child => child.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Hierarchy tree component
  const TreeNode = ({ node, depth = 0 }) => (
    <div style={{ marginLeft: depth * 20 }}>
      <div 
        onClick={() => handleNodeSelect(node)}
        style={{ 
          fontWeight: selectedNode?.id === node.id ? 'bold' : 'normal',
          cursor: 'pointer'
        }}
      >
        {node.children.length > 0 && (
          <button onClick={() => setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(node.id) ? next.delete(node.id) : next.add(node.id);
            return next;
          })}>
            {expandedNodes.has(node.id) ? '▼' : '▶'}
          </button>
        )}
        {node.name}
      </div>
      {expandedNodes.has(node.id) && node.children.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );

  // Animation controls
  const handlePlayPause = () => {
    if (!mixerRef.current || currentClip === null) return;
    
    if (isPlaying) {
      mixerRef.current.timeScale = 0;
    } else {
      const action = mixerRef.current.clipAction(animationClips[currentClip]);
      action.play();
      mixerRef.current.timeScale = 1;
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Material controls
  const handleMaterialChange = (property, value) => {
    if (!selectedNode?.threeObj?.material) return;
    
    console.log(selectedNode)
    const material = selectedNode.threeObj.material;
    switch(property) {
      case 'color':
        material[property].set(new THREE.Color(value));
        break;
      case 'emissive':
        material[property].set(new THREE.Color(value));
        break;
      case 'roughness':
        material[property] = parseFloat(value);
        break;
      case 'metalness':
        material[property] = parseFloat(value);
        break;
      case 'map':
        new THREE.TextureLoader().load(URL.createObjectURL(value), texture => {
          material.map = texture;
          material.needsUpdate = true;
        });
        break;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel */}
      <div style={{ width: '300px', padding: '10px', borderRight: '1px solid #ccc' }}>
        <input
          type="file"
          accept=".gltf,.glb"
          onChange={handleFileUpload}
          style={{ marginBottom: '10px' }}
        />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '10px', width: '100%' }}
        />
        
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto' }}>
          {filteredNodes.map(node => (
            <TreeNode key={node.id} node={node} />
          ))}
        </div>
      </div>

      {/* Viewport */}
      <div ref={mountRef} style={{ flexGrow: 1 }} />

      {/* Right Panel */}
      <div style={{ width: '300px', padding: '10px', borderLeft: '1px solid #ccc' }}>
        {selectedNode ? (
          <>
            <h3>Transform Controls</h3>
            {['position', 'rotation', 'scale'].map((type) => (
              <div key={type} style={{ marginBottom: '10px' }}>
                <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                {['x', 'y', 'z'].map((axis, i) => (
                  <div key={axis}>
                    <label>
                      {axis.toUpperCase()}:
                      <input
                        type="number"
                        step={type === 'rotation' ? 1 : 0.1}
                        value={
                          type === 'rotation'
                            ? THREE.MathUtils.radToDeg(selectedNode.threeObj[type][axis]).toFixed(1)
                            : selectedNode.threeObj[type][axis].toFixed(2)
                        }
                        onChange={(e) => updateTransform(type, axis, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ))}
            {selectedNode.threeObj.isMesh && (
              <div>
                <h3>Material</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label>Color: </label>
                    {console.log(`#${materialProps.color?.getHexString()}`)}
                    <input
                      type="color"
                      value={`#${materialProps.color?.getHexString() || 'ffffff'}` }
                      onChange={(e) => handleMaterialChange('color', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Emissive: </label>
                    <input
                      type="color"
                      value={`#${materialProps.emissive?.getHexString() || '000000'}`}
                      onChange={(e) => handleMaterialChange('emissive', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Roughness: </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialProps.roughness || 0.5}
                      onChange={(e) => handleMaterialChange('roughness', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Metalness: </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={materialProps.metalness || 0.5}
                      onChange={(e) => handleMaterialChange('metalness', e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Texture: </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMaterialChange('map', e.target.files[0])}
                    />
                  </div>
                </div>
              </div>
            )}
            {animationClips.length > 0 && (
              <div>
                <h3>Animation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select
                    value={currentClip ?? ''}
                    onChange={(e) => setCurrentClip(parseInt(e.target.value))}
                    style={{ padding: '5px' }}
                  >
                    <option value="" disabled>Select Animation</option>
                    {animationClips.map((clip, index) => (
                      <option key={index} value={index}>{clip.name}</option>
                    ))}
                  </select>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={handlePlayPause}
                      disabled={currentClip === null}
                    >
                      {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                    </button>
                    <button 
                      onClick={handleStop}
                      disabled={currentClip === null}
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                  
                  {currentClip !== null && (
                    <input
                      type="range"
                      min="0"
                      max={animationClips[currentClip]?.duration || 1}
                      step="0.01"
                      value={currentTime}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        mixerRef.current?.setTime(time);
                        setCurrentTime(time);
                      }}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>Select an object to transform</div>
        )}
      </div>
    </div>
  );
};

export default App;