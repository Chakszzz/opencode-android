#!/usr/bin/env python3
"""
Generate official OpenCode brand icons and splash images for OpenCode Mobile.
OpenCode official geometry:
ViewBox 24x24:
Outer rect: [4, 2] to [20, 22] (width 16, height 20)
Inner cutout: [8, 6] to [16, 18] (width 8, height 12)
"""

from PIL import Image, ImageDraw
import os

BG_COLOR = (10, 10, 10, 255) # #0a0a0a
BG_HEX = "#0a0a0a"
MARK_COLOR = (255, 255, 255, 255) # White

def draw_opencode_mark(canvas_size, mark_height_ratio=0.6, transparent_bg=False):
    # Supersampling 4x for perfectly antialiased edges
    scale = 4
    high_res = canvas_size * scale
    
    if transparent_bg:
        img = Image.new("RGBA", (high_res, high_res), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (high_res, high_res), BG_COLOR)
        
    draw = ImageDraw.Draw(img)
    
    # In 24x24 viewBox:
    # Outer box is 16 wide x 20 high.
    # Center of 24x24 is (12, 12).
    # Outer rect: left=4, top=2, right=20, bottom=22
    # Inner cutout: left=8, top=6, right=16, bottom=18
    
    mark_height = high_res * mark_height_ratio
    unit = mark_height / 20.0 # 20 is the height of the outer rect
    mark_width = 16.0 * unit
    
    cx = high_res / 2.0
    cy = high_res / 2.0
    
    outer_left = cx - (mark_width / 2.0)
    outer_right = cx + (mark_width / 2.0)
    outer_top = cy - (mark_height / 2.0)
    outer_bottom = cy + (mark_height / 2.0)
    
    wall_thickness = 4.0 * unit
    inner_left = outer_left + wall_thickness
    inner_right = outer_right - wall_thickness
    inner_top = outer_top + wall_thickness
    inner_bottom = outer_bottom - wall_thickness
    
    # Draw outer white rect
    draw.rectangle([outer_left, outer_top, outer_right, outer_bottom], fill=MARK_COLOR)
    
    # Draw inner cutout
    cutout_color = (0, 0, 0, 0) if transparent_bg else BG_COLOR
    draw.rectangle([inner_left, inner_top, inner_right, inner_bottom], fill=cutout_color)
    
    # Downscale with high quality Lanczos filter
    final_img = img.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    return final_img

def main():
    os.makedirs("assets", exist_ok=True)
    
    # 1. assets/icon.png (1024x1024, dark bg, mark height 56% of canvas)
    icon = draw_opencode_mark(1024, mark_height_ratio=0.56, transparent_bg=False)
    icon.save("assets/icon.png", "PNG")
    print("Generated assets/icon.png (1024x1024)")
    
    # 2. assets/icon-appstore.png (1024x1024)
    icon_appstore = draw_opencode_mark(1024, mark_height_ratio=0.56, transparent_bg=False)
    icon_appstore.save("assets/icon-appstore.png", "PNG")
    print("Generated assets/icon-appstore.png (1024x1024)")
    
    # 3. assets/adaptive-icon.png (432x432, safe zone mark height 48%)
    adaptive = draw_opencode_mark(432, mark_height_ratio=0.46, transparent_bg=True)
    adaptive.save("assets/adaptive-icon.png", "PNG")
    print("Generated assets/adaptive-icon.png (432x432)")
    
    # 4. assets/splash-icon.png (200x200 or 512x512, transparent bg, white mark)
    splash = draw_opencode_mark(512, mark_height_ratio=0.65, transparent_bg=True)
    splash.save("assets/splash-icon.png", "PNG")
    print("Generated assets/splash-icon.png (512x512)")

if __name__ == "__main__":
    main()
