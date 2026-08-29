import type { FieldMapping, FillResult } from '../shared/types';
import { FormFiller } from './FormFiller';

export class PreviewOverlay {
  private container: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private filler: FormFiller;

  constructor(filler: FormFiller) {
    this.filler = filler;
  }

  show(mappings: FieldMapping[]): void {
    if (this.container) {
      this.destroy();
    }

    this.container = document.createElement('div');
    this.container.id = 'sfa-preview-overlay-root';
    
    // Position fixed, highest z-index
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    this.shadow = this.container.attachShadow({ mode: 'closed' });
    
    this.shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }
        .panel {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 16px;
          width: 300px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          color: #F3F4F6;
          font-family: inherit;
        }
        h2 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .mapping-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 16px;
        }
        .mapping-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #374151;
          font-size: 14px;
        }
        .mapping-item:last-child {
          border-bottom: none;
        }
        .mapping-item input[type="checkbox"] {
          margin-right: 12px;
          accent-color: #3B82F6;
          cursor: pointer;
        }
        .field-label {
          color: #9CA3AF;
          font-weight: 500;
          flex-shrink: 0;
          width: 90px;
        }
        .field-value {
          color: #F3F4F6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        button {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }
        .btn-cancel {
          background: transparent;
          color: #9CA3AF;
        }
        .btn-cancel:hover {
          color: #F3F4F6;
          background: #374151;
        }
        .btn-fill {
          background: #3B82F6;
          color: white;
        }
        .btn-fill:hover {
          background: #2563EB;
        }
      </style>
      <div class="panel">
        <h2>Smart Auto-Filler Preview</h2>
        <div class="mapping-list" id="mapping-list"></div>
        <div class="actions">
          <button class="btn-cancel" id="btn-cancel">Cancel</button>
          <button class="btn-fill" id="btn-fill">Fill Now</button>
        </div>
      </div>
    `;

    const list = this.shadow.getElementById('mapping-list')!;
    mappings.forEach((m, index) => {
      const item = document.createElement('div');
      item.className = 'mapping-item';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.index = index.toString();
      
      const label = document.createElement('span');
      label.className = 'field-label';
      label.textContent = this.formatType(m.matchedType);
      
      const val = document.createElement('span');
      val.className = 'field-value';
      val.textContent = m.profileValue;
      
      item.appendChild(cb);
      item.appendChild(label);
      item.appendChild(val);
      list.appendChild(item);
    });

    this.shadow.getElementById('btn-cancel')!.addEventListener('click', () => {
      this.destroy();
    });

    this.shadow.getElementById('btn-fill')!.addEventListener('click', () => {
      const checkboxes = list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      const selectedMappings: FieldMapping[] = [];
      checkboxes.forEach(cb => {
        if (cb.checked) {
          const idx = parseInt(cb.dataset.index!, 10);
          selectedMappings.push(mappings[idx]);
        }
      });
      
      this.filler.fill(selectedMappings);
      this.destroy();
    });

    document.documentElement.appendChild(this.container);
  }

  private destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
  }

  private formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
