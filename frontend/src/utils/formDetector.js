/**
 * Form Detector
 * Detects document boundaries and determines if form is properly positioned
 * Used for auto-capture functionality
 */

/**
 * Detect if a form/document is properly positioned in the frame
 * @param {HTMLCanvasElement} canvas - Canvas containing the video frame
 * @returns {Object} Detection result with confidence and boundaries
 */
export function detectFormPosition(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Step 1: Edge detection
  const edges = detectEdges(imageData);
  
  // Step 2: Find rectangular contours
  const rectangles = findRectangles(edges, canvas.width, canvas.height);
  
  // Step 3: Find the best form candidate
  const formCandidate = findBestFormCandidate(rectangles, canvas.width, canvas.height);
  
  if (!formCandidate) {
    return {
      detected: false,
      confidence: 0,
      feedback: 'No document detected',
      boundaries: null
    };
  }
  
  // Step 4: Validate form position and alignment
  const validation = validateFormPosition(formCandidate, canvas.width, canvas.height);
  
  return {
    detected: validation.isValid,
    confidence: validation.confidence,
    feedback: validation.feedback,
    boundaries: formCandidate,
    metrics: validation.metrics
  };
}

/**
 * Simple edge detection using Sobel operator
 */
function detectEdges(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const edges = new Uint8Array(width * height);
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      // Apply Sobel operator
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > 50 ? 255 : 0;
    }
  }
  
  return edges;
}

/**
 * Find rectangular contours in edge-detected image
 */
function findRectangles(edges, width, height) {
  const rectangles = [];
  
  // Simple approach: Scan for continuous horizontal and vertical edges
  // that form rectangles
  
  // Downsample for performance (check every 10 pixels)
  const step = 10;
  const threshold = 0.6; // 60% edge coverage required
  
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      // Try different rectangle sizes
      const sizes = [
        { w: Math.floor(width * 0.8), h: Math.floor(height * 0.8) },
        { w: Math.floor(width * 0.7), h: Math.floor(height * 0.7) },
        { w: Math.floor(width * 0.6), h: Math.floor(height * 0.6) }
      ];
      
      for (const size of sizes) {
        if (x + size.w >= width || y + size.h >= height) continue;
        
        const score = scoreRectangle(edges, width, x, y, size.w, size.h);
        
        if (score > threshold) {
          rectangles.push({
            x, y, 
            width: size.w, 
            height: size.h,
            score,
            area: size.w * size.h
          });
        }
      }
    }
  }
  
  return rectangles;
}

/**
 * Score a rectangle based on edge coverage on its borders
 */
function scoreRectangle(edges, imageWidth, x, y, w, h) {
  let edgeCount = 0;
  let totalChecks = 0;
  const step = 5;
  
  // Check top and bottom edges
  for (let i = x; i < x + w; i += step) {
    if (edges[y * imageWidth + i] > 0) edgeCount++;
    if (edges[(y + h) * imageWidth + i] > 0) edgeCount++;
    totalChecks += 2;
  }
  
  // Check left and right edges
  for (let i = y; i < y + h; i += step) {
    if (edges[i * imageWidth + x] > 0) edgeCount++;
    if (edges[i * imageWidth + (x + w)] > 0) edgeCount++;
    totalChecks += 2;
  }
  
  return totalChecks > 0 ? edgeCount / totalChecks : 0;
}

/**
 * Find the best form candidate from detected rectangles
 */
function findBestFormCandidate(rectangles, frameWidth, frameHeight) {
  if (rectangles.length === 0) return null;
  
  // Score each rectangle based on:
  // 1. Size (prefer larger rectangles)
  // 2. Position (prefer centered)
  // 3. Aspect ratio (A4 form is ~1.4 ratio)
  // 4. Edge detection score
  
  const targetAspectRatio = 1.4; // A4 portrait
  const frameArea = frameWidth * frameHeight;
  
  let bestCandidate = null;
  let bestScore = 0;
  
  for (const rect of rectangles) {
    const aspectRatio = rect.height / rect.width;
    const aspectRatioDiff = Math.abs(aspectRatio - targetAspectRatio);
    
    // Center position
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    const centerDistance = Math.sqrt(
      Math.pow(centerX - frameCenterX, 2) + 
      Math.pow(centerY - frameCenterY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(frameWidth, 2) + Math.pow(frameHeight, 2));
    const centerScore = 1 - (centerDistance / maxDistance);
    
    // Size score (prefer 50-80% of frame)
    const sizeRatio = rect.area / frameArea;
    const sizeScore = sizeRatio > 0.5 && sizeRatio < 0.8 ? 1 : 
                      sizeRatio > 0.4 && sizeRatio < 0.9 ? 0.7 : 0.3;
    
    // Aspect ratio score
    const aspectScore = 1 - Math.min(aspectRatioDiff / targetAspectRatio, 1);
    
    // Combined score
    const combinedScore = 
      rect.score * 0.3 +           // Edge detection
      sizeScore * 0.3 +             // Size
      centerScore * 0.2 +           // Centering
      aspectScore * 0.2;            // Aspect ratio
    
    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestCandidate = { ...rect, combinedScore };
    }
  }
  
  return bestCandidate;
}

/**
 * Validate if the detected form is in optimal position
 */
function validateFormPosition(candidate, frameWidth, frameHeight) {
  const metrics = {
    size: candidate.area / (frameWidth * frameHeight),
    aspectRatio: candidate.height / candidate.width,
    centerX: (candidate.x + candidate.width / 2) / frameWidth,
    centerY: (candidate.y + candidate.height / 2) / frameHeight,
    edgeScore: candidate.score
  };
  
  const issues = [];
  let confidence = 100;
  
  // Check size (should be 50-80% of frame)
  if (metrics.size < 0.5) {
    issues.push('Move closer to form');
    confidence -= 30;
  } else if (metrics.size > 0.85) {
    issues.push('Move slightly back');
    confidence -= 20;
  }
  
  // Check aspect ratio (A4 is ~1.4)
  const aspectRatioDiff = Math.abs(metrics.aspectRatio - 1.4);
  if (aspectRatioDiff > 0.3) {
    issues.push('Align form properly');
    confidence -= 25;
  }
  
  // Check centering (should be near center)
  const centerDiffX = Math.abs(metrics.centerX - 0.5);
  const centerDiffY = Math.abs(metrics.centerY - 0.5);
  if (centerDiffX > 0.15 || centerDiffY > 0.15) {
    issues.push('Center the form');
    confidence -= 20;
  }
  
  // Check edge detection quality
  if (metrics.edgeScore < 0.5) {
    issues.push('Hold steady, focus unclear');
    confidence -= 25;
  }
  
  const isValid = confidence >= 85;
  
  return {
    isValid,
    confidence,
    metrics,
    feedback: isValid ? '✓ Perfect! Hold steady...' : issues.join(', ')
  };
}

/**
 * Check if lighting conditions are adequate
 */
export function checkLightingConditions(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let totalBrightness = 0;
  const sampleSize = Math.floor(data.length / 4 / 100); // Sample 1% of pixels
  
  for (let i = 0; i < data.length; i += 4 * 100) {
    const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    totalBrightness += brightness;
  }
  
  const avgBrightness = totalBrightness / sampleSize;
  
  return {
    adequate: avgBrightness >= 100 && avgBrightness <= 220,
    brightness: avgBrightness,
    feedback: avgBrightness < 100 ? 'Too dark - add more light' :
              avgBrightness > 220 ? 'Too bright - reduce light' :
              'Lighting OK'
  };
}

/**
 * Simplified fast detection for real-time feedback
 * Less accurate but faster for continuous monitoring
 */
export function quickFormCheck(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Sample center region
  const sampleSize = Math.min(width, height) / 4;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const imageData = ctx.getImageData(
    centerX - sampleSize / 2,
    centerY - sampleSize / 2,
    sampleSize,
    sampleSize
  );
  
  const data = imageData.data;
  let edgeCount = 0;
  
  // Quick edge detection on sample
  for (let i = 0; i < data.length - 4; i += 4) {
    const diff = Math.abs(
      (data[i] + data[i + 1] + data[i + 2]) - 
      (data[i + 4] + data[i + 5] + data[i + 6])
    );
    if (diff > 100) edgeCount++;
  }
  
  const edgeRatio = edgeCount / (data.length / 4);
  
  return {
    likelyDocument: edgeRatio > 0.1 && edgeRatio < 0.5,
    edgeRatio,
    confidence: Math.min(edgeRatio * 200, 100)
  };
}
