How the Athletes runner (assets/characters/athletes-run/) was built from the approved 30-frame storyboard (storyboard-30-frames-approved.webp):
1. clean.py / clean2.py: the 30 panels cut out; background, frame labels, pill and card title removed (letters only); the ball found per frame
2. meas.py: the ball cut out of each frame, the figure isolated and measured
3. reg.py: every frame on one canvas - the rows scaled alike, the ground line and the head position aligned; the ground glow removed
4. flow.py: the motion between each frame and the next (and back), TV-L1 optical flow
5. preview30.py: an offline check of every in-between moment (no doubled limbs)
6. pack.py: poses.webp (30 tone tiles), flow-next.png / flow-prev.png (motion, 128 +- 4 per pose unit), ball.webp, the ball path, still.webp
