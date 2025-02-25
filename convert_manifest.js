const fs = require("fs");

// Load manifest.json
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

// Extract images from the stack
const imagesData = manifest.stack.map(layer => ({
    filename: layer.content,  // The actual image file
    x: layer.rect.x,
    y: layer.rect.y,
    width: layer.rect.w,
    height: layer.rect.h,
    opacity: layer.opacity !== undefined ? layer.opacity : 1, // Default to 1 (fully visible)
    visible: layer.visible !== undefined ? layer.visible : true, // Default to true
    zoom: layer.zoom !== undefined ? layer.zoom : true,
    name: layer.name
}));

// Save as images.json
fs.writeFileSync("images.json", JSON.stringify(imagesData, null, 4));

console.log(`✅ images.json created with ${imagesData.length} layers!`);
