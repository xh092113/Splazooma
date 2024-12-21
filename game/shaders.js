export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRotateSpeed;
  uniform float uCenterRadius;

  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDistanceToCenter;

  vec2 wave(float waveSize, float tipDistance, float centerDistance) {
    // Tip is the fifth vertex drawn per blade
    bool isTip = (gl_VertexID + 1) % 5 == 0;

    float waveDistance = isTip ? tipDistance : centerDistance;
    vec2 waveVec = vec2(sin((uTime * 2.0) + waveSize), 0.0) * waveDistance;

    if (uRotateSpeed > 0.0){
      vDistanceToCenter = vPosition.x * vPosition.x + vPosition.z * vPosition.z;
      if (vDistanceToCenter < (uCenterRadius + 15.0) * (uCenterRadius + 15.0)){
        float lambda = 1.0 * uRotateSpeed * ((uCenterRadius + 15.0) * (uCenterRadius + 15.0) - vDistanceToCenter) / (30.0 * uCenterRadius + 225.0);
        vec2 centerOffset = normalize(vec2(vPosition.x, vPosition.z));
        waveVec += centerOffset * waveDistance * lambda;
        waveVec += vec2(centerOffset.y, -centerOffset.x) * waveDistance * lambda;
      }
    }

    return waveVec;
  }

  void main() {
    vPosition = position;
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    if (vPosition.y < 0.0) {
      vPosition.y = 0.0;
    } else {
      vec2 waveVec = wave(uv.x * 10.0, 0.3, 0.1);
      vPosition.x += waveVec.x;
      vPosition.z += waveVec.y;      
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  uniform sampler2D uCloud;

  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vNormal;

  vec3 green = vec3(0.2, 0.6, 0.3);

  void main() {
    vec3 color = mix(green * 0.7, green, vPosition.y);
    color = mix(color, texture2D(uCloud, vUv).rgb, 0.4);

    float lighting = normalize(dot(vNormal, vec3(10)));
    gl_FragColor = vec4(color + lighting * 0.03, 1.0);
  }
`
