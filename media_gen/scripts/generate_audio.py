import asyncio
import os
import edge_tts

VOICE = "en-GB-RyanNeural"  # Professional British broadcast commentator voice
OUTPUT_DIR = "media_gen/audio"

SCENES = [
    {
        "id": "scene1_hook",
        "text": (
            "Modern football generates millions of spatial data points every match, yet broadcast teams and fans "
            "still receive delayed, fragmented statistics. Welcome to Premier League Studio by Gamoventure: an Azure-native, "
            "synthetic match insights engine that transforms live pitch telemetry into explainable tactical storytelling in under two seconds."
        ),
    },
    {
        "id": "scene2_tech_physics",
        "text": (
            "Operating under strict synthetic data compliance, our Python physics engine simulates twenty-two players and "
            "three-dimensional parabolic ball kinematics at ten hertz. Using a Tiered Fast-Path architecture, deterministic spatial metrics "
            "like Pass Difficulty Rating and Pitch Control compute in under fifty milliseconds, guaranteeing zero broadcast frame stutter."
        ),
    },
    {
        "id": "scene3_agentic_foundry",
        "text": (
            "Orchestrated via Microsoft Foundry and Azure Event Hubs, our collaborative four-agent swarm operates across a shared blackboard. "
            "When match volatility spikes on our Control versus Chaos Index, the Tactical Reasoning Agent detects a Tactical Inflection Point, "
            "handing off structured context to the Narrative Synthesis Agent in real time."
        ),
    },
    {
        "id": "scene4_personas_broadcast",
        "text": (
            "One engine, infinite perspectives. Broadcasters receive automated, time-synchronized lower-third overlays with machine-readable "
            "JSON payloads. Meanwhile, viewers toggle seamlessly between the data-dense Analyst Experience and narrative-led Casual Experience, "
            "or spotlight a single star via Player Cam."
        ),
    },
    {
        "id": "scene5_scenarios_recap",
        "text": (
            "Broadcasters can stress-test tactical crises on demand using our Synthetic Match Scenario Injector. "
            "At the whistle, the engine automatically compiles video chapter markers, digital publication reports, and an auto-scrolling "
            "studio teleprompter script for on-air anchors."
        ),
    },
    {
        "id": "scene6_outro",
        "text": (
            "Premier League Studio: Production-grade, explainable football intelligence powered by Microsoft Azure. "
            "Built with precision by Gamoventure."
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
