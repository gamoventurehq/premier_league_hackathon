import os
from PIL import Image, ImageDraw, ImageFont

def create_outro_card():
    w, h = 1920, 1080
    banner_path = "media_gen/cards/official_banner.png"
    banner = Image.open(banner_path).convert("RGBA")
    
    # Fonts
    font_bold_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    font_reg_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    
    f_badge = ImageFont.truetype(font_bold_path, 20)
    f_h1 = ImageFont.truetype(font_bold_path, 48)
    f_h2 = ImageFont.truetype(font_bold_path, 28)
    f_p = ImageFont.truetype(font_reg_path, 21)
    f_sub = ImageFont.truetype(font_reg_path, 19)
    f_stat_num = ImageFont.truetype(font_bold_path, 36)
    f_stat_lbl = ImageFont.truetype(font_reg_path, 16)

    # Base background: deep Premier League dark purple
    card = Image.new("RGBA", (w, h), (18, 8, 30, 255))
    draw = ImageDraw.Draw(card)

    # Left content column width: 920px
    # Right banner width: 850px
    bw, bh = banner.size
    target_w = 840
    target_h = int(bh * (target_w / bw))
    banner_resized = banner.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    banner_x = w - target_w - 60
    banner_y = (h - target_h) // 2
    
    # Outer glow box for banner
    glow_box = [banner_x - 6, banner_y - 6, banner_x + target_w + 6, banner_y + target_h + 6]
    draw.rounded_rectangle(glow_box, radius=18, outline=(192, 132, 252, 160), width=3)
    card.paste(banner_resized, (banner_x, banner_y), banner_resized)

    # Left Side: Gamoventure Architecture & Hackathon Pillars
    lx = 80
    
    # Top Tag
    draw.rounded_rectangle([lx, 80, lx + 300, 122], radius=8, fill=(49, 10, 80), outline=(236, 72, 153), width=2)
    draw.text((lx + 20, 92), "GAMOVENTURE STUDIO", font=f_badge, fill=(244, 114, 182))
    
    # Main Headline
    draw.text((lx, 150), "Premier League Studio", font=f_h1, fill=(255, 255, 255))
    draw.text((lx, 212), "Synthetic Match Insights Engine", font=f_h2, fill=(56, 189, 248))
    
    # Narrative paragraph
    desc = "Azure-native real-time tactical reasoning platform powering synchronized\nbroadcast overlays, dual-persona storytelling, and sub-50ms pitch metrics."
    draw.text((lx, 265), desc, font=f_p, fill=(203, 213, 225))
    
    # 4 Key Pillars Bento Cards
    pillars = [
        ("TECHNOLOGICAL IMPLEMENTATION", "5Hz Spatial Telemetry • 3D Ball Kinematics • <50ms PDR", (14, 165, 233)),
        ("AGENTIC DESIGN & INNOVATION", "4-Agent Swarm • Shared Blackboard • Microsoft Foundry", (168, 85, 247)),
        ("BROADCAST HUD & OVERLAYS", "Time-Synchronized Overlays • Automated Studio Teleprompter", (236, 72, 153)),
        ("DUAL EXPERIENCE & IMPACT", "Analyst vs. Casual • Player Cam • 5-Language Stream", (34, 197, 94))
    ]
    
    by = 350
    for i, (title, sub, color) in enumerate(pillars):
        box_y = by + (i * 96)
        # card background
        draw.rounded_rectangle([lx, box_y, lx + 860, box_y + 80], radius=12, fill=(28, 16, 46), outline=(78, 48, 112), width=2)
        # color pill indicator
        draw.rounded_rectangle([lx + 18, box_y + 16, lx + 24, box_y + 64], radius=3, fill=color)
        draw.text((lx + 42, box_y + 16), title, font=f_badge, fill=color)
        draw.text((lx + 42, box_y + 44), sub, font=f_sub, fill=(241, 245, 249))
        
    # Bottom Stats Bar
    stat_box_y = 760
    draw.rounded_rectangle([lx, stat_box_y, lx + 860, stat_box_y + 115], radius=16, fill=(20, 11, 35), outline=(147, 51, 234, 200), width=2)
    
    stats = [
        ("< 50ms", "Fast-Path Latency"),
        ("100%", "Synthetic Match Data"),
        ("4 Agents", "Foundry Swarm"),
        ("< 120s", "Broadcast Ready")
    ]
    
    col_w = 860 // 4
    for i, (val, label) in enumerate(stats):
        cx = lx + (i * col_w) + 30
        draw.text((cx, stat_box_y + 22), val, font=f_stat_num, fill=(255, 255, 255))
        draw.text((cx, stat_box_y + 70), label, font=f_stat_lbl, fill=(192, 185, 200))
        if i > 0:
            draw.line([(lx + (i * col_w), stat_box_y + 18), (lx + (i * col_w), stat_box_y + 97)], fill=(78, 48, 112), width=1)

    # Footer
    draw.text((lx, 915), "OFFICIAL HACKATHON ENTRY • MICROSOFT AZURE & THE FOOTBALL ASSOCIATION PREMIER LEAGUE", font=f_badge, fill=(216, 180, 254))
    draw.text((lx, 955), "Repository: github.com/gamoventurehq/premier_league_hackathon  |  Participant: Gamoventure", font=f_sub, fill=(148, 163, 184))
    
    out_file = "media_gen/cards/rich_outro_card.png"
    card.save(out_file)
    print(f"Saved rich outro card to {out_file}")

create_outro_card()
