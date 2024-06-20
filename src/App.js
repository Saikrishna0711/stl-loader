import { useEffect, useRef, useState } from "react";
import { loadModel } from "./api/index";

import * as THREE from "three";
import { MathUtils } from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

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
    return {
      display: "flex",
      height: `${documentHeight - 5}px`,
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
      renderer.current.setClearColor(
        "linear-gradient(to top, #ffffff, #e3e1e3, #cac3c4, #b1a",
        1
      );
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
      console.log(activeLandmarkButton);
      const canvasBounds = renderer.current.domElement.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
        y: -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1,
      };

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera.current);

      const intersects = raycaster.intersectObject(
        scene.current.children[3],
        true
      );

      console.log(intersects, scene);

      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Check if a landmark with the activeLandmarkButton name exists
        const activeLandmarkLandmark = landmarks.find(
          (landmark) => landmark.name === activeLandmarkButton
        );

        if (activeLandmarkLandmark) {
          // If the landmark already exists, update its position
          activeLandmarkLandmark.mesh.position.copy(point.clone()); // Update the position of the mesh
          activeLandmarkLandmark.label.position.copy(
            point.clone().add(new THREE.Vector3(5, 5, 5))
          ); // Update the position of the label
          setLandmarks((prevLandmarks) => {
            const updatedLandmarks = prevLandmarks.map((landmark) =>
              landmark.name === activeLandmarkButton
                ? { ...landmark, position: point.clone() }
                : landmark
            );
            return updatedLandmarks;
          });
        } else {
          // If the landmark doesn't exist, create a new one
          const sphereGeometry = new THREE.SphereGeometry(2, 16, 16); // Adjust the radius and segments as needed
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaff00,
          });
          const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphereMesh.position.copy(point.clone());

          // Create label
          const labelCanvas = document.createElement("canvas");
          labelCanvas.width = 200;
          labelCanvas.height = 50;
          const context = labelCanvas.getContext("2d");
          context.font = "Bold 20px Arial";
          context.fillStyle = "rgba(255,255,255,0.95)";
          context.fillText(activeLandmarkButton, 0, 20);

          const labelTexture = new THREE.CanvasTexture(labelCanvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.scale.set(10, 5, 1); // Adjust scale as needed
          labelSprite.position.copy(
            point.clone().add(new THREE.Vector3(5, 5, 5))
          ); // Adjust position as needed
          labelSprite.renderOrder = 1;

          scene.current.add(sphereMesh);
          scene.current.add(labelSprite);
          setLandmarks((prevLandmarks) => [
            ...prevLandmarks,
            {
              name: activeLandmarkButton,
              position: point.clone(),
              mesh: sphereMesh,
              label: labelSprite,
            },
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
    const material = new THREE.LineBasicMaterial({
      color: 0xadd8e6,
      linewidth: 5,
    }); // Light blue color and thickness of 5
    const geometry = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      endPoint,
    ]);
    const line = new THREE.Line(geometry, material);
    line.name = name; // Set line name
    scene.current.add(line);
    return line;
  };

  const [varus_valgus_plane, set_varus_valgus_plane] = useState(null);
  const [Flexion_Extension_Plane, set_Flexion_Extension_Plane] = useState(null);
  const [distal_resection_plane, set_distal_resection_plane] = useState(null);

  const [varus_valgus_plane_angle, set_varus_valgus_plane_angle] = useState(3);
  const [Flexion_Extension_Plane_angle, set_Flexion_Extension_Plane_angle] =
    useState(3);
  const [distal_resection_plane_angle, set_distal_resection_plane_angle] =
    useState(0);

  const [varus_valgus_plane_axis, set_varus_valgus_plane_axis] = useState(null);
  const [Flexion_Extension_Plane_axis, set_Flexion_Extension_Plane_axis] =
    useState(null);
  const [distal_resection_plane_axis, set_distal_resection_plane_axis] =
    useState(null);

  const [handleUpdateButton, setHandleUpdateButton] = useState(false);
  // Function to handle the button click to create/update lines
  const handleUpdateButtonClick = () => {
    setHandleUpdateButton(true);
    // Define the pairs of landmarks and their respective line names
    const lineConfigurations = [
      { start: "femurCenter", end: "hipCenter", name: "Mechanical Axis" },
      {
        start: "femurProximalCanal",
        end: "femurDistalCanal",
        name: "Anatomical Axis",
      },
      {
        start: "medialEpicondyle",
        end: "lateralEpicondyle",
        name: "TEA-Trans epicondyle Axis",
      },
      {
        start: "posteriorMedialPt",
        end: "posteriorLateralPt",
        name: "PCA- Posterior Condyle Axis",
      },
    ];
    let lines = {};
    lineConfigurations.forEach(({ start, end, name }) => {
      const startPoint = landmarks.find((lm) => lm.name === start)?.position;
      const endPoint = landmarks.find((lm) => lm.name === end)?.position;

      if (startPoint && endPoint) {
        lines[name] = createLine(startPoint, endPoint, name);
      }
      console.log("line created");
    });
    // // Clear existing plane
    // if (plane) {
    //   scene.current.remove(plane);
    //   setPlane(null);
    // }
    // Create perpendicular plane
    let planeMech = createPerpendicularPlane();
    let projectedLine = projectLineOntoPlane(
      lines["TEA-Trans epicondyle Axis"],
      planeMech,
      scene.current
    );
    let anteriorLine = createPerpendicularLine(
      projectedLine,
      lines["Mechanical Axis"],
      landmarks.find((lm) => lm.name === "femurCenter")?.position,
      500,
      scene.current
    );
    let varus_valgus_plane_orignial = createRotatedPlane(
      anteriorLine,
      planeMech,
      3,
      scene.current
    );
    set_varus_valgus_plane(varus_valgus_plane_orignial[0]);
    set_varus_valgus_plane_axis(varus_valgus_plane_orignial[1]);
    let projectedAnterior = projectLineOntoPlane(
      anteriorLine,
      varus_valgus_plane_orignial[0],
      scene.current
    );
    let perpendicularToAnterior = createPerpendicularLineOnPlane(
      projectedAnterior,
      varus_valgus_plane_orignial[0],
      landmarks.find((lm) => lm.name === "femurCenter")?.position,
      500,
      scene.current
    );
    let Flexion_Extension_Plane_original = createRotatedPlane(
      perpendicularToAnterior,
      varus_valgus_plane_orignial[0],
      3,
      scene.current
    );
    set_Flexion_Extension_Plane_axis(Flexion_Extension_Plane_original[1]);
    set_distal_resection_plane_axis(Flexion_Extension_Plane_original[1]);
    set_Flexion_Extension_Plane(Flexion_Extension_Plane_original[0]);
    let distal_medial_plane = createParallelPlane(
      Flexion_Extension_Plane_original[0],
      landmarks.find((lm) => lm.name === "distalMedialPt")?.position,
      scene.current
    );
    let distal_resection_plane_original = createParallelPlaneAtDistance(
      distal_medial_plane,
      10,
      scene.current
    );
    set_distal_resection_plane(distal_resection_plane_original);
    let Distal_Medial = createLineAndText(
      landmarks.find((lm) => lm.name === "distalMedialPt")?.position,
      distal_resection_plane_original,
      scene.current
    );
    let Distal_Lateral = createLineAndText(
      landmarks.find((lm) => lm.name === "distalLateralPt")?.position,
      distal_resection_plane_original,
      scene.current
    );
  };

  // Function to create a line between a point and a plane, calculate the distance, and add text to the scene
  function createLineAndText(point, plane, scene) {
    // Calculate the plane's normal vector
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(plane.matrixWorld);
    const normal = new THREE.Vector3(0, 0, 1)
      .applyMatrix3(normalMatrix)
      .normalize();

    // Calculate the closest point on the plane to the given point
    const planePoint = plane.position.clone();
    const pointToPlane = new THREE.Vector3().subVectors(point, planePoint);
    const distanceToPlane = pointToPlane.dot(normal);
    const closestPointOnPlane = point
      .clone()
      .sub(normal.clone().multiplyScalar(distanceToPlane));

    // Create the line geometry
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      point,
      closestPointOnPlane,
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 44;
    scene.add(line);

    // Calculate the distance
    const distance = point.distanceTo(closestPointOnPlane);

    // Load font and create text geometry
    const loader = new FontLoader();
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      function (font) {
        const textGeometry = new TextGeometry(distance.toFixed(2), {
          font: font,
          size: 12,
          height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Position the text at the midpoint of the line
        const midPoint = new THREE.Vector3()
          .addVectors(point, closestPointOnPlane)
          .multiplyScalar(0.5);
        textMesh.position.copy(midPoint);
        let quaternion = camera.current.quaternion;
        textMesh.onBeforeRender = function (rendererr) {
          textMesh.quaternion.copy(quaternion);
          rendererr.clearDepth();
        };

        // Rotate the text to face the camera
        textMesh.lookAt(camera.current.position);

        scene.add(textMesh);
      }
    );

    // Return the line and distance (optional)
    return { line, distance };
  }

  // Function to create a plane parallel to a given plane at a specified distance in the proximal direction
  function createParallelPlaneAtDistance(originalPlane, distance, scene) {
    // Copy the geometry and material of the original plane
    const planeGeometry = originalPlane.geometry.clone();
    const planeMaterial = originalPlane.material.clone();

    // Create the new plane
    const newPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Copy the rotation and scale of the original plane
    newPlane.rotation.copy(originalPlane.rotation);
    newPlane.scale.copy(originalPlane.scale);

    // Calculate the normal vector of the original plane
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      originalPlane.matrixWorld
    );
    const normal = new THREE.Vector3(0, 0, 1)
      .applyMatrix3(normalMatrix)
      .normalize();

    // Set the position of the new plane by translating it along the normal vector
    newPlane.position
      .copy(originalPlane.position)
      .add(normal.multiplyScalar(distance));

    // Add the new plane to the scene
    scene.add(newPlane);

    // Return the new plane (optional)
    return newPlane;
  }

  // Function to create a plane parallel to a given plane and passing through a given point
  function createParallelPlane(originalPlane, point, scene) {
    // Copy the geometry and material of the original plane
    const planeGeometry = originalPlane.geometry.clone();
    const planeMaterial = originalPlane.material.clone();

    // Create the new plane
    const newPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Copy the rotation and scale of the original plane
    newPlane.rotation.copy(originalPlane.rotation);
    newPlane.scale.copy(originalPlane.scale);

    // Set the position of the new plane to the given point
    newPlane.position.copy(point);

    // Add the new plane to the scene
    scene.add(newPlane);

    // Return the new plane (optional)
    return newPlane;
  }

  // Function to create a line perpendicular to a given line and on a given plane
  function createPerpendicularLineOnPlane(
    line,
    plane,
    startPoint,
    distance,
    scene
  ) {
    // Calculate the direction vector of the given line
    const linePoints = line.geometry.attributes.position.array;
    const lineStart = new THREE.Vector3(
      linePoints[0],
      linePoints[1],
      linePoints[2]
    );
    const lineEnd = new THREE.Vector3(
      linePoints[3],
      linePoints[4],
      linePoints[5]
    );
    const lineDirection = new THREE.Vector3()
      .subVectors(lineEnd, lineStart)
      .normalize();

    // Calculate the normal of the plane
    const planeNormal = new THREE.Vector3(0, 1, 0); // Assuming the plane is horizontal

    // Calculate the perpendicular direction using cross product
    const perpendicularDirection = new THREE.Vector3()
      .crossVectors(lineDirection, planeNormal)
      .normalize();

    // Calculate the end point of the new line
    const endPoint = new THREE.Vector3().addVectors(
      startPoint,
      perpendicularDirection.multiplyScalar(distance)
    );

    // Create the new line
    const newLineGeometry = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      endPoint,
    ]);
    const newLine = new THREE.Line(
      newLineGeometry,
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );

    newLine.renderOrder = 2;

    scene.add(newLine);

    // Return the new line (optional)
    return newLine;
  }

  function createRotatedPlane(line, plane, angleInDegrees, scene) {
    // Duplicate the plane
    const newPlane = plane.clone();

    // Calculate the rotation axis (direction of the line)
    const points = line.geometry.attributes.position.array;
    const lineStart = new THREE.Vector3(points[0], points[1], points[2]);
    const lineEnd = new THREE.Vector3(points[3], points[4], points[5]);
    const rotationAxis = new THREE.Vector3()
      .subVectors(lineEnd, lineStart)
      .normalize();

    // Convert angle to radians
    const angleInRadians = THREE.MathUtils.degToRad(angleInDegrees);

    // Apply the rotation around the line's axis
    const quaternion = new THREE.Quaternion().setFromAxisAngle(
      rotationAxis,
      angleInRadians
    );
    newPlane.applyQuaternion(quaternion);

    // Translate the plane to the correct position
    newPlane.position.copy(plane.position);

    // Add the rotated plane to the scene
    scene.add(newPlane);

    // Return the new rotated plane (optional)
    return [newPlane, rotationAxis];
  }

  // Function to create a plane perpendicular to the mechanical axis
  const createPerpendicularPlane = () => {
    const mechAxisStart = landmarks.find(
      (lm) => lm.name === "femurCenter"
    )?.position;
    const mechAxisEnd = landmarks.find(
      (lm) => lm.name === "hipCenter"
    )?.position;
    if (mechAxisStart && mechAxisEnd) {
      const mechAxis = new THREE.Vector3()
        .copy(mechAxisEnd)
        .sub(mechAxisStart)
        .normalize();
      // Create a plane geometry
      const planeGeometry = new THREE.PlaneGeometry(200, 200);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
      });
      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
      // Set the position and rotation of the plane
      planeMesh.position.copy(mechAxisEnd);
      // const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), mechAxis);
      // planeMesh.quaternion.copy(quaternion);
      // Update state
      // Add the plane to the scene
      scene.current.add(planeMesh);
      return planeMesh;
    }
  };

  function projectPointOntoPlane(point, planeNormal, planePoint) {
    const vectorFromPlane = new THREE.Vector3().subVectors(point, planePoint);
    const distance = vectorFromPlane.dot(planeNormal);
    return point.clone().sub(planeNormal.clone().multiplyScalar(distance));
  }

  // Function to project a line onto a plane and add the projected line to the scene
  function projectLineOntoPlane(line, plane, scene) {
    const planeNormal = new THREE.Vector3();
    plane.getWorldDirection(planeNormal); // Get the plane's normal
    const planePoint = plane.position.clone(); // Get a point on the plane

    const points = line.geometry.attributes.position.array;
    const projectedPoints = [];

    for (let i = 0; i < points.length; i += 3) {
      const point = new THREE.Vector3(points[i], points[i + 1], points[i + 2]);
      const projectedPoint = projectPointOntoPlane(
        point,
        planeNormal,
        planePoint
      );
      projectedPoints.push(projectedPoint);
    }

    const projectedLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
    });
    const projectedLineGeometry = new THREE.BufferGeometry().setFromPoints(
      projectedPoints
    );
    const projectedLine = new THREE.Line(
      projectedLineGeometry,
      projectedLineMaterial
    );

    // Set the render order of the projected line to be high so it renders on top
    projectedLine.renderOrder = 2;
    scene.add(projectedLine);
    return projectedLine;
  }

  function createPerpendicularLine(line1, line2, startPoint, distance, scene) {
    // Get points of line1
    const points1 = line1.geometry.attributes.position.array;
    const dir1 = new THREE.Vector3()
      .subVectors(
        new THREE.Vector3(points1[3], points1[4], points1[5]),
        new THREE.Vector3(points1[0], points1[1], points1[2])
      )
      .normalize();

    // Get points of line2
    const points2 = line2.geometry.attributes.position.array;
    const dir2 = new THREE.Vector3()
      .subVectors(
        new THREE.Vector3(points2[3], points2[4], points2[5]),
        new THREE.Vector3(points2[0], points2[1], points2[2])
      )
      .normalize();

    // Calculate perpendicular direction using cross product
    const perpendicularDir = new THREE.Vector3()
      .crossVectors(dir1, dir2)
      .normalize();

    // Calculate the end points of the perpendicular line
    const endPoint1 = new THREE.Vector3().addVectors(
      startPoint,
      perpendicularDir.clone().multiplyScalar(distance / 2)
    );
    const endPoint2 = new THREE.Vector3().addVectors(
      startPoint,
      perpendicularDir.clone().multiplyScalar(-distance / 2)
    );

    // Create the perpendicular line
    const perpendicularLineGeometry = new THREE.BufferGeometry().setFromPoints([
      endPoint1,
      endPoint2,
    ]);
    const perpendicularLine = new THREE.Line(
      perpendicularLineGeometry,
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    perpendicularLine.renderOrder = 3;

    // Add perpendicular line to the scene
    scene.add(perpendicularLine);

    // Return the created perpendicular line (optional, depending on your needs)
    return perpendicularLine;
  }

  function handleRotationButtonClick(direction) {
    if (direction === "positive") {
      set_varus_valgus_plane_angle(varus_valgus_plane_angle + 1);
    } else {
      set_varus_valgus_plane_angle(varus_valgus_plane_angle - 1);
    }
    const rotationAngle = direction === "positive" ? 1 : -1;
    const angleInRadians = THREE.MathUtils.degToRad(rotationAngle);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(varus_valgus_plane_axis, angleInRadians);
    varus_valgus_plane.applyQuaternion(quaternion);
  }

  function handleFlexExtRotationButtonClick(direction) {
    if (direction === "positive") {
      set_Flexion_Extension_Plane_angle(Flexion_Extension_Plane_angle + 1);
    } else {
      set_Flexion_Extension_Plane_angle(Flexion_Extension_Plane_angle - 1);
    }
    const rotationAngle = direction === "positive" ? 1 : -1;
    const angleInRadians = THREE.MathUtils.degToRad(rotationAngle);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(Flexion_Extension_Plane_axis, angleInRadians);
    Flexion_Extension_Plane.applyQuaternion(quaternion);
  }

  function handleDistalResectionRotationButtonClick(direction) {
    if (direction === "positive") {
      set_distal_resection_plane_angle(distal_resection_plane_angle + 1);
    } else {
      set_distal_resection_plane_angle(distal_resection_plane_angle - 1);
    }
    const rotationAngle = direction === "positive" ? 1 : -1;
    // Convert angle to radians
    const angleInRadians = THREE.MathUtils.degToRad(rotationAngle);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(distal_resection_plane_axis, angleInRadians);
    distal_resection_plane.applyQuaternion(quaternion);
  }

  const [resectionVisible, setResectionVisible] = useState(true);

  function handleToggleResection() {
    distal_resection_plane.visible = resectionVisible;
    setResectionVisible(!resectionVisible);
  }

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
        <button onClick={() => handleUpdateButtonClick()}>Update Lines</button>
        <br></br>
        {handleUpdateButton ? (
          <>
            <button onClick={() => handleRotationButtonClick("positive")}>
              Rotate Positive
            </button>
            Varus/Vaglus Plane {varus_valgus_plane_angle}
            <button onClick={() => handleRotationButtonClick("negative")}>
              Rotate Negative
            </button>
            <button
              onClick={() => handleFlexExtRotationButtonClick("positive")}
            >
              Rotate Positive
            </button>
            Flexion/Extension Plane {Flexion_Extension_Plane_angle}
            <button
              onClick={() => handleFlexExtRotationButtonClick("negative")}
            >
              Rotate Negative
            </button>
            <button
              onClick={() =>
                handleDistalResectionRotationButtonClick("positive")
              }
            >
              Rotate Distal Resection Plane Positive
            </button>
            Distal Resection Plane {distal_resection_plane_angle}
            <button
              onClick={() =>
                handleDistalResectionRotationButtonClick("negative")
              }
            >
              Rotate Distal Resection Plane Negative
            </button>
            <button onClick={() => handleToggleResection()}>
              {resectionVisible ? "Hide Resection" : "Show Resection"}
            </button>
          </>
        ) : null}
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
