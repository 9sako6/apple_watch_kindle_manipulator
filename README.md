# Apple Watch Kindle Manipulator

[日本語](README.ja.md)

Turn pages in Kindle on your iPhone or iPad from your Apple Watch.

This userscript lets you go forward and back while reading in bed without reaching for the screen. It does not require the Apple Developer Program.

## Requirements

- An iPhone or iPad
- An Apple Watch
- The free [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) Safari extension

## Install

1. Install Userscripts on your iPhone or iPad and open it once.
2. Open Settings > Apps > Safari > Extensions > Userscripts, then enable it.
3. Allow Userscripts to access the Kindle site you use:
   - `read.amazon.co.jp`
   - `read.amazon.com`
   - `read.amazon.co.uk`
4. Open the [install page](https://9sako6.github.io/apple_watch_kindle_manipulator/) in Safari and tap `Open in Userscripts`.

## Use

1. Open a book in Kindle for Web in Safari.
2. Confirm that `Next` and `Previous` work in the panel at the bottom right.
3. Tap `Enable remote controls`.
4. Open Now Playing on your Apple Watch and use the next and previous controls.

If pages move in the wrong direction, set `Page direction` to `Next right` or `Next left`.

## Troubleshooting

- If it stops working, reload Kindle and enable the remote controls again.
- If the controls do not appear on your Apple Watch, try next and previous in Control Center on your iPhone or iPad first.
- Behavior can vary by device, OS version, and playback state.

This script does not store or send Kindle content or account information.

## License

[MIT License](LICENSE)
