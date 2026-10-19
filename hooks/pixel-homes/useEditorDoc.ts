import { useMemo, useReducer } from 'react'
import {
  canRedo,
  canUndo,
  createEditorState,
  docKey,
  editorReducer,
  type EditorDoc,
} from '../../lib/pixel-homes/editor-doc'

/**
 * The pixel-home editor's document with full undo/redo and an unsaved flag
 * (lib/pixel-homes/editor-doc.ts). `initialDoc` is read once, on mount.
 */
export function useEditorDoc(initialDoc: EditorDoc) {
  const [state, dispatch] = useReducer(editorReducer, initialDoc, createEditorState)
  const presentKey = useMemo(() => docKey(state.present), [state.present])
  const savedKey = useMemo(() => docKey(state.saved), [state.saved])

  return {
    doc: state.present,
    dispatch,
    canUndo: canUndo(state),
    canRedo: canRedo(state),
    isDirty: presentKey !== savedKey,
    /** Changes whenever what a save would store changes. */
    presentKey,
  }
}
