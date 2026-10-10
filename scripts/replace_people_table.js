const fs = require('fs');
let content = fs.readFileSync('src/components/people/PeopleDashboard.tsx', 'utf8');

// Replace top level imports
if (!content.includes('import { Search')) {
  content = content.replace('import { StatusMessage } from "@/components/StatusMessage";', 'import { StatusMessage } from "@/components/StatusMessage";\nimport { Search, Filter, LayoutGrid, Plus, Mail, Edit, Trash } from "lucide-react";\nimport "@/app/people/people.css";');
}

// Add email and phone to types
content = content.replace('person: {\r\n    id: string;\r\n    firstName: string;\r\n    lastName: string | null;\r\n    displayName: string;\r\n  };', 'person: {\r\n    id: string;\r\n    firstName: string;\r\n    lastName: string | null;\r\n    displayName: string;\r\n    phone?: string | null;\r\n    email?: string | null;\r\n  };');
content = content.replace('person: {\n    id: string;\n    firstName: string;\n    lastName: string | null;\n    displayName: string;\n  };', 'person: {\n    id: string;\n    firstName: string;\n    lastName: string | null;\n    displayName: string;\n    phone?: string | null;\n    email?: string | null;\n  };');

const tableNew = `<div className="people-toolbar">
        <div className="people-toolbar-left">
          <Search size={18} className="people-search-icon" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="people-search-input"
          />
        </div>
        <div className="people-toolbar-right">
          <button type="button" className="people-btn-outline">
            <Filter size={16} /> Filter
          </button>
          <button type="button" className="people-btn-outline">
            <LayoutGrid size={16} /> Group By
          </button>
          {!showForm && (
            <button 
              type="button" 
              className="kalki-button kalki-button--primary kalki-button--sm" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem' }} 
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {employees.items.length === 0 ? (
        <StatusMessage tone="empty">No employees are visible in this location scope.</StatusMessage>
      ) : filteredEmployees.length === 0 ? (
        <StatusMessage tone="empty">No employees match your search criteria.</StatusMessage>
      ) : (
        <div className="people-table-container">
          <table className="people-table">
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '1.5rem' }}>
                  <input type="checkbox" className="people-checkbox" />
                </th>
                <th>Employee</th>
                <th>Contact</th>
                <th>Job Position</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="checkbox-col" style={{ paddingLeft: '1.5rem' }}>
                    <input type="checkbox" className="people-checkbox" />
                  </td>
                  <td className="employee-col" data-label="Employee">
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {emp.person.displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="employee-details">
                        <div className="employee-name">{emp.person.displayName}</div>
                        <div className="employee-code">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="contact-col" data-label="Contact">
                    <div className="contact-cell">
                      <div className="contact-email">{emp.person.email || 'No email provided'}</div>
                      <div className="contact-phone">{emp.person.phone || 'No phone provided'}</div>
                    </div>
                  </td>
                  <td data-label="Job Position">
                    <div className="job-cell">
                      <div className="job-title">{emp.jobTitle || 'None'}</div>
                      <div className="job-department">{emp.category || 'N/A'}</div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className={\`status-indicator status-\${emp.status.toLowerCase().replace('_', '-')}\`}>
                      <span className="status-dot"></span>
                      {emp.status === 'NOTICE_PERIOD' ? 'Notice Period' : 
                       emp.status.charAt(0).toUpperCase() + emp.status.slice(1).toLowerCase()}
                    </div>
                  </td>
                  <td className="actions-col" data-label="Actions" style={{ paddingRight: '1.5rem' }}>
                    <div className="actions-cell">
                      <button className="action-btn" title="Email"><Mail size={16} /></button>
                      <Link href={\`/people/\${emp.id}?organizationId=\${selected.organizationId}&locationId=\${selected.locationId}\`}>
                        <button className="action-btn" title="Edit"><Edit size={16} /></button>
                      </Link>
                      <button className="action-btn danger" title="Delete"><Trash size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}`;

const regex = /<div className="panel" style={{ padding: "1rem", marginBottom: "1rem" }}>[\s\S]*?<\/div>\s*\)}/m;
content = content.replace(regex, tableNew);

if (content.includes('className="people-table"')) {
  fs.writeFileSync('src/components/people/PeopleDashboard.tsx', content);
  console.log('Success');
} else {
  console.log('Regex failed');
}
