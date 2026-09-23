#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const files = require('../MenuFiles.js')
const menu = require('../MenuModel.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`ok - ${message}`)
}

const fileActions = files.actionDefinitions('file', false, true)
assert(fileActions.map(action => action.id).join(',') === 'open,show-files,start-agent,toggle-star,copy-path,copy-file',
  'file actions keep their activation identities and copy-file operation')
assert(files.actionDefinitions('directory', true, true).find(action => action.id === 'toggle-star').label === 'Unstar',
  'directory actions expose the current unstar activation')

const actionItem = action => menu.normalizeItem(`file.action.${action.id}`, {
  label: action.label,
  description: '',
  action: action.id
})
const pathQuery = menu.prepareSearchQuery('projects')
assert(!fileActions.some(action => menu.matchesQuery(actionItem(action), pathQuery, true)),
  'action search does not match the selected file path')
const copyQuery = menu.prepareSearchQuery('copy path')
assert(fileActions.filter(action => menu.matchesQuery(actionItem(action), copyQuery, true)).map(action => action.id).join(',') === 'copy-path',
  'action search matches action labels and keeps the correct activation ID')

const saved = { index: 7, itemId: 'file.item.6', path: '/home/test/projects/report.txt', type: 'file', filter: 'report' }
const restored = files.restoredBrowserState(saved)
assert(restored.filter === 'report' && restored.index === 7 && restored.itemId === 'file.item.6'
  && restored.path === saved.path && restored.type === 'file',
  'Star and Unstar restore the saved Files search and selected row')

const withoutAgent = files.actionDefinitions('directory', false, false)
assert(!withoutAgent.some(action => action.id === 'start-agent')
  && withoutAgent.some(action => action.id === 'open-files')
  && withoutAgent.some(action => action.id === 'copy-path'),
  'missing optional agent tools remove only Start Agent Here')

const qml = fs.readFileSync(path.join(__dirname, '..', 'Menu.qml'), 'utf8')
assert(qml.includes('root.closeActionPanel()')
  && qml.includes('root.pendingStarSelectionId = restored.itemId')
  && qml.includes('description: ""'),
  'QML uses the tested restoration and label-only action search paths')
assert(qml.includes("shutil.which('omarchy-agent')")
  && qml.includes("shutil.which('omarchy-default-agent')")
  && qml.includes('root.agentToolsAvailable = exitCode === 0'),
  'QML checks both optional agent tools without changing Files availability')

const starredRowHints = menu.actionBarHints({ hasSelection: true, canStar: true, starred: true, canContextActions: true })
assert(starredRowHints.some(hint => hint.id === 'actions' && hint.label === 'Actions'),
  'starred rows on the starting view expose the Actions footer hint')
assert(qml.includes('|| root.canOpenFavoriteActions')
  && qml.includes('else if (root.canOpenFavoriteActions) root.openFavoriteActionPanel()')
  && /selectedRootFileFavorite:[^]*?activeMenu === "root"[^]*?MenuModel\.fileFavorite\(/.test(qml),
  'Ctrl+K opens the Files action panel for starred files and directories on the starting view')
assert(/function closeActionPanel\(\) \{[^]*?if \(!root\.fileBrowserActive\) \{[^]*?root\.setFilter\(restored\.filter\)/.test(qml)
  && qml.includes('} else if (root.actionPanelActive) root.closeActionPanel()'),
  'closing a starting-view action panel returns to the starting view with its search restored')
assert(/if \(fromFavorites\) \{[^]*?root\.unstarFileFavorite\(\{ path: restored\.path, type: restored\.type, capability: starCapability \}\)/.test(qml),
  'Unstar from a starting-view action panel removes the favorite without the file browser')
assert(qml.includes('.concat(root.additionalFileSearchRoots(path))')
  && /function additionalFileSearchRoots\(path\) \{[^]*?extension\.config\.searchRoots/.test(qml),
  'Files searches from the starting directory include configured searchRoots')
