import asyncio
import os
import edge_tts

VOICE = "en-GB-RyanNeural"  # Professional British Premier League broadcast voice
OUTPUT_DIR = "media_gen/audio_v3"

SCENES = [
    {
        "id": "scene1_dashboard_hook",
        "text": (
            "Modern football generates millions of spatial coordinates every match, yet broadcast teams still struggle "
            "with fragmented, post-match statistics. Welcome to Premier League Studio by Gamoventure: an Azure-native, "
            "synthetic match insights engine delivering sub-fifty-millisecond tactical reasoning and synchronized broadcast overlays."
        ),
    },
    {
        "id": "scene2_judge_tour",
        "text": (
            "Designed specifically for hackathon evaluation, our interactive Judge Quick Tour modal breaks down the entire system "
            "across all five rubric pillars: from fast-path kinematics and four-agent blackboard orchestration, "
            "to dual-fan presentation and enterprise Microsoft Azure cloud adherence."
        ),
    },
    {
        "id": "scene3_pitch_tactical",
        "text": (
            "On our live Pitch Radar, simulated at ten hertz with 3D ball gravity arcs, spatial cameras dynamically switch from "
            "full overhead pitch control to high-intensity pressing corridors and attacking box overloads. Simultaneously, "
            "the Tactical Intelligence board computes real-time Pass Difficulty Ratings and detects game rhythm shifts without frame stutter."
        ),
    },
    {
        "id": "scene4_personas_multilingual",
        "text": (
            "One engine, infinite fan perspectives. Tactical experts unlock deep Expected Threat and defensive compression curves in the Analyst Experience, "
            "while casual supporters enjoy storyline-driven duel callouts. Viewers can track individual stars through Player Cam, "
            "or experience synchronized commentary across English, Spanish, French, Japanese, and Arabic."
        ),
    },
    {
        "id": "scene5_scenarios_teleprompter",
        "text": (
            "In Studio Diagnostics, operators stress-test tactical states using our Synthetic Match Scenario Injector, "
            "while our Stage 4 Broadcast Overlay renders time-indexed lower-thirds. At the whistle, our engine auto-generates "
            "video chapter markers, digital press releases, and an auto-scrolling studio teleprompter script for on-air anchors."
        ),
    },
    {
        "id": "scene6_architecture_outro",
        "text": (
            "Premier League Studio: Production-grade football intelligence powered by Microsoft Foundry and Azure Cloud. "
            "Engineered with excellence by Gamoventure."
        ),
    },
]

async def generate_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for scene in SCENES:
        out_path = os.path.join(OUTPUT_DIR, f"{scene['id']}.mp3")
        print(f"Generating audio for {scene['id']}...")
        communicate = edge_tts.Communicate(scene["text"], voice=VOICE, rate="+5%")
        await communicate.save(out_path)
        print(f"Saved: {out_path}")

if __name__ == "__main__":
    asyncio.run(generate_all())
