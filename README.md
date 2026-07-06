# @glasshome/widgets

Reference implementation of the built-in widgets that ship with [GlassHome](https://glasshome.app), the local-first dashboard for Home Assistant. Not published to npm -- browse the source for widget development patterns, and see the [widget development guide](https://glasshome.app/docs/widget-development) to build your own.

## Structure

```
widgets/
  src/
    clock/          # Analog/digital clock
    weather/        # Weather forecast
    light/          # Light control with brightness/color
    switch/         # Toggle switch
    climate/        # HVAC controls
    camera/         # Live camera feed
    media-player/   # Media playback controls
    sensor/         # Sensor readings with sparkline
    battery/        # Battery status overview
    area/           # Area entity dashboard
    ...
```

## Building widgets

Use the [@glasshome/widget-sdk](https://github.com/glasshome/widget-sdk) to create your own widgets:

```bash
bunx @glasshome/widget-cli create my-widget
```

## Documentation

Full docs at [glasshome.app/docs](https://glasshome.app/docs)

## License

MIT
