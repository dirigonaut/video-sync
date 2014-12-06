# Debug flag
isDebug = true

# Load native UI library
gui = require('nw.gui')
path = require('path')

# Get window object (!= $(window))
win = gui.Window.get()

# Set the app title (for Windows mostly)
win.title = gui.App.manifest.name + ' ' + gui.App.manifest.version

# Focus the window when the app opens
win.focus()

# Show the window when the app opens
win.show()

# Cancel all new windows (Middle clicks / New Tab)
win.on "new-win-policy", (frame, url, policy) ->
  policy.ignore()
