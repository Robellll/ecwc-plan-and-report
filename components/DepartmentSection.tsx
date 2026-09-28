"use client";

import { PlusIcon, TrashIcon } from "./Icons";

export interface DeptUpdate {
  department: string;
  notes: string;
}

const DEPARTMENTS = ["Design", "Plant & Equipment"];

interface DepartmentSectionProps {
  rows: DeptUpdate[];
  onChange: (rows: DeptUpdate[]) => void;
}

export default function DepartmentSection({ rows, onChange }: DepartmentSectionProps) {
  const addRow = () => {
    onChange([...rows, { department: DEPARTMENTS[0], notes: "" }]);
  };

  const updateRow = (index: number, field: keyof DeptUpdate, value: string) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange(updated);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="dept-rows">
        {rows.map((row, index) => (
          <div className="dept-row" key={index}>
            <div className="field">
              <label htmlFor={`dept-select-${index}`}>Department</label>
              <select
                id={`dept-select-${index}`}
                value={row.department}
                onChange={(e) => updateRow(index, "department", e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`dept-notes-${index}`}>Notes</label>
              <textarea
                id={`dept-notes-${index}`}
                placeholder="Enter department update notes…"
                value={row.notes}
                onChange={(e) => updateRow(index, "notes", e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ paddingTop: 26 }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeRow(index)}
                aria-label="Remove department row"
                title="Remove row"
              >
                <TrashIcon size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: rows.length > 0 ? 16 : 0 }}>
        <button type="button" className="btn btn-ghost" onClick={addRow} id="add-dept-btn">
          <PlusIcon size={15} /> Add Department Update
        </button>
      </div>
    </div>
  );
}
