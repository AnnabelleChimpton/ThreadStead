import React from 'react'
import DecorationSVG from './DecorationSVG'
import { PixelIcon, type PixelIconName } from '../ui/PixelIcon'
import { isFlipped, type DecorationItem } from '@/lib/pixel-homes/decoration-data'
import { NOTE_MAX, decorationNote } from '@/lib/pixel-homes/decoration-note'

interface DecorationInspectorProps {
  item: DecorationItem
  name: string
  /** Where it is, in words ("Row 16, column 5"). */
  where: string
  /** "⌘" on a Mac, "Ctrl+" elsewhere. */
  modKeyLabel: string
  canSendBack: boolean
  canBringForward: boolean
  onFlip: () => void
  onSendBack: () => void
  onBringForward: () => void
  onDuplicate: () => void
  onDelete: () => void
  /** Sign text, for decorations that carry some. */
  onTextChange?: (text: string) => void
  /** The owner's note, shown to visitors who click it (not for the mailbox). */
  onNoteChange?: (note: string) => void
  /** Back to the palette (deselects). */
  onDone: () => void
}

/** Most characters a sign shows. */
const SIGN_TEXT_MAX = 8

/**
 * The selected decoration's own tools, in place of the palette: flip, send
 * back / bring forward, duplicate, delete, and text for signs. Every action
 * here also has a key: F, [ and ], Cmd+D, Delete.
 */
export default function DecorationInspector({
  item,
  name,
  where,
  modKeyLabel,
  canSendBack,
  canBringForward,
  onFlip,
  onSendBack,
  onBringForward,
  onDuplicate,
  onDelete,
  onTextChange,
  onNoteChange,
  onDone,
}: DecorationInspectorProps) {
  const text = (item.text ?? item.data?.text ?? '') as string
  const note = decorationNote(item) ?? ''

  const action = (label: string, icon: PixelIconName, onClick: () => void, keys: string, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${label} (${keys})`}
      className={`ts-bare flex items-center gap-2 w-full rounded px-3 py-2 text-left text-sm text-thread-charcoal border border-thread-sage/30 bg-thread-paper ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-thread-cream'}`}
    >
      <PixelIcon name={icon} size={16} />
      <span className="flex-1">{label}</span>
      <kbd className="text-xs text-thread-sage" aria-hidden="true">{keys}</kbd>
    </button>
  )

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-thread-paper p-4" aria-label={`${name}, selected`}>
      <button type="button" onClick={onDone} className="ts-bare ts-text-button ts-touch flex items-center gap-1 self-start text-sm">
        <PixelIcon name="arrow-left" size={14} />
        Back to the palette
      </button>

      <div className="flex items-center gap-3">
        <div
          className="flex h-20 w-20 shrink-0 items-end justify-center rounded border border-thread-sage/30 bg-thread-cream/50 p-2"
          style={{ imageRendering: 'pixelated' }}
        >
          <div style={{ transform: `scale(2)${isFlipped(item) ? ' scaleX(-1)' : ''}`, transformOrigin: 'bottom center' }}>
            <DecorationSVG
              decorationType={item.type}
              decorationId={item.decorationId || item.id}
              variant={item.variant}
              size={item.size}
              className="block max-w-none"
              renderSvg={item.renderSvg}
              text={text}
              customAssetUrl={item.customAssetUrl}
              pngUrl={item.pngUrl}
              pngWidth={item.pngWidth}
              pngHeight={item.pngHeight}
              pngFrames={item.pngFrames}
            />
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate font-headline font-bold text-thread-pine">{name}</p>
          <p className="text-xs text-thread-sage">{where}</p>
        </div>
      </div>

      {onTextChange && (
        <label className="flex flex-col gap-1 text-sm text-thread-charcoal">
          Sign text
          <input
            type="text"
            value={text}
            maxLength={SIGN_TEXT_MAX}
            onChange={(e) => onTextChange(e.target.value.slice(0, SIGN_TEXT_MAX))}
            className="rounded border border-thread-sage/50 bg-white px-3 py-2 text-sm"
          />
          <span className="text-xs text-thread-sage">{text.length}/{SIGN_TEXT_MAX}</span>
        </label>
      )}

      {onNoteChange && (
        <label className="flex flex-col gap-1 text-sm text-thread-charcoal">
          Note
          <textarea
            value={note}
            rows={4}
            maxLength={NOTE_MAX}
            onChange={(e) => onNoteChange(Array.from(e.target.value).slice(0, NOTE_MAX).join(''))}
            className="rounded border border-thread-sage/50 bg-white px-3 py-2 text-sm resize-y"
          />
          <span className="text-xs text-thread-sage">
            Visitors can click this to read it. {Array.from(note).length}/{NOTE_MAX}
          </span>
        </label>
      )}

      <div className="flex flex-col gap-2">
        {action('Flip', 'repeat', onFlip, 'F')}
        {action('Send back', 'arrow-down', onSendBack, '[', !canSendBack)}
        {action('Bring forward', 'arrow-up', onBringForward, ']', !canBringForward)}
        {action('Duplicate', 'copy', onDuplicate, `${modKeyLabel}D`)}
        {action('Delete', 'trash', onDelete, 'Del')}
      </div>
    </div>
  )
}
