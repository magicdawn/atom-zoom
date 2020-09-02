'use babel'

import AtomZoomView from './atom-zoom-view'
import {CompositeDisposable} from 'atom'
import {webFrame} from 'electron'
import CSON from 'season'

let atomScaleFactor

// https://juejin.im/post/6844903680362151950
function add(num1, num2) {
  const num1Digits = (num1.toString().split('.')[1] || '').length
  const num2Digits = (num2.toString().split('.')[1] || '').length
  const baseNum = Math.pow(10, Math.max(num1Digits, num2Digits))
  return (num1 * baseNum + num2 * baseNum) / baseNum
}

const noti = {
  clearNotifications() {
    atom.notifications.clear()
  },

  error(message) {
    atom.notifications.addError(`**Atom Zoom**<br>${message}`)
  },

  success(message) {
    atom.notifications.addSuccess(`**Atom Zoom**<br>${message}`)
  },

  info(message) {
    atom.notifications.addInfo(`**Atom Zoom**<br>${message}`)
  },
}

export default {
  atomZoomView: null,
  modalPanel: null,
  subscriptions: null,

  ...noti,

  activate(state) {
    this.atomZoomView = new AtomZoomView(state.atomZoomViewState)
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomZoomView.getElement(),
      visible: false,
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'atom-zoom:reset': () => this.reset(),
        'atom-zoom:reload': () => this.reload(),
        'atom-zoom:zoomIn': () => this.zoomIn(),
        'atom-zoom:zoomOut': () => this.zoomOut(),
      })
    )

    this.checkDep()

    this.onWindowFocus = () => {
      this.reload({silentWhenNotChanged: true})
    }
    window.addEventListener('focus', this.onWindowFocus, false)
  },

  deactivate() {
    this.subscriptions.dispose()
    this.modalPanel.destroy()
    this.atomZoomView.destroy()
    window.removeEventListener('focus', this.onWindowFocus)
  },

  serialize() {
    return {
      atomZoomViewState: this.atomZoomView.serialize(),
    }
  },

  zoomIn() {
    this.reloadConfig()
    this.clearNotifications()
    const zoom = add(atomScaleFactor.settings.latest, 0.1)
    atomScaleFactor.setZoomFactor(zoom)
  },

  zoomOut() {
    this.reloadConfig()
    this.clearNotifications()
    const zoom = add(atomScaleFactor.settings.latest, -0.1)
    atomScaleFactor.setZoomFactor(zoom)
  },

  reset() {
    if (!this.checkDep()) return
    this.clearNotifications()
    atomScaleFactor.reset()
  },

  reload({silentWhenNotChanged = false} = {}) {
    if (!this.checkDep()) return

    const oldVal = atomScaleFactor.settings.latest
    this.reloadConfig()
    const newVal = atomScaleFactor.settings.latest

    if (oldVal !== newVal) {
      atomScaleFactor.setZoomFactor(newVal)
      this.clearNotifications()
      this.success(`reload: will set zoom to ${newVal}`)
    } else {
      if (!silentWhenNotChanged) {
        this.clearNotifications()
        this.success('reload: nothing change')
      }
    }
  },

  reloadConfig() {
    if (!this.checkDep()) return
    const $this = atomScaleFactor
    if (CSON.resolve($this.getPath())) {
      try {
        $this.settings = CSON.readFileSync($this.getPath())
      } catch (e) {
        // eslint-disable-line no-empty
      }
    }
  },

  checkDep() {
    if (!atomScaleFactor) {
      try {
        atomScaleFactor = require(atom.packages.resolvePackagePath('atom-scale-factor'))
      } catch (e) {
        this.error('can not find atom-scale-factor')
      }
    }

    return Boolean(atomScaleFactor)
  },
}
