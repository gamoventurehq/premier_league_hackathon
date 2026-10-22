# 0003: Metric 105m x 68m Spatial Telemetry Standard at 10Hz/5Hz

To match authentic Premier League tracking data standards and compute real-world physical velocities (km/h and m/s), we decided to standardize the simulation engine on a 105m × 68m metric coordinate system running at 10Hz, downsampled to 5Hz over WebSockets for client consumption. This eliminates artificial coordinate scaling and enables standard spatial algorithms (Voronoi pitch control, distance-weighted pass difficulty, and player sprint metrics) to run natively without conversion overhead.
