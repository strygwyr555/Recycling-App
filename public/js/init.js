import CameraHandler from './camera.js';

window.addEventListener('load', async () => {
    try {
        const camera = new CameraHandler();
        await camera.init();
    } catch (error) {
        console.error('Failed to initialize camera:', error);
    }
});