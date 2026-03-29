'use client'

/**
 * A reusable confirmation modal with dark theme and Poppins font.
 *
 * @param {object}   props
 * @param {boolean}  props.open         - Whether the modal is visible
 * @param {string}   props.message      - The confirmation question to display
 * @param {string}   [props.confirmLabel='Delete'] - Label for the confirm button
 * @param {string}   [props.cancelLabel='Cancel']  - Label for the cancel button
 * @param {boolean}  [props.danger=true]            - Red confirm button when true
 * @param {boolean}  [props.loading=false]          - Show spinner on confirm button
 * @param {function} props.onConfirm    - Called when the confirm button is tapped
 * @param {function} props.onCancel     - Called when the cancel button or backdrop is tapped
 */
export default function ConfirmModal({
  open,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-sm flex flex-col gap-5 pointer-events-auto shadow-2xl">
          <p className="text-sm font-medium text-zinc-200 leading-relaxed text-center">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
                danger
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {loading && (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
