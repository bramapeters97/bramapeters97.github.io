# Native screenshot output

No native screenshots have been captured in this Windows environment. This directory intentionally contains instructions rather than old web captures or generated application imagery.

On a Mac with Xcode and an installed medium Dynamic Island iPhone Simulator:

```sh
xcrun simctl list devices available
bash scripts/capture-screenshots.sh YOUR_SIMULATOR_UDID
```

The workflow executes seven screenshot UI tests, exports actual `.xcresult` attachments, flattens PNG alpha without scaling, and records the capture device inventory. Review every image and the resulting dimensions against Apple's current screenshot page before upload. Portrait examples currently accepted for the required medium display are 1179×2556 and 1206×2622. Do not resize a capture from the wrong device merely to force those dimensions.

The simulated status bar is standardized with Apple's Simulator tool; the app does not draw fake hardware/status indicators. Marketing backgrounds/device frames, if later created, belong in a separate promotional-assets folder and must depict real app functionality.
