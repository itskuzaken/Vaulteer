# Plan: Fix Camera Black Screen and Image Capture Issues

**TL;DR:** The camera shows a black screen because the video metadata isn't loaded before display. Images don't show because the canvas captures before video is ready (0x0 dimensions). The OCR upload fails because the blob loses its MIME type during conversion. Fix by adding metadata event listeners, validating video dimensions before capture, and manually converting base64 to blob with explicit MIME type.

---

## Steps

1. **Add video metadata event listener in `startCamera()` function** [`frontend/src/components/navigation/Form/HTSFormManagement.js:83-89`]
   - Replace immediate `.play()` call with `onloadedmetadata` event handler
   - Ensure video dimensions are loaded before allowing capture
   - Add console logging for debugging video dimensions
   - This fixes the black screen issue by waiting for the video stream to fully initialize

2. **Add dimension validation in `captureImage()` function** [`frontend/src/components/navigation/Form/HTSFormManagement.js:121-128`]
   - Check if `video.videoWidth > 0` and `video.videoHeight > 0` before capture
   - Show user-friendly alert if video not ready
   - Prevent capturing empty/black images with 0x0 canvas
   - This ensures images are only captured when the video feed is actually displaying

3. **Create `dataURLtoBlob()` helper function** [New function in `HTSFormManagement.js`]
   - Manual base64 to Blob converter with explicit MIME type
   - Decode base64, create Uint8Array, wrap in Blob with `type: 'image/jpeg'`
   - Ensures backend multer validation passes
   - This fixes the "Only image files are allowed" error

4. **Update `handleAnalyzeImages()` to use proper blob conversion** [`frontend/src/components/navigation/Form/HTSFormManagement.js:237-241`]
   - Replace `fetch().then(r => r.blob())` with `dataURLtoBlob()` helper
   - Set explicit MIME type as `'image/jpeg'`
   - Ensure FormData contains properly typed blobs
   - This ensures OCR analysis endpoint receives valid image files

5. **Add video readiness indicator in camera modal** [`frontend/src/components/navigation/Form/HTSFormManagement.js:513-531`]
   - Add state variable `isVideoReady` to track metadata loaded status
   - Disable "Capture" button until video is ready
   - Show loading indicator while camera initializes
   - Improves UX by preventing premature capture attempts

6. **Add error boundaries and fallback handling** [Multiple locations in `HTSFormManagement.js`]
   - Catch and handle video play errors gracefully
   - Add timeout for metadata loading (10 seconds)
   - Show helpful error messages if camera fails to initialize
   - Provide "Retry" option if video doesn't load

---

## Further Considerations

1. **Testing strategy?** Should test on Chrome Desktop, Firefox, Safari (macOS/iOS), Edge, and mobile browsers (iOS Safari, Chrome Mobile) to ensure fixes work across all platforms. Add console logging to track video metadata loading times for debugging.

2. **Image quality optimization?** Current implementation captures full camera resolution which may create very large base64 strings (5-10MB per image). Consider adding canvas resizing to max width/height (e.g., 1920x1080) to reduce memory usage and improve upload performance, especially on mobile devices with high-resolution cameras.

3. **Progressive enhancement?** Add feature detection to check if `getUserMedia` is supported before showing camera option. For unsupported browsers, could provide file upload fallback (<input type="file" accept="image/*" capture="camera">) to maintain functionality on older devices.
