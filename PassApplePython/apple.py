import os
import random
import numpy as np
from datetime import datetime
from PIL import Image, ImageOps, ImageFilter, ImageDraw

# Optional import for advanced image processing
try:
    from scipy.ndimage import map_coordinates
    _SCIPY_AVAILABLE = True
except ImportError:
    _SCIPY_AVAILABLE = False
    print("Warning: scipy not found. Advanced image transformations (like 3D bulge) will be disabled.")

def apply_bulge_effect(image, bounding_box, strength=0.7):
    """
    Applies a 3D bulge (spherical) effect to the image within the bounding box.
    'strength' controls the intensity of the bulge (0.0 to 1.0).
    """
    if not _SCIPY_AVAILABLE:
        print("Error: scipy is not available, cannot apply bulge effect.")
        return image
    
    width, height = image.size
    min_x, min_y, max_x, max_y = bounding_box
    
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    radius_x = (max_x - min_x) / 2
    radius_y = (max_y - min_y) / 2
    
    x = np.arange(width)
    y = np.arange(height)
    xv, yv = np.meshgrid(x, y)
    
    dx = (xv - center_x) / radius_x
    dy = (yv - center_y) / radius_y
    
    dist_sq = dx**2 + dy**2
    mask = dist_sq <= 1.0
    
    map_x = xv.astype(np.float32)
    map_y = yv.astype(np.float32)
    
    dist = np.sqrt(dist_sq[mask])
    
    # Standard spherical projection factor
    factor = np.ones_like(dist)
    non_zero_dist_mask = dist > 0
    # Calculate full distortion factor
    full_factor = np.arcsin(dist[non_zero_dist_mask]) / (dist[non_zero_dist_mask] * (np.pi / 2))
    
    # Interpolate between 1.0 (no distortion) and full_factor based on strength
    factor[non_zero_dist_mask] = 1.0 + (full_factor - 1.0) * strength
    
    new_dx = dx[mask] * factor
    new_dy = dy[mask] * factor
    
    map_x[mask] = center_x + new_dx * radius_x
    map_y[mask] = center_y + new_dy * radius_y
    
    # Ensure coordinates are within bounds
    map_x = np.clip(map_x, 0, width - 1)
    map_y = np.clip(map_y, 0, height - 1)
    
    img_array = np.array(image)
    output_array = np.zeros_like(img_array)
    
    # For each channel
    for i in range(img_array.shape[2]):
        # Note: map_coordinates expects (y, x)
        output_array[:, :, i] = map_coordinates(img_array[:, :, i], [map_y, map_x], order=1, mode='reflect')
        
    return Image.fromarray(output_array)

def load_bounding_box(path):
    """
    Reads min_x, min_y, max_x, max_y from a text file.
    Skips lines starting with # and parses comma or space separated values.
    """
    if not os.path.exists(path):
        return None
    try:
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                # Replace commas with spaces and split
                parts = line.replace(',', ' ').split()
                coords = [int(v) for v in parts]
                if len(coords) == 4:
                    return tuple(coords)
    except Exception as e:
        print(f"Warning: Failed to read bounding box from {path}: {e}")
    return None

def create_masked_overlay(background_path, target_path, mask_path, output_dir, bbox_path=None):
    """
    1. Detects bounding box from bbox_path (bounding_box.txt) or mask_path.
    2. Bulges both mask_path (apple_input) and target_path (apple_yake).
    3. Uses the bulged grayscale mask_path as the alpha channel for both layers.
    4. Composites all on top of background_path (apple_before).
    """
    if not all(os.path.exists(p) for p in [background_path, target_path, mask_path]):
        print("Error: One or more input files not found.")
        return

    os.makedirs(output_dir, exist_ok=True)
    # Generate dynamic filename: apple[YYMMDDHHIISS][randomnumber].png
    date_str = datetime.now().strftime("%y%m%d%H%M%S")
    random_num = random.randint(1000, 9999)
    filename = f"apple{date_str}{random_num}.png"
    output_path = os.path.join(output_dir, filename)

    try:
        with Image.open(mask_path) as mask_img_raw, \
             Image.open(target_path) as target_img, \
             Image.open(background_path) as bg_img:
            
            # --- Resize Mask to Match Target Size ---
            if mask_img_raw.size != target_img.size:
                mask_img = mask_img_raw.resize(target_img.size)
            else:
                mask_img = mask_img_raw.copy()

            # --- Determine Bounding Box ---
            bbox = None
            if bbox_path:
                bbox = load_bounding_box(bbox_path)
            
            if not bbox:
                mask_gray_orig = mask_img.convert("L")
                mask_np = np.array(mask_gray_orig)
                coords = np.argwhere(mask_np >= 10)
                if coords.size == 0:
                    print("Error: No apple shape found.")
                    return
                min_y, min_x = coords.min(axis=0)
                max_y, max_x = coords.max(axis=0)
                bbox = (min_x, min_y, max_x, max_y)

            # 1. apple_inputを球形に (Bulge apple_input to create the alpha mask)
            if _SCIPY_AVAILABLE:
                bulged_apple = apply_bulge_effect(mask_img.convert("RGB"), bbox, strength=0.7)
            else:
                bulged_apple = mask_img.convert("RGB")
            
            # Extract grayscale as the alpha mask
            # Using the original grayscale gradients directly as requested
            alpha_mask = bulged_apple.convert("L")

            # 2. apple_yakeにマスキング (Bulge apple_yake and apply the mask)
            if _SCIPY_AVAILABLE:
                bulged_yake = apply_bulge_effect(target_img.convert("RGB"), bbox, strength=0.7)
            else:
                bulged_yake = target_img.convert("RGB")
            
            bulged_yake_rgba = bulged_yake.convert("RGBA")
            bulged_yake_rgba.putalpha(alpha_mask)

            # 3. apple_yakeのアンチエイリアシング (Removed/Disabled)
            # We no longer apply blur to the alpha channel.
            # (Keeping the variable name for consistent composition code below)
            bulged_yake_rgba = bulged_yake_rgba

            # 4. apple_beforeと合成 (Composite onto the background)
            final_composition = bg_img.convert("RGBA")
            final_composition.paste(bulged_yake_rgba, (0, 0), bulged_yake_rgba)

            final_composition.save(output_path, "PNG")
            print(f"Success: Sequentially processed 3D composition saved to {output_path}")
            return filename
                
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def run(input_file=None):
    bg_file = os.path.join("dist", "apple_before.jpg")
    target_file = os.path.join("dist", "apple_yake.jpg")
    mask_file = input_file if input_file else os.path.join("input", "apple_input.jpg")
    bbox_file = os.path.join("input", "bounding_box.txt") # External bbox file
    
    output_dir = "output"
    return create_masked_overlay(bg_file, target_file, mask_file, output_dir, bbox_file)

if __name__ == "__main__":
    run()
