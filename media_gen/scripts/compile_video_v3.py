import os
from moviepy import (
    VideoFileClip,
    AudioFileClip,
    ImageClip,
    concatenate_videoclips
)

OUTPUT_VIDEO = "media_gen/premier_league_studio_demo_v3.mp4"

def make_scene(video_path, audio_path):
    audio = AudioFileClip(audio_path)
    dur = audio.duration
    video = VideoFileClip(video_path)
    
    if video.duration < dur:
        diff = dur - video.duration
        last_frame = video.to_ImageClip(video.duration - 0.05).with_duration(diff)
        video_timed = concatenate_videoclips([video, last_frame])
    else:
        video_timed = video.subclipped(0, dur)
        
    scene = video_timed.with_audio(audio)
    return scene

def make_image_scene(img_path, audio_path):
    audio = AudioFileClip(audio_path)
    dur = audio.duration
    img_clip = ImageClip(img_path).with_duration(dur)
    return img_clip.with_audio(audio)

def main():
    print("Assembling Video V3 from updated scenes and audio tracks...")
    
    # Scene 1: Master Dashboard (Audio 1 + Live Dashboard with 5Hz player spotlight & lower-thirds)
    scene1 = make_scene("media_gen/video_v3/scene1_dashboard.webm", "media_gen/audio_v3/scene1_dashboard_hook.mp3")
    
    # Scene 2: Judge Quick Tour Modal (Audio 2 + Step-by-step 5-Pillar Walkthrough)
    scene2 = make_scene("media_gen/video_v3/scene2_judge_tour.webm", "media_gen/audio_v3/scene2_judge_tour.mp3")
    
    # Scene 3: Pitch Radar & Tactical Intelligence (Audio 3 + Camera angles: Overhead -> Pressing -> Box & Tactical PDR)
    scene3 = make_scene("media_gen/video_v3/scene3_pitch_tactical.webm", "media_gen/audio_v3/scene3_pitch_tactical.mp3")
    
    # Scene 4: Personas & Multilingual Stream (Audio 4 + Analyst vs. Casual vs. Player Cam & Spanish, Japanese, Arabic feeds)
    scene4 = make_scene("media_gen/video_v3/scene4_personas.webm", "media_gen/audio_v3/scene4_personas_multilingual.mp3")
    
    # Scene 5: Scenarios, Broadcast Overlays & Teleprompter Modal (Audio 5 + Crisis injection & HT Teleprompter)
    scene5 = make_scene("media_gen/video_v3/scene5_scenarios.webm", "media_gen/audio_v3/scene5_scenarios_teleprompter.mp3")
    
    # Scene 6: Outro (Audio 6 + Official Hackathon Banner & Bento Architecture Pillars Card)
    scene6 = make_image_scene("media_gen/cards/rich_outro_card.png", "media_gen/audio_v3/scene6_architecture_outro.mp3")
    
    print("Concatenating all 6 updated scenes...")
    final = concatenate_videoclips([scene1, scene2, scene3, scene4, scene5, scene6], method="compose")
    
    print(f"Total video duration: {final.duration:.2f} seconds (Mandatory rule: < 120.0s)")
    assert final.duration < 120.0, f"Video exceeds 120s limit! Actual: {final.duration}s"
    
    print(f"Writing final V3 MP4 to {OUTPUT_VIDEO} at 1920x1080 30fps...")
    final.write_videofile(
        OUTPUT_VIDEO,
        fps=30,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4
    )
    print("V3 video compilation successfully completed!")

if __name__ == "__main__":
    main()
