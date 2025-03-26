/** @format */

// Override common fingerprinting APIs
(function () {
  // Canvas fingerprinting protection
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Add slight noise to canvas data
  function addNoise(data) {
    const noise = Math.random() * 0.01;
    return data.map((value) => value + value * noise);
  }

  // Override canvas methods
  HTMLCanvasElement.prototype.getContext = function (type) {
    const context = originalGetContext.apply(this, arguments);
    if (context && type === "2d") {
      context.getImageData = function () {
        const imageData = originalGetImageData.apply(this, arguments);
        imageData.data = addNoise(Array.from(imageData.data));
        return imageData;
      };
    }
    return context;
  };

  HTMLCanvasElement.prototype.toDataURL = function () {
    const dataURL = originalToDataURL.apply(this, arguments);
    return dataURL.replace(/,([^,]+)$/, (_, data) => {
      const decodedData = atob(data);
      const noisyData = addNoise(Array.from(decodedData));
      return "," + btoa(String.fromCharCode.apply(null, noisyData));
    });
  };

  // Audio fingerprinting protection
  const originalAudioContext = window.AudioContext || window.webkitAudioContext;
  window.AudioContext = window.webkitAudioContext = function () {
    const context = new originalAudioContext();
    const originalGetChannelData = context.getChannelData;
    context.getChannelData = function () {
      const data = originalGetChannelData.apply(this, arguments);
      return addNoise(Array.from(data));
    };
    return context;
  };

  // Navigator and screen properties protection
  const protectedProps = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: 4,
    deviceMemory: 8,
    languages: ["en-US"],
  };

  // Create protected navigator proxy
  const navigatorHandler = {
    get: function (target, property) {
      if (property in protectedProps) {
        return protectedProps[property];
      }
      return target[property];
    },
  };

  // Override navigator object
  window.navigator = new Proxy(navigator, navigatorHandler);

  // WebGL fingerprinting protection
  const getParameterProxyHandler = {
    apply: function (target, thisArg, args) {
      const parameter = args[0];
      const gl = thisArg;

      // Add noise to precision-dependent parameters
      if (
        parameter === gl.ALIASED_LINE_WIDTH_RANGE ||
        parameter === gl.ALIASED_POINT_SIZE_RANGE
      ) {
        return new Float32Array([1, 1024]);
      }

      return target.apply(thisArg, args);
    },
  };

  // Apply WebGL protection
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = new Proxy(
    originalGetParameter,
    getParameterProxyHandler
  );

  // Battery status protection
  if (navigator.getBattery) {
    navigator.getBattery = function () {
      return Promise.resolve({
        charging: true,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        level: 0.75,
      });
    };
  }

  // Protect against timing attacks
  const originalNow = Date.now;
  const startTime = originalNow();
  Date.now = function () {
    return startTime + Math.floor(originalNow() - startTime);
  };

  // Performance timing protection
  if (window.performance && performance.now) {
    const originalPerformanceNow = performance.now;
    performance.now = function () {
      return Math.floor(originalPerformanceNow.call(performance));
    };
  }
})();
