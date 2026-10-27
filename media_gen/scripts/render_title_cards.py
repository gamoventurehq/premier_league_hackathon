import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs("media_gen/cards", exist_ok=True)

def create_card(title, subtitle, badge, filename):
    w, h = 1920, 1080
    # Background: dark studio navy gradient
    img = Image.new("RGB", (w, h), color=(10, 14, 26))
    draw = ImageDraw.Draw(img)
    
    # Accent top border
    draw.rectangle([(0, 0), (w, 6)], fill=(56, 189, 248))
    
    # Subtitle / Category
    draw.text((160, 360), badge.upper(), fill=(56, 189, 248))
    
    # Title
    draw.text((160, 420), title, fill=(248, 250, 252))
    
    # Subtitle
    draw.text((160, 520), subtitle, fill=(148, 163, 184))
    
    # Footer
    draw.text((160, 920), "MICROSOFT PREMIER LEAGUE HACKATHON 2026 | GAMOVENTURE", fill=(100, 116, 139))
    
    out_path = os.path.join("media_gen/cards", filename)
    img.save(out_path)
    print(f"Created card: {out_path}")

create_card(
    title="Premier League Studio",
    subtitle="Synthetic Match Insights Engine powered by Microsoft Azure",
    badge="Gamoventure Solution Architecture",
    filename="intro_card.png"
)

create_card(
    title="Ready for Production Broadcast",
    subtitle="Explainable Football Intelligence | Multi-Agent Swarm | Microsoft Foundry",
    badge="Submission Complete",
    filename="outro_card.png"
)
