import { useEffect, useRef, useState } from "react";
import { loadModel } from "./api/index";

import * as THREE from "three";
import { MathUtils } from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

const App = () => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [modelScene, setModelScene] = useState(null);
  const [prev_width_canvas, set_prev_width_canvas] = useState(0);
  const [prev_height_canvas, set_prev_height_canvas] = useState(0);
  const [activeLandmark, setActiveLandmark] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [activeLandmarkButton, setActiveLandmarkButton] = useState(null);
  const [translationControlsActive, setTranslationControlsActive] =
    useState(false);
  const [lines, setLines] = useState([]);
  const [plane, setPlane] = useState(null);

  const camera = useRef();
  const renderer = useRef();
  const scene = useRef();
  const controls = useRef();
  const pointLight = useRef();
  const boxSize = useRef();
  const frameId = useRef();
  const mount = useRef();

  useEffect(() => {
    if (!modelLoaded) {
      async function LoadModelNow() {
        await loadModel()
          .then((res) => {
            const { scene, scene1 } = res;
            setModelScene({ scene, scene1 });
            setModelLoaded(true);
            setCanvasLoaded(true);
            console.log(res);
          })
          .catch((err) => {
            console.error(err);
          });
      }
      LoadModelNow();
    }
  }, [modelLoaded]);

  const getChildContainerStyle = () => {
    const documentHeight = document.documentElement.clientHeight;
    const headerHeight = 0;
    return {
      display: "flex",
      height: `${documentHeight - headerHeight - 5}px`,
    };
  };

  const renderScene = () => {
    renderer.current.clear();
    pointLight.current.position.set(
      camera.current.position.x,
      camera.current.position.y,
      camera.current.position.z
    );
    renderer.current.render(scene.current, camera.current);
  };

  useEffect(() => {
    function canvasLoad() {
      // Scene
      scene.current = new THREE.Scene();
      scene.current.add(new THREE.AxesHelper(5));
      scene.current.name = "scene";

      // Light
      const light = new THREE.AmbientLight(0xffffff, 0.4);
      scene.current.add(light);
      let lightIntensity = 1.0;
      let lightDecay = 1.0;
      let lightDistance = 0;

      pointLight.current = new THREE.PointLight(
        0xffffff,
        lightIntensity,
        lightDistance,
        lightDecay
      );
      pointLight.current.position.set(1, 0, 0);
      scene.current.add(pointLight.current);

      // Scene Size
      mount.current = document.getElementById("container");
      const canvasWidth = mount.current && mount.current.clientWidth;
      const canvasHeight = mount.current && mount.current.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const frustumSize = 500;

      // Camera
      // Create a new perspective camera
      // const camera = new THREE.PerspectiveCamera(
      //   45,
      //   canvasWidth / canvasHeight,
      //   0.1,
      //   1000
      // );
      // camera.position.z = 2
      // Set camera position
      camera.current = new THREE.OrthographicCamera(
        (0.5 * frustumSize * aspect) / -2,
        (0.5 * frustumSize * aspect) / 2,
        frustumSize / 4,
        -frustumSize / 4,
        0.0,
        5000
      );

      console.log(camera);
      camera.current.up.set(0, 0, 1);
      camera.current.position.set(200, 200, 200);
      camera.current.lookAt(0.0, 0.0, 0.0);
      camera.current.maxFrustumWidth = 2000;
      camera.current.minFrustudüdth = 1.0;

      camera.current.target = new THREE.Vector3(0, 0, 0);

      // Renderer
      // Create a new WebGLRenderer
      renderer.current = new THREE.WebGLRenderer({
        antialias: true, // Enable antialiasing for smoother edges
        alpha: false, // Disable alpha channel (transparency)
      });
      // Set renderer size to match the window size
      renderer.current.setSize(canvasWidth, canvasHeight, false);
      renderer.current.setPixelRatio(window.devicePixelRatio);

      // Append the renderer's DOM element to the container
      mount.current && mount.current.appendChild(renderer.current.domElement);

      // Controls
      controls.current = new TrackballControls(
        camera.current,
        renderer.current.domElement
      );
      controls.current.rotateSpeed = 4.0;
      controls.current.zoomSpeed = 8.0;
      controls.current.panSpeed = 25.0;
      controls.current.noZoom = false;
      controls.current.noPan = false;
      controls.current.staticMoving = true;
      controls.current.dynamicDampingFactor = 0.3;
      controls.keys = [65, 83, 68];

      // Translate femur above tibia
      addMeshToScene();

      const animate = () => {
        if (
          prev_width_canvas !== renderer.current.domElement.clientWidth ||
          prev_height_canvas !== renderer.current.domElement.clientHeight
        ) {
          set_prev_width_canvas(renderer.current.domElement.clientWidth);
          set_prev_height_canvas(renderer.current.domElement.clientHeight);
          renderer.current.setSize(
            renderer.current.domElement.clientWidth,
            renderer.current.domElement.clientHeight
          );
          renderScene();
        }
        controls.current.update();
        requestAnimationFrame(animate);
      };

      frameId.current = requestAnimationFrame(animate);
      window.addEventListener("resize ", renderScene());
    }
    if (canvasLoaded) {
      canvasLoad();
      setCanvasLoaded(false);
    }
    return () => {
      window.removeEventListener("resize", (e) => {
        renderScene();
      });
      cancelAnimationFrame(frameId.current);
    };
  }, [canvasLoaded, modelScene, prev_height_canvas, prev_width_canvas]);

  const addMeshToScene = () => {
    const femurMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const femur = new THREE.Mesh(modelScene.scene1, femurMaterial);

    // Calculate the center of the femur mesh
    const centerFemur = new THREE.Vector3();
    femur.geometry.computeBoundingBox();
    femur.geometry.boundingBox.getCenter(centerFemur);

    // Calculate the offset required to center the femur along the axis
    const offset = new THREE.Vector3().copy(centerFemur).negate();
    femur.position.add(offset);

    // Add the femur mesh to the scene
    scene.current.add(femur);

    camera.current.updateProjectionMatrix();
    camera.current.updateMatrix();
  };

  const handleLandmarkButtonClick = (landmark) => {
    setActiveLandmarkButton(landmark);
    setTranslationControlsActive(true); // Activate translation controls

    // Update landmarks to make movable points draggable
    const updatedLandmarks = landmarks.map((lm) => {
      if (lm.type === landmark) {
        return { ...lm, movable: true };
      }
      return lm;
    });
    setLandmarks(updatedLandmarks);
  };

  const handleCanvasClick = (event) => {
    if (activeLandmarkButton) {
      console.log(activeLandmarkButton)
      const canvasBounds = renderer.current.domElement.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
        y: -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1,
      };

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera.current);

      const intersects = raycaster.intersectObject(scene.current.children[3], true);

      console.log(intersects, scene)

      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Check if a landmark with the activeLandmarkButton name exists
        const activeLandmarkLandmark = landmarks.find((landmark) => landmark.name === activeLandmarkButton);

        if (activeLandmarkLandmark) {
          // If the landmark already exists, update its position
          activeLandmarkLandmark.mesh.position.copy(point.clone()); // Update the position of the mesh
          activeLandmarkLandmark.label.position.copy(point.clone().add(new THREE.Vector3(5, 5, 5))); // Update the position of the label
          setLandmarks((prevLandmarks) => {
            const updatedLandmarks = prevLandmarks.map((landmark) =>
              landmark.name === activeLandmarkButton ? { ...landmark, position: point.clone() } : landmark
            );
            return updatedLandmarks;
          });
        } else {
          // If the landmark doesn't exist, create a new one
          const sphereGeometry = new THREE.SphereGeometry(2, 16, 16); // Adjust the radius and segments as needed
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xaaff00 });
          const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphereMesh.position.copy(point.clone());

          // Create label
          const labelCanvas = document.createElement('canvas');
          labelCanvas.width = 200;
          labelCanvas.height = 50;
          const context = labelCanvas.getContext('2d');
          context.font = 'Bold 20px Arial';
          context.fillStyle = 'rgba(255,255,255,0.95)';
          context.fillText(activeLandmarkButton, 0, 20);

          const labelTexture = new THREE.CanvasTexture(labelCanvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.scale.set(10, 5, 1); // Adjust scale as needed
          labelSprite.position.copy(point.clone().add(new THREE.Vector3(5, 5, 5))); // Adjust position as needed
          labelSprite.renderOrder = 1;

          scene.current.add(sphereMesh);
          scene.current.add(labelSprite);
          setLandmarks(prevLandmarks => [
            ...prevLandmarks,
            { name: activeLandmarkButton, position: point.clone(), mesh: sphereMesh, label: labelSprite }
          ]);
        }
      }
    }
  };

  const landmarkOptions = [
    { value: "femurCenter", label: "Femur Center" },
    { value: "hipCenter", label: "Hip Center" },
    { value: "femurProximalCanal", label: "Femur Proximal Canal" },
    { value: "femurDistalCanal", label: "Femur Distal Canal" },
    { value: "medialEpicondyle", label: "Medial Epicondyle" },
    { value: "lateralEpicondyle", label: "Lateral Epicondyle" },
    { value: "distalMedialPt", label: "Distal Medial Pt" },
    { value: "distalLateralPt", label: "Distal Lateral Pt" },
    { value: "posteriorMedialPt", label: "Posterior Medial Pt" },
    { value: "posteriorLateralPt", label: "Posterior Lateral Pt" },
  ];

  // Function to create a line between two landmarks
  const createLine = (startPoint, endPoint, name) => {
    const material = new THREE.LineBasicMaterial({ color: 0xadd8e6, linewidth: 5 }); // Light blue color and thickness of 5
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const line = new THREE.Line(geometry, material);
    line.name = name; // Set line name
    scene.current.add(line);
    return line;
  };

  // Function to handle the button click to create/update lines
  const handleUpdateButtonClick = () => {
    // Define the pairs of landmarks and their respective line names
    const lineConfigurations = [
      { start: "femurCenter", end: "hipCenter", name: "Mechanical Axis" },
      { start: "femurProximalCanal", end: "femurDistalCanal", name: "Anatomical Axis" },
      { start: "medialEpicondyle", end: "lateralEpicondyle", name: "TEA-Trans epicondyle Axis" },
      { start: "posteriorMedialPt", end: "posteriorLateralPt", name: "PCA- Posterior Condyle Axis" },
    ];

    const updatedLines = lineConfigurations.map(({ start, end, name }) => {
      const startPoint = landmarks.find((lm) => lm.name === start)?.position;
      const endPoint = landmarks.find((lm) => lm.name === end)?.position;
      if (startPoint && endPoint) {
        return createLine(startPoint, endPoint, name);
      }
      console.log("line created")
      return null;
    });

    // Update the state with the new lines
    setLines(updatedLines.filter(Boolean));

    // Clear existing plane
    if (plane) {
      scene.current.remove(plane);
      setPlane(null);
    }

    // Create perpendicular plane
    createPerpendicularPlane();
    projectTEAAxis();
  };

  // Function to create a plane perpendicular to the mechanical axis
  const createPerpendicularPlane = () => {
    const mechAxisStart = landmarks.find((lm) => lm.name === "femurCenter")?.position;
    const mechAxisEnd = landmarks.find((lm) => lm.name === "hipCenter")?.position;

    if (mechAxisStart && mechAxisEnd) {
      const mechAxis = new THREE.Vector3().copy(mechAxisEnd).sub(mechAxisStart).normalize();

      // Calculate a point on the plane
      const planePoint = mechAxisStart.clone().add(mechAxis.clone().multiplyScalar(10)); // Assuming a distance of 10 for now

      // Create a plane geometry
      const planeGeometry = new THREE.PlaneGeometry(200, 200);
      const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

      // Set the position and rotation of the plane
      planeMesh.position.copy(planePoint);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), mechAxis);
      planeMesh.quaternion.copy(quaternion);

      // Update state
      setPlane(planeMesh);

      // Add the plane to the scene
      scene.current.add(planeMesh);
    }
  };

  const projectTEAAxis = () => {
    const mechAxisStart = landmarks.find((lm) => lm.name === "femurCenter")?.position;
    const mechAxisEnd = landmarks.find((lm) => lm.name === "hipCenter")?.position;
    const teAxisStart = landmarks.find((lm) => lm.name === "medialEpicondyle")?.position;
    const teAxisEnd = landmarks.find((lm) => lm.name === "lateralEpicondyle")?.position;

    if (mechAxisStart && mechAxisEnd && teAxisStart && teAxisEnd) {
      const mechAxis = new THREE.Vector3().copy(mechAxisEnd).sub(mechAxisStart).normalize();
      const teAxis = new THREE.Vector3().copy(teAxisEnd).sub(teAxisStart).normalize();

      const projectedTEAxis = teAxis.clone().sub(mechAxis.clone().multiplyScalar(teAxis.dot(mechAxis)));

      const startPoint = landmarks.find((lm) => lm.name === "medialEpicondyle")?.position;
      const endPoint = startPoint.clone().add(projectedTEAxis);

      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
      const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
      const line = new THREE.Line(geometry, material);
      line.name = "Projected TEA Axis";
      scene.current.add(line);
    }
  };

  const rotatePlane = (angle) => {
    if (plane.current) {
      const anteriorLineStart = landmarks.find((lm) => lm.name === "femurCenter")?.position;
      const anteriorLineEnd = landmarks.find((lm) => lm.name === "hipCenter")?.position;

      if (anteriorLineStart && anteriorLineEnd) {
        const anteriorAxis = anteriorLineEnd.clone().sub(anteriorLineStart).normalize();
        const rotationAxis = new THREE.Vector3().copy(anteriorAxis).normalize();

        const q = new THREE.Quaternion();
        q.setFromAxisAngle(rotationAxis, MathUtils.degToRad(angle));

        plane.current.applyQuaternion(q);
      }
    } else {
      console.error("Plane reference is not yet set.");
    }
  };

  const handleRotationButtonClick = (direction) => {
    const angle = direction === "positive" ? 10 : -10;
    rotatePlane(angle);
  };
  const [flexExtPlane, setFlexExtPlane] = useState(null);
  useEffect(() => {
    // Function to project anterior line onto varus/valgus plane
    const projectAnteriorLine = () => {
      const mechAxisStart = landmarks.find((lm) => lm.name === "femurCenter")?.position;
      const mechAxisEnd = landmarks.find((lm) => lm.name === "hipCenter")?.position;
      const anteriorLineStart = landmarks.find((lm) => lm.name === "femurCenter")?.position;
      const anteriorLineEnd = landmarks.find((lm) => lm.name === "hipCenter")?.position;

      if (mechAxisStart && mechAxisEnd && anteriorLineStart && anteriorLineEnd) {
        const mechAxis = new THREE.Vector3().copy(mechAxisEnd).sub(mechAxisStart).normalize();
        const anteriorLine = new THREE.Vector3().copy(anteriorLineEnd).sub(anteriorLineStart);

        // Handle the case where the anteriorLine vector has zero length
        if (anteriorLine.lengthSq() === 0) {
          console.error("Error: Anterior line vector has zero length.");
          return;
        }

        const projectedPoint = anteriorLineStart.clone().add(
          anteriorLine.clone().projectOnVector(mechAxis)
        );

        const endPoint = projectedPoint.clone().add(mechAxis.clone().multiplyScalar(10)); // Assuming a distance of 10 for now

        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 5 });
        const geometry = new THREE.BufferGeometry().setFromPoints([projectedPoint, endPoint]);
        const line = new THREE.Line(geometry, material);
        line.name = "Projected Anterior Line";
        scene.current.add(line);
      } else {
        console.error("Error: Unable to project anterior line due to missing landmarks.");
      }
    };

    if (modelScene) {
      projectAnteriorLine();
    }
  }, [modelScene, plane]);

  // Function to create the flexion/extension plane
  const createFlexExtPlane = (projectedPointOnPlane) => {
    const femurCenter = landmarks.find((lm) => lm.name === "femurCenter")?.position;
    const lateralEnd = femurCenter.clone().add(new THREE.Vector3(0, -10, 0)); // 10mm laterally

    if (femurCenter && projectedPointOnPlane && lateralEnd) {
      const lateralAxis = lateralEnd.clone().sub(femurCenter).normalize();

      const planeGeometry = new THREE.PlaneGeometry(200, 200);
      const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

      planeMesh.position.copy(femurCenter); // Start from femur center
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), lateralAxis);
      planeMesh.quaternion.copy(quaternion);

      setFlexExtPlane(planeMesh);
      scene.current.add(planeMesh);
    }
  };

  // Function to rotate the flexion/extension plane
  const rotateFlexExtPlane = (angle) => {
    if (flexExtPlane) {
      const femurCenter = landmarks.find((lm) => lm.name === "femurCenter")?.position;
      const lateralEnd = femurCenter.clone().add(new THREE.Vector3(0, -10, 0)); // 10mm laterally

      if (femurCenter && lateralEnd) {
        const lateralAxis = lateralEnd.clone().sub(femurCenter).normalize();
        const rotationAxis = new THREE.Vector3().copy(lateralAxis).normalize();

        const q = new THREE.Quaternion();
        q.setFromAxisAngle(rotationAxis, MathUtils.degToRad(angle));

        flexExtPlane.applyQuaternion(q);
      }
    } else {
      console.error("Flexion/Extension plane reference is not yet set.");
    }
  };

  // Function to handle rotation button click for the flexion/extension plane
  const handleFlexExtRotationButtonClick = (direction) => {
    const angle = direction === "positive" ? 10 : -10;
    rotateFlexExtPlane(angle);
  };

  const createDistalMedialPlane = () => {
    if (flexExtPlane) {
      const distalMedialPoint = landmarks.find((lm) => lm.name === "distalMedialPt")?.position;
      if (distalMedialPoint) {
        const planeGeometry = new THREE.PlaneGeometry(200, 200);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

        planeMesh.position.copy(distalMedialPoint);
        planeMesh.quaternion.copy(flexExtPlane.quaternion);

        scene.current.add(planeMesh);
      }
    }
  };

  const [distalResectionPlane, setDistalResectionPlane] = useState(null);

  const createDistalResectionPlane = () => {
    if (flexExtPlane) {
      const distalMedialPoint = landmarks.find((lm) => lm.name === "distalMedialPt")?.position;
      if (distalMedialPoint) {
        const planeGeometry = new THREE.PlaneGeometry(200, 200);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

        // Adjust distance to 10mm in the proximal direction
        const distalResectionDistance = 10;
        const planePosition = distalMedialPoint.clone().add(flexExtPlane.up.clone().multiplyScalar(distalResectionDistance));
        planeMesh.position.copy(planePosition);
        planeMesh.quaternion.copy(flexExtPlane.quaternion);

        setDistalResectionPlane(planeMesh);

        scene.current.add(planeMesh);
      }
    }
  };


  // Function to rotate the distal resection plane
  const rotateDistalResectionPlane = (angle) => {
    if (distalResectionPlane) {
      distalResectionPlane.rotateZ(MathUtils.degToRad(angle));
    }
  };

  // Function to handle rotation button click for the distal resection plane
  const handleDistalResectionRotationButtonClick = (direction) => {
    const angle = direction === "positive" ? 10 : -10;
    rotateDistalResectionPlane(angle);
  };

  useEffect(() => {
    createDistalMedialPlane();
    createDistalResectionPlane();
  }, [flexExtPlane, landmarks]);

  // Toggle button state
  const [resectionVisible, setResectionVisible] = useState(true);

  const handleToggleResection = () => {
    setResectionVisible((prev) => !prev);
  };

  // Measurement calculation
  const calculateDistance = (point1, point2) => {
    return point1.distanceTo(point2);
  };

  return (
    <div>
      <div className="sidebar">
        <h2>Select Landmark:</h2>
        {landmarkOptions.map((option) => (
          <div key={option.value}>
            <input
              type="radio"
              id={option.value}
              name="landmark"
              value={option.value}
              checked={activeLandmarkButton === option.value}
              onChange={() => handleLandmarkButtonClick(option.value)}
            />
            <label
              htmlFor={option.value}
              style={{
                color:
                  activeLandmarkButton === option.value ? "black" : "lightgray",
              }}
            >
              {option.label}
            </label>
          </div>
        ))}
        <button onClick={handleUpdateButtonClick}>Update Lines</button>
        <br></br>
        <button onClick={() => handleRotationButtonClick("positive")}>Rotate Positive</button>
        Varus/Vaglus Plane
        <button onClick={() => handleRotationButtonClick("negative")}>Rotate Negative</button>
        <button onClick={() => handleFlexExtRotationButtonClick("positive")}>Rotate Positive</button>
        Flexion/Extension Plane
        <button onClick={() => handleFlexExtRotationButtonClick("negative")}>Rotate Negative</button>
        <button onClick={() => handleDistalResectionRotationButtonClick("positive")}>Rotate Distal Resection Plane Positive</button>
        <button onClick={() => handleDistalResectionRotationButtonClick("negative")}>Rotate Distal Resection Plane Negative</button>
        <button onClick={handleToggleResection}>{resectionVisible ? "Hide Resection" : "Show Resection"}</button>
      </div>
      <div className="pane" style={getChildContainerStyle()}>
        {modelLoaded ? (
          <div
            id="container"
            style={{ width: "100%" }}
            onClick={handleCanvasClick}
          ></div>
        ) : null}
      </div>
    </div>
  );
};

export default App;
