import * as THREE from 'three';

/**
 * Real photographic cutouts (see ATTRIBUTION.md — Adobe Stock photos, background
 * removed with the Photoshop API) rendered as camera-facing sprites. A sprite
 * is the right primitive here: these are flat 2D photo cutouts meant to drift
 * through parallax depth, not lit 3D geometry, so there's no lighting/material
 * cost beyond a plain textured quad that always faces the camera.
 */

const loader = new THREE.TextureLoader();
const textureCache = new Map();
const aspectByPath = new Map();

function loadTexture(path){
  if (textureCache.has(path)) return textureCache.get(path);
  const texture = loader.load(path, (tex) => {
    const img = tex.image;
    if (img && img.width) aspectByPath.set(path, img.width / img.height);
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(path, texture);
  return texture;
}

/** Image width/height ratio once loaded, else 1 (used to keep sprite scale
 * from stretching the photo before its texture has finished loading). */
export function aspectOf(path){
  return aspectByPath.get(path) || 1;
}

/** Creates a hidden sprite for a photo layer. */
export function createPhotoSprite(path){
  const material = new THREE.SpriteMaterial({ map: loadTexture(path), transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  sprite.userData.path = path;
  return sprite;
}
