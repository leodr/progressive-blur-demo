// ***** OPTIMIZED GPU BLUR (WEBGL2) IMPLEMENTATION *****
// This worker uses OffscreenCanvas + WebGL2 to apply a dynamic blur
// based on your config. Real-time speeds, no more CPU loop cringe.

interface BlurConfig {
  enabled: boolean;
  startPoint: number;
  endPoint: number;
  maxKernelSize: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  blurType: 'linear' | 'gaussian';
}

interface WorkerMessage {
  imageData?: Uint8ClampedArray;
  width?: number;
  height?: number;
  config?: BlurConfig;
  type: 'process' | 'getEasings';
}

// For compatibility with the old API
const easingMap: Record<string, number> = {
  linear: 0,
  easeIn: 1,
  easeOut: 2,
  easeInOut: 3,
};
const blurTypeMap: Record<string, number> = {
  linear: 0,
  gaussian: 1,
};

// Vertex shader (standard fullscreen quad)
const vertexShaderSource = `#version 300 es
precision highp float;
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main(){
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Fragment shader performing separable blur (direction controlled via uniform)
// It computes a dynamic kernel size (per-fragment) based on v_texCoord.y and config.
const fragmentShaderSource = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_direction; // (1,0)=horizontal, (0,1)=vertical
uniform float u_startPoint;
uniform float u_endPoint;
uniform int u_maxKernelSize;
uniform int u_easing;    // 0: linear, 1: easeIn, 2: easeOut, 3: easeInOut
uniform int u_blurType;  // 0: linear, 1: gaussian

// Must be >= (u_maxKernelSize-1)/2; we assume maxKernelSize is reasonable (<2001)
const int MAX_RADIUS = 1000;

float easingFunc(float x) {
  if(u_easing == 0) {
    return x;
  } else if(u_easing == 1) {
    return x * x * (2.0 * x - 1.0);
  } else if(u_easing == 2) {
    return x * (2.0 - x);
  } else { // easeInOut
    return (x < 0.5) ? (2.0 * x * x) : (-1.0 + (4.0 - 2.0 * x) * x);
  }
}

void main(){
  float normalizedY = v_texCoord.y;
  float kernelSize;
  if(normalizedY < u_startPoint){
    kernelSize = 0.0;
  } else if(normalizedY > u_endPoint){
    kernelSize = float(u_maxKernelSize);
  } else {
    float rangeProgress = (normalizedY - u_startPoint) / (u_endPoint - u_startPoint);
    float easedProgress = easingFunc(rangeProgress);
    kernelSize = floor(easedProgress * float(u_maxKernelSize));
    // Ensure odd kernel size:
    if(mod(kernelSize, 2.0) < 0.5){
      kernelSize = kernelSize + 1.0;
    }
  }
  // If no blur, just pass through:
  if(kernelSize < 1.0){
    outColor = texture(u_image, v_texCoord);
    return;
  }
  float radius = (kernelSize - 1.0) / 2.0;
  vec4 color = vec4(0.0);
  float weightSum = 0.0;
  float sigma = kernelSize / 6.0;
  int effectiveRadius = int(radius);
  for(int i = -MAX_RADIUS; i <= MAX_RADIUS; i++){
    if(i < -effectiveRadius || i > effectiveRadius) continue;
    float offset = float(i);
    float weight = (u_blurType == 0)
                   ? (1.0 / kernelSize)
                   : exp(-0.5 * (offset / sigma) * (offset / sigma));
    vec2 uvOffset = v_texCoord + u_direction * (offset / u_resolution);
    color += texture(u_image, uvOffset) * weight;
    weightSum += weight;
  }
  outColor = color / weightSum;
}`;

// Utility: Compile a shader.
function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error: " + log);
  }
  return shader;
}

// Utility: Create shader program.
function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program link error: " + log);
  }
  return program;
}

// Set up a fullscreen quad.
function setupQuad(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const posLoc = gl.getAttribLocation(program, "a_position");
  const texLoc = gl.getAttribLocation(program, "a_texCoord");

  // Two triangles covering the viewport
  const vertices = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
    -1,  1,  0, 1,
     1, -1,  1, 0,
     1,  1,  1, 1,
  ]);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
  gl.bindVertexArray(null);
  return vao;
}

// Create a texture from image data.
function createTexture(gl: WebGL2RenderingContext, width: number, height: number, data: Uint8ClampedArray): WebGLTexture {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, data);
  return texture;
}

// Create an empty texture (for framebuffer rendering).
function createEmptyTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, null);
  return texture;
}

// Render one pass (either horizontal or vertical).
function renderPass(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  vao: WebGLVertexArrayObject,
  inputTex: WebGLTexture,
  direction: [number, number],
  width: number,
  height: number,
  config: BlurConfig
) {
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  // Set uniforms:
  const uImage = gl.getUniformLocation(program, "u_image");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uDirection = gl.getUniformLocation(program, "u_direction");
  const uStartPoint = gl.getUniformLocation(program, "u_startPoint");
  const uEndPoint = gl.getUniformLocation(program, "u_endPoint");
  const uMaxKernelSize = gl.getUniformLocation(program, "u_maxKernelSize");
  const uEasing = gl.getUniformLocation(program, "u_easing");
  const uBlurType = gl.getUniformLocation(program, "u_blurType");

  gl.uniform2f(uResolution, width, height);
  gl.uniform2f(uDirection, direction[0], direction[1]);
  gl.uniform1f(uStartPoint, config.startPoint);
  gl.uniform1f(uEndPoint, config.endPoint);
  gl.uniform1i(uMaxKernelSize, config.maxKernelSize);
  gl.uniform1i(uEasing, easingMap[config.easing]);
  gl.uniform1i(uBlurType, blurTypeMap[config.blurType]);

  // Bind input texture to unit 0.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, inputTex);
  gl.uniform1i(uImage, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}

// Main GPU blur function
async function processBlurGPU(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  config: BlurConfig
): Promise<Uint8ClampedArray> {
  if (!config.enabled) return imageData; // short-circuit if blur’s off

  const offscreen = new OffscreenCanvas(width, height);
  const gl = offscreen.getContext("webgl2") as WebGL2RenderingContext;
  if (!gl) {
    throw new Error("WebGL2 not supported in this environment.");
  }
  gl.viewport(0, 0, width, height);

  // Create our program and quad
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  const vao = setupQuad(gl, program);

  // Create textures:
  const originalTex = createTexture(gl, width, height, imageData);
  const tempTex = createEmptyTexture(gl, width, height);
  const finalTex = createEmptyTexture(gl, width, height);

  // Create framebuffer:
  const fb = gl.createFramebuffer()!;

  // --- Pass 1: Horizontal blur ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tempTex, 0);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderPass(gl, program, vao, originalTex, [1, 0], width, height, config);

  // --- Pass 2: Vertical blur ---
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, finalTex, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderPass(gl, program, vao, tempTex, [0, 1], width, height, config);

  // Read pixels from finalTex:
  const pixels = new Uint8Array(width * height * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // Cleanup (optional but based)
  gl.deleteTexture(originalTex);
  gl.deleteTexture(tempTex);
  gl.deleteTexture(finalTex);
  gl.deleteFramebuffer(fb);
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);

  return new Uint8ClampedArray(pixels);
}

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;
  switch (type) {
    case 'getEasings':
      self.postMessage({ type: 'easings', easings: Object.keys(easingMap) });
      break;
    case 'process': {
      const { imageData, width, height, config } = e.data;
      if (!imageData || !width || !height || !config) return;
      try {
        const processedData = await processBlurGPU(imageData, width, height, config);
        self.postMessage({ type: 'processed', processedData });
      } catch (err) {
        console.error("Blur processing failed:", err);
      }
      break;
    }
  }
};