import * as THREE from 'three';

export class VoxelSky {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public cloudGroup: THREE.Group;
  public stars: THREE.Points;

  // Time of day: 0.0 to 1.0 (0.25 = sunrise, 0.5 = midday, 0.75 = sunset, 0.0/1.0 = midnight)
  public timeOfDay: number = 0.42; // Start in nice morning sunshine
  public timeSpeed: number = 0.008; // One full cycle every ~120 seconds
  public isTimePaused: boolean = false;

  private daySkyColor = new THREE.Color(0x78a7ff);
  private sunsetSkyColor = new THREE.Color(0xdf8458);
  private nightSkyColor = new THREE.Color(0x0c1328);

  private dayFogColor = new THREE.Color(0x9fc0ff);
  private sunsetFogColor = new THREE.Color(0xd6805b);
  private nightFogColor = new THREE.Color(0x0b1020);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Lighting Rig
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.camera.left = -40;
    this.dirLight.shadow.camera.right = 40;
    this.dirLight.shadow.camera.top = 40;
    this.dirLight.shadow.camera.bottom = -40;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0x78a7ff, 0x5b8e32, 0.5);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);

    // 2. Sun (Minecraft square sun)
    const sunGeo = new THREE.PlaneGeometry(16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff3a8,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // 3. Moon (Minecraft square moon)
    const moonGeo = new THREE.PlaneGeometry(12, 12);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe8ecf8,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // 4. Starfield
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 220;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 10;
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      fog: false,
      transparent: true,
      opacity: 0,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // 5. Blocky Floating 3D Clouds
    this.cloudGroup = new THREE.Group();
    this.buildCloudLayer();
    this.scene.add(this.cloudGroup);

    // 6. Horizon Fog
    this.scene.fog = new THREE.Fog(this.dayFogColor, 45, 95);

    this.updateLighting(0);
  }

  // Generates 3D blocky clouds at high altitude (y = 40)
  private buildCloudLayer() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    });

    const cloudBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const clusterCount = 18;
    const cloudBoxes: THREE.Mesh[] = [];

    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < clusterCount; i++) {
      const cx = (pseudoRandom(i * 13) - 0.5) * 200;
      const cz = (pseudoRandom(i * 37) - 0.5) * 200;
      const w = 12 + Math.floor(pseudoRandom(i * 29) * 16);
      const d = 10 + Math.floor(pseudoRandom(i * 47) * 14);

      const cloudMesh = new THREE.Mesh(cloudBoxGeo, cloudMat);
      cloudMesh.scale.set(w, 2.5, d);
      cloudMesh.position.set(cx, 40, cz);
      this.cloudGroup.add(cloudMesh);
      cloudBoxes.push(cloudMesh);
    }
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    if (!this.isTimePaused) {
      this.timeOfDay = (this.timeOfDay + dt * this.timeSpeed) % 1.0;
    }

    // Slowly drift clouds
    this.cloudGroup.position.x = (this.cloudGroup.position.x + dt * 1.5) % 300;

    // Center directional light shadow frustum around player
    this.dirLight.target.position.copy(playerPos);
    this.dirLight.target.updateMatrixWorld();

    this.updateLighting(dt, playerPos);
  }

  private updateLighting(dt: number, playerPos?: THREE.Vector3) {
    const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const distance = 180;

    const sunX = Math.cos(angle) * distance;
    const sunY = Math.sin(angle) * distance;
    const center = playerPos || new THREE.Vector3(0, 20, 0);

    // Update Sun position & lookAt
    this.sunMesh.position.set(center.x + sunX, center.y + sunY, center.z);
    this.sunMesh.lookAt(center);

    // Moon is opposite to the Sun
    this.moonMesh.position.set(center.x - sunX, center.y - sunY, center.z);
    this.moonMesh.lookAt(center);

    // Position sun light
    this.dirLight.position.set(center.x + sunX, center.y + sunY, center.z);

    // Sun altitude factor: >0 during day, <0 during night
    const sunAltitude = Math.sin(angle);

    const curSky = new THREE.Color();
    const curFog = new THREE.Color();

    if (sunAltitude > 0.15) {
      // Full Day
      curSky.copy(this.daySkyColor);
      curFog.copy(this.dayFogColor);
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = 1.35 * Math.min(1, sunAltitude * 1.8);
      this.ambientLight.intensity = 0.38;
      this.hemiLight.intensity = 0.45;
      (this.stars.material as THREE.PointsMaterial).opacity = 0;
    } else if (sunAltitude > -0.15) {
      // Sunrise / Sunset transition
      const t = (sunAltitude + 0.15) / 0.3;
      curSky.lerpColors(this.nightSkyColor, this.sunsetSkyColor, t);
      curFog.lerpColors(this.nightFogColor, this.sunsetFogColor, t);
      this.dirLight.color.setHex(0xff9944);
      this.dirLight.intensity = 0.7;
      this.ambientLight.intensity = 0.25;
      this.hemiLight.intensity = 0.3;
      (this.stars.material as THREE.PointsMaterial).opacity = (1 - t) * 0.7;
    } else {
      // Full Night
      curSky.copy(this.nightSkyColor);
      curFog.copy(this.nightFogColor);
      this.dirLight.color.setHex(0x7799dd);
      this.dirLight.intensity = 0.25;
      this.ambientLight.intensity = 0.18;
      this.hemiLight.intensity = 0.2;
      (this.stars.material as THREE.PointsMaterial).opacity = 0.95;
    }

    this.scene.background = curSky;
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.copy(curFog);
    }
  }

  public setTime(t: number) {
    this.timeOfDay = Math.max(0, Math.min(1, t));
  }

  public dispose() {
    this.scene.remove(this.dirLight);
    this.scene.remove(this.hemiLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.stars);
    this.scene.remove(this.cloudGroup);
  }
}
