import os
from moviepy import (
    VideoFileClip,
    AudioFileClip,
    ImageClip,
    concatenate_videoclips,
    CompositeVideoClip
)

OUTPUT_VIDEO = "media_gen/premier_league_studio_demo.mp4"

def make_scene(video_path, audio_path):
    audio = AudioFileClip(audio_path)
    dur = audio.duration
    video = VideoFileClip(video_path)
    
    # Loop or trim video to audio duration exactly
    if video.duration < dur:
        # Loop if needed or hold last frame
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
    print("Preparing clips for assembly...")
    
    # Scene 1: Intro (Audio 1 with Dashboard Video)
    scene1 = make_scene("media_gen/video/scene1_dashboard.webm", "media_gen/audio/scene1_hook.mp3")
    
    # Scene 2: Tech & Physics (Audio 2 with Pitch Video)
    scene2 = make_scene("media_gen/video/scene2_pitch.webm", "media_gen/audio/scene2_tech_physics.mp3")
    
    # Scene 3: Agentic Swarm (Audio 3 with Diagnostics Video)
    scene3 = make_scene("media_gen/video/scene3_diagnostics.webm", "media_gen/audio/scene3_agentic_foundry.mp3")
    
    # Scene 4: Personas & Broadcast (Audio 4 with Personas Video)
    scene4 = make_scene("media_gen/video/scene4_personas.webm", "media_gen/audio/scene4_personas_broadcast.mp3")
    
    # Scene 5: Scenarios & Recap (Audio 5 with Scenarios Video)
    scene5 = make_scene("media_gen/video/scene5_scenarios.webm", "media_gen/audio/scene5_scenarios_recap.mp3")
    
    # Scene 6: Outro (Audio 6 with Outro Card)
    scene6 = make_image_scene("media_gen/cards/outro_card.png", "media_gen/audio/scene6_outro.mp3")
    
    print("Concatenating 6 scenes...")
    final = concatenate_videoclips([scene1, scene2, scene3, scene4, scene5, scene6], method="compose")
    
    print(f"Total video duration: {final.duration:.2f} seconds (Limit: < 120.0s)")
    assert final.duration < 120.0, f"Video exceeds 120s limit! Actual: {final.duration}s"
    
    print(f"Writing final MP4 to {OUTPUT_VIDEO} at 1920x1080 30fps...")
    final.write_videofile(
        OUTPUT_VIDEO,
        fps=30,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=4
    )
    print("Video generation successfully completed!")

if __name__ == "__main__":
    main()
