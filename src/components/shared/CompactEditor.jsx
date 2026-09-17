import './compact-editor.css'

export function EditorTabs({ sections, active, onChange }) {
  return (
    <div className="compact-editor-tabs" role="tablist" aria-label="Edit sections">
      {sections.map(section => (
        <button
          key={section.id}
          type="button"
          role="tab"
          aria-selected={active === section.id}
          onClick={() => onChange(section.id)}
          className={active === section.id ? 'compact-editor-tab is-active' : 'compact-editor-tab'}
        >
          {section.label}
        </button>
      ))}
    </div>
  )
}

export function EditorActions({ onDelete, onCancel, onSave, saveDisabled, deleteLabel = 'Delete' }) {
  return (
    <div className="compact-editor-actions">
      <button
        type="button"
        onClick={onDelete}
        className="compact-editor-delete"
        aria-label={deleteLabel}
      >
        Delete
      </button>
      <button type="button" onClick={onCancel} className="compact-editor-cancel">
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={saveDisabled} className="compact-editor-save">
        Save
      </button>
    </div>
  )
}
